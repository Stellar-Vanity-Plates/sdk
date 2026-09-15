import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import {
  KNOWN_CONTRACT_ERROR_SIMULATION_FAILED,
  LedgerEntries,
  NetworkConfig,
  StrKey,
} from "@colibri/core";
import {
  createPlateModel,
  NFT_CONTRACT_DEFAULTS,
  renderPlateHtml,
  renderPlateSvg,
  resolvePlateInput,
} from "@/rendering/index.ts";
import { NftClient } from "@/contracts/index.ts";
import { loadAccountConfiguration } from "@/accounts/index.ts";
import {
  ConflictingNetworkSourceError,
  InvalidRpcUrlError,
  MissingNftCollectionError,
  RpcNetworkDiscoveryError,
} from "@/errors.ts";
import { rpcFixture } from "@tests/fixtures/account-rpc.ts";
const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const contract = StrKey.encodeContract(new Uint8Array(32));
const testnet = NetworkConfig.TestNet();
const rpcUrl = "https://rpc.example.test";

Deno.test("display inputs use counts or abbreviation for both address kinds, without network access", async () => {
  const fetch = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("Unexpected network request");
  };
  try {
    for (const address of [account, contract]) {
      for (const suffixLength of [undefined, 0, 56, NaN, -1, 1.5, 1, 6, 55]) {
        const input = { address, suffixLength };
        const model = createPlateModel(await resolvePlateInput(input));
        const configured = suffixLength === 1 || suffixLength === 6 ||
          suffixLength === 55;
        assertEquals(model.configured, configured);
        assertEquals(
          model.label,
          configured
            ? address.slice(-suffixLength!)
            : `${address.slice(0, 6)}…${address.slice(-6)}`,
        );
        assertEquals(
          (await renderPlateHtml(input)).includes(model.label),
          true,
        );
        assertEquals((await renderPlateSvg(input)).includes(model.label), true);
      }
    }
  } finally {
    globalThis.fetch = fetch;
  }
});

Deno.test("RPC/account lookup decodes the standard metadata, has priority over local counts, and preserves failures", async () => {
  const getMany = LedgerEntries.prototype.getMany;
  const fetch = globalThis.fetch;
  const discovery: string[] = [];
  let data: Uint8Array | undefined = new TextEncoder().encode("7");
  let hasAccount = true;
  LedgerEntries.prototype.getMany = function (keys) {
    return getMany.call(
      new LedgerEntries({ rpc: rpcFixture(data, hasAccount) }),
      keys,
    );
  } as typeof getMany;
  globalThis.fetch = (_url, options) => {
    discovery.push(JSON.parse(String(options?.body)).method);
    return Promise.resolve(
      Response.json({
        jsonrpc: "2.0",
        id: 1,
        result: { passphrase: testnet.networkPassphrase },
      }),
    );
  };
  try {
    assertEquals(
      (await resolvePlateInput({ address: account, rpcUrl, suffixLength: 2 }))
        .suffixLength,
      7,
    );
    assertEquals(discovery, ["getNetwork"]);
    assertEquals(
      (await loadAccountConfiguration(account, { rpcUrl })).suffixLength,
      7,
    );
    const before = discovery.length;
    assertEquals(
      (await resolvePlateInput({
        address: account,
        networkConfig: testnet,
        suffixLength: 2,
      })).suffixLength,
      7,
    );
    assertEquals(discovery.length, before);
    for (
      const value of [
        undefined,
        new TextEncoder().encode("03"),
        new Uint8Array([255]),
      ]
    ) {
      data = value;
      assertEquals(
        (await resolvePlateInput({
          address: account,
          networkConfig: testnet,
          suffixLength: 2,
        })).suffixLength,
        undefined,
      );
    }
    hasAccount = false;
    assertEquals(
      (await resolvePlateInput({ address: account, networkConfig: testnet }))
        .suffixLength,
      undefined,
    );
    const failure = new Error("RPC unavailable");
    LedgerEntries.prototype.getMany = () => Promise.reject(failure);
    const error = await assertRejects(() =>
      resolvePlateInput({ address: account, networkConfig: testnet })
    );
    assertStrictEquals(error, failure);
  } finally {
    LedgerEntries.prototype.getMany = getMany;
    globalThis.fetch = fetch;
  }
});

