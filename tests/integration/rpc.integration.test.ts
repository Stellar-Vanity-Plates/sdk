import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { NetworkConfig, StrKey } from "@colibri/core";
import {
  Address,
  SorobanDataBuilder,
  type Transaction,
  TransactionBuilder,
  xdr,
} from "@stellar/stellar-sdk";
import { loadAccountConfiguration } from "@/accounts/index.ts";
import { Nft, NftSpec } from "@/contracts/index.ts";
import { renderPlateHtml, renderPlateSvg } from "@/rendering/index.ts";
import { rpcFixture } from "@tests/fixtures/account-rpc.ts";
const account = StrKey.encodeEd25519PublicKey(
  new Uint8Array(32),
) as `G${string}`;
const contract = StrKey.encodeContract(new Uint8Array(32));
const passphrase = NetworkConfig.TestNet().networkPassphrase;

/** Actual loopback HTTP transport; deterministic ledger/simulation responses, no public chain. */
function rpcServer(
  handler: (
    body: { method: string; params: Record<string, unknown> },
  ) => Promise<unknown> | unknown,
) {
  const server = Deno.serve(
    { hostname: "127.0.0.1", port: 0, onListen() {} },
    async (request) => {
      const body = await request.json();
      const result = await handler(body);
      if (result instanceof Response) return result;
      return Response.json({ jsonrpc: "2.0", id: body.id, result });
    },
  );
  return {
    url: `http://127.0.0.1:${server.addr.port}`,
    async [Symbol.asyncDispose]() {
      await server.shutdown();
    },
  };
}

describe("RPC transport integration", () => {
  it("discovers the passphrase, decodes ledger XDR and feeds consistent HTML/SVG display", async () => {
    const calls: string[] = [];
    let metadata: Uint8Array | undefined = new TextEncoder().encode("7");
    let hasAccount = true, unavailable = false;
    await using server = rpcServer(async ({ method, params }) => {
      calls.push(method);
      if (unavailable) return new Response("RPC unavailable", { status: 503 });
      if (method === "getNetwork") return { passphrase };
      assertEquals(method, "getLedgerEntries");
      const keys = (params.keys as string[]).map((key) =>
        xdr.LedgerKey.fromXDR(key, "base64")
      );
      const result = await rpcFixture(metadata, hasAccount).getLedgerEntries(
        ...keys,
      );
      return {
        latestLedger: result.latestLedger,
        entries: result.entries.map((entry) => ({
          key: entry.key.toXdr("base64"),
          xdr: entry.val.toXdr("base64"),
          lastModifiedLedgerSeq: 100,
        })),
      };
    });
    const online = { address: account, rpcUrl: server.url, suffixLength: 2 };
    assertEquals(
      await loadAccountConfiguration(account, { rpcUrl: server.url }),
      {
        address: account,
        label: account.slice(-7),
        configured: true,
        suffixLength: 7,
        status: "configured",
      },
    );
    assertEquals(
      await renderPlateHtml(online),
      await renderPlateHtml({ address: account, suffixLength: 7 }),
    );
    assertEquals(
      await renderPlateSvg(online),
      await renderPlateSvg({ address: account, suffixLength: 7 }),
    );
    metadata = new TextEncoder().encode("03");
    assertEquals(
      (await loadAccountConfiguration(account, { rpcUrl: server.url })).status,
      "invalid",
    );
    metadata = undefined;
    assertEquals(
      (await loadAccountConfiguration(account, { rpcUrl: server.url })).status,
      "unconfigured",
    );
    hasAccount = false;
    assertEquals(
      (await loadAccountConfiguration(account, { rpcUrl: server.url })).status,
      "account-not-found",
    );
    unavailable = true;
    await assertRejects(() =>
      loadAccountConfiguration(account, {
        networkConfig: NetworkConfig.CustomNet({
          networkPassphrase: passphrase,
          rpcUrl: server.url,
          allowHttp: true,
        }),
      })
    );
    assertEquals(calls.filter((method) => method === "getNetwork").length, 6);
    assertEquals(
      calls.filter((method) => method === "getLedgerEntries").length,
      7,
    );
  });
  it("runs generated NFT reads through the complete Colibri pipeline and serialized simulation RPC", async () => {
    const calls: { method: string; contract: string; args: string[] }[] = [];
    const claim = {
      controller: contract,
      salt: new Uint8Array(32),
      character_count: 5,
    };
    let fail = false;
    await using server = rpcServer(({ method, params }) => {
      assertEquals(method, "simulateTransaction");
      const transaction = TransactionBuilder.fromXDR(
        params.transaction as string,
        passphrase,
      ) as Transaction;
      assertEquals(transaction.signatures.length, 0);
      const envelope = transaction.toEnvelope();
      assert(envelope.type === "envelopeTypeTx");
      const body = envelope.v1.tx.operations[0].body;
      assert(body.type === "invokeHostFunction");
      const host = body.invokeHostFunctionOp.hostFunction;
      assert(host.type === "hostFunctionTypeInvokeContract");
      const op = host.invokeContract;
      const name = op.functionName.toString();
      calls.push({
        method: name,
        contract: Address.fromScAddress(op.contractAddress).toString(),
        args: op.args.map((arg) => arg.toXDR("base64")),
      });
      if (fail) {
        return {
          latestLedger: 123,
          error: "simulation unavailable",
          events: [],
        };
      }
      const result = claim;
      const value = NftSpec.nativeToScVal(
        result,
        NftSpec.getFunc(name).outputs[0],
      );
      return {
        latestLedger: 123,
        minResourceFee: "100",
        transactionData: new SorobanDataBuilder().build().toXDR("base64"),
        events: [],
        results: [{ auth: [], xdr: value.toXDR("base64") }],
      };
    });
    const nft = new Nft({
      networkConfig: NetworkConfig.CustomNet({
        networkPassphrase: passphrase,
        rpcUrl: server.url,
        allowHttp: true,
      }),
      contractConfig: { contractId: contract },
    });
    assertEquals(
      await nft.getPlate.read({ contract_address: contract }),
      claim,
    );
    assertEquals(calls, [{
      method: "get_plate",
      contract,
      args: [new Address(contract).toScVal().toXDR("base64")],
    }]);
    fail = true;
    await assertRejects(() =>
      nft.getPlate.read({ contract_address: contract })
    );
    assertEquals(calls.length, 2);
  });
});
