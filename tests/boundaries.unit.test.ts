import { describe, it } from "@std/testing/bdd";
import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import {
  LocalSigner,
  NetworkConfig,
  SEP41TokenContract,
  StrKey,
} from "@colibri/core";
import { stub } from "@std/testing/mock";
import { decodeHorizonSuffixLength } from "@/accounts/index.ts";
import {
  type ContractFarmResult,
  farmAccount,
  farmContract,
  verifyContractFarmResult,
} from "@/farming/index.ts";
import { isPlateAddress } from "@/validation.ts";
import { resolveNetwork } from "@/network.ts";
import {
  createTreasuryAssetClients,
  type TreasuryConfig,
} from "@/contracts/index.ts";
import { renderPlateHtml } from "@/rendering/html.ts";
import { InvalidRpcUrlError, InvalidSaltLengthError } from "@/errors.ts";
import * as colibri from "@/colibri.ts";
const address = StrKey.encodeContract(new Uint8Array(32));
const network = NetworkConfig.TestNet();

describe("SDK boundary inputs", () => {
  it("rejects non-address runtime values and malformed Horizon base64", () => {
    assertEquals(isPlateAddress(null as unknown as string), false);
    for (const value of [null, 3, "AAAAAAAAAAAA", "%", "Nw"]) {
      assertEquals(decodeHorizonSuffixLength(value), undefined);
    }
  });
  it("rejects malformed URLs before fetching", async () => {
    await assertRejects(
      () => resolveNetwork({ rpcUrl: "bad url" }),
      InvalidRpcUrlError,
    );
  });
  it("ships Colibri primitives and creates all configured treasury asset clients", () => {
    assertEquals(colibri.NetworkConfig, NetworkConfig);
    const assets = createTreasuryAssetClients(
      network,
      {
        share_asset: address,
        fee_asset: address,
        defindex_vault: address,
      } as TreasuryConfig,
    );
    assertInstanceOf(assets.vnty, SEP41TokenContract);
    assertInstanceOf(assets.feeAsset, SEP41TokenContract);
    assertEquals(assets.vault.getContractId(), address);
  });
  it("can omit the shared stylesheet for a host that already installed it", async () => {
    const html = await renderPlateHtml({ address }, { includeStyles: false });
    assert(!html.includes("<style>"));
    assert(html.includes(`${address.slice(0, 6)}…${address.slice(-6)}`));
  });
});

describe("farm completion and cleanup", () => {
  it("yields across unsuccessful batches and reports exact exhausted budgets", async () => {
    const progress: number[] = [];
    const destroyed: boolean[] = [];
    using _random = stub(LocalSigner, "generateRandom", () =>
      ({
        publicKey: () =>
          "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
        destroy: () => destroyed.push(true),
      }) as unknown as LocalSigner);
    assertEquals(
      await farmAccount({
        suffix: "ZZZZZZ",
        maxAttempts: 2,
        batchSize: 1,
        onProgress: (p) => progress.push(p.checked),
      }),
      undefined,
    );
    assertEquals(progress, [1, 2, 2]);
    assertEquals(destroyed, [true, true]);
    progress.length = 0;
    assertEquals(
      await farmContract({
        suffix: "ZZZZZZ",
        deployer: address,
        networkPassphrase: network.networkPassphrase,
        startSalt: new Uint8Array(32),
        maxAttempts: 2,
        batchSize: 1,
        onProgress: (p) => progress.push(p.checked),
      }),
      undefined,
    );
    assertEquals(progress, [1, 2, 2]);
  });
  it("rejects a non-byte salt and returns false for invalid persisted derivation data", async () => {
    await assertRejects(
      () =>
        farmContract({
          suffix: "A",
          deployer: address,
          networkPassphrase: network.networkPassphrase,
          startSalt: [] as unknown as Uint8Array,
        }),
      InvalidSaltLengthError,
    );
    assertEquals(
      verifyContractFarmResult(
        {
          address,
          suffix: address.slice(-1),
          saltHex: "00".repeat(32),
          deployer: "bad",
          networkPassphrase: network.networkPassphrase,
          salt: new Uint8Array(32),
        } as ContractFarmResult,
      ),
      false,
    );
  });
});