Deno.test("contract display uses retained claims, network defaults and explicit overrides", async () => {
  const read = NftClient.prototype.read;
  const calls: unknown[] = [];
  let suffix = contract.slice(-5);
  let claimAddress: string = contract;
  NftClient.prototype.read = function (this: NftClient, method, args) {
    calls.push([this.contract.getContractId(), method, args]);
    return Promise.resolve(
      method === "get_latest_token_id"
        ? 42
        : { contract_address: claimAddress, suffix, salt: new Uint8Array(32) },
    );
  } as typeof read;
  try {
    const input = {
      address: contract,
      networkConfig: testnet,
      suffixLength: 2,
    };
    assertEquals((await resolvePlateInput(input)).suffixLength, 5);
    const collection = NFT_CONTRACT_DEFAULTS[testnet.networkPassphrase];
    assertEquals(calls, [[collection, "get_latest_token_id", {
      contract_address: contract,
    }], [collection, "get_claim", { token_id: 42 }]]);
    calls.length = 0;
    assertEquals(
      (await resolvePlateInput({
        ...input,
        networkConfig: NetworkConfig.MainNet(),
        nftContractId: contract,
      })).suffixLength,
      5,
    );
    assertEquals((calls[0] as unknown[])[0], contract);
    suffix = "ZZZZ";
    assertEquals((await resolvePlateInput(input)).suffixLength, undefined);
    suffix = contract.slice(-5);
    claimAddress = account;
    assertEquals((await resolvePlateInput(input)).suffixLength, undefined);
  } finally {
    NftClient.prototype.read = read;
  }
});

Deno.test("only missing claims from the selected collection become fallback; other failures retain identity", async () => {
  const read = NftClient.prototype.read;
  const collection = NFT_CONTRACT_DEFAULTS[testnet.networkPassphrase]!;
  const input = { address: contract, networkConfig: testnet };
  try {
    for (const code of [2007, 2008, 2009]) {
      for (const contractId of [collection, contract]) {
        for (const issuedFrom of ["root-invocation", "sub-invocation"]) {
          const failure = Object.assign(
            Object.create(KNOWN_CONTRACT_ERROR_SIMULATION_FAILED.prototype),
            {
              meta: { data: { match: { code, contractId, issuedFrom } } },
            },
          );
          NftClient.prototype.read = () => Promise.reject(failure);
          if (
            [2007, 2008].includes(code) && contractId === collection &&
            issuedFrom === "root-invocation"
          ) {
            assertEquals(
              (await resolvePlateInput(input)).suffixLength,
              undefined,
            );
          } else {
            try {
              await resolvePlateInput(input);
              throw new Error("Expected rejection");
            } catch (error) {
              assertStrictEquals(error, failure);
            }
          }
        }
      }
    }
  } finally {
    NftClient.prototype.read = read;
  }
});

Deno.test("network configuration errors are distinct; Mainnet remains an explicit placeholder", async () => {
  assertEquals(
    NFT_CONTRACT_DEFAULTS[NetworkConfig.MainNet().networkPassphrase],
    undefined,
  );
  assertInstanceOf(
    await assertRejects(() =>
      resolvePlateInput({
        address: contract,
        networkConfig: NetworkConfig.MainNet(),
      })
    ),
    MissingNftCollectionError,
  );
  assertInstanceOf(
    await assertRejects(() =>
      resolvePlateInput({ address: account, networkConfig: testnet, rpcUrl })
    ),
    ConflictingNetworkSourceError,
  );
  assertInstanceOf(
    await assertRejects(() =>
      resolvePlateInput({ address: account, rpcUrl: "file:///private/tmp/rpc" })
    ),
    InvalidRpcUrlError,
  );
  const fetch = globalThis.fetch;
  try {
    for (
      const body of [{}, { jsonrpc: "2.0", id: 1, error: { code: -1 } }, {
        jsonrpc: "2.0",
        id: 1,
        result: { passphrase: "" },
      }]
    ) {
      globalThis.fetch = () => Promise.resolve(Response.json(body));
      assertInstanceOf(
        await assertRejects(() =>
          resolvePlateInput({ address: account, rpcUrl })
        ),
        RpcNetworkDiscoveryError,
      );
    }
    const failure = new Error("disconnected");
    globalThis.fetch = () => Promise.reject(failure);
    const error = await assertRejects(() =>
      resolvePlateInput({ address: account, rpcUrl })
    );
    assertInstanceOf(error, RpcNetworkDiscoveryError);
    assertStrictEquals(error.cause, failure);
  } finally {
    globalThis.fetch = fetch;
  }
});
