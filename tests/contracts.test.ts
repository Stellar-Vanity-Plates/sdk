import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { NetworkConfig, type TransactionConfig } from "@colibri/core";
import { Spec } from "@stellar/stellar-sdk/contract";
import { xdr } from "@stellar/stellar-sdk";
import {
  assertCompatibleSpec,
  createProtocolClients,
  NftClient,
} from "@/contracts/mod.ts";
import config from "@examples/testnet.json" with { type: "json" };
import nft from "@/contracts/specs/nft.json" with { type: "json" };
const network = NetworkConfig.TestNet();
Deno.test("contract ABI checks reject missing methods and changed signatures", () => {
  const spec = new Spec(nft.entries);
  assertCompatibleSpec(spec, spec);
  const changed = spec.entries.filter((e) =>
    e.type !== "scSpecEntryFunctionV0" ||
    e.functionV0?.name.toString() !== "owner_of"
  );
  assertThrows(() => assertCompatibleSpec(spec, new Spec(changed)));
  assertThrows(() =>
    new NftClient({ networkConfig: network, contractId: "invalid" })
  );
});
Deno.test("clients encode real ABI values and enforce an explicit Colibri invocation boundary", async () => {
  const clients = createProtocolClients(network, config.contracts);
  assertEquals(Object.keys(clients).length, 5);
  const client = clients.nft;
  const args = client.contract.getSpec().funcArgsToScVals("owner_of", {
    token_id: 42,
  });
  assertEquals(args[0].toXdr("base64"), xdr.ScVal.scvU32(42).toXdr("base64"));
  let initialized = 0, reads = 0, writes = 0;
  client.contract.loadSpecFromNetwork = () => {
    initialized++;
    return Promise.resolve();
  };
  client.contract.read = ({ method, methodArgs }) => {
    reads++;
    assertEquals(method, "owner_of");
    assertEquals(methodArgs, { token_id: 42 });
    return Promise.resolve(config.contracts.deployer);
  };
  const tx: TransactionConfig = {
    source: "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    fee: { max: "1000000" },
    timeout: 60,
    signers: [],
  };
  client.contract.invoke = ({ method, methodArgs, config: actual }) => {
    writes++;
    assertEquals(method, "transfer");
    assertEquals(actual, tx);
    assertEquals(methodArgs, {
      from: config.contracts.deployer,
      to: config.contracts.marketplace,
      token_id: 42,
    });
    return Promise.reject(new Error("submission deliberately intercepted"));
  };
  assertEquals(
    await client.read("owner_of", { token_id: 42 }),
    config.contracts.deployer,
  );
  assertEquals(writes, 0);
  await assertRejects(
    () =>
      client.invoke("transfer", {
        from: config.contracts.deployer,
        to: config.contracts.marketplace,
        token_id: 42,
      }, { config: tx }),
    Error,
    "deliberately intercepted",
  );
  assertEquals(initialized, 1);
  assertEquals(reads, 1);
  assertEquals(writes, 1);
  assert(clients.treasury.contract.getSpec().funcs().length > 30);
});
