import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertRejects,
} from "@std/assert";
import { ColibriError, NetworkConfig, Spec, StrKey } from "@colibri/core";
import * as sdk from "@sdk";
import {
  accountDisplay,
  encodeSuffixLength,
  loadAccountConfiguration,
} from "@/accounts/index.ts";
import {
  deriveContractAddress,
  farmAccount,
  farmContract,
  hexToSalt,
} from "@/farming/index.ts";
import {
  assertCompatibleSpec,
  createTreasuryAssetClients,
  NftClient,
  NftSpec,
  type TreasuryConfig,
} from "@/contracts/index.ts";
import { renderPlateSvg } from "@/rendering/index.ts";
import { renderPlatePng as browserPng } from "@/rendering/png.ts";

const network = NetworkConfig.TestNet();
const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const address = StrKey.encodeContract(new Uint8Array(32));
const salt = new Uint8Array(32);
const plate = { address, suffixLength: 3 };
const farm = {
  suffix: "A",
  networkPassphrase: network.networkPassphrase,
  deployer: address,
};
const treasury = {
  share_asset: address,
  fee_asset: address,
  defindex_vault: address,
} as TreasuryConfig;
const withoutOwner = new Spec(
  NftSpec.entries.filter((entry) =>
    entry.type !== "scSpecEntryFunctionV0" ||
    entry.functionV0?.name.toString() !== "owner_of"
  ),
);

Deno.test("public failure conditions retain distinct classes and stable numbered codes", async (t) => {
  const cases = [
    [() => sdk.plateKind("bad"), sdk.InvalidPlateAddressError, "VNTY_001"],
    [() => sdk.normalizeSuffix("0"), sdk.InvalidSuffixError, "VNTY_002"],
    [() => accountDisplay(address), sdk.InvalidAccountAddressError, "VNTY_003"],
    [() => encodeSuffixLength(56), sdk.InvalidSuffixLengthError, "VNTY_004"],
    [
      () => farmAccount({ suffix: "A", maxAttempts: Infinity }),
      sdk.InvalidAttemptLimitError,
      "VNTY_005",
    ],
    [
      () => farmAccount({ suffix: "A", batchSize: 0 }),
      sdk.InvalidBatchSizeError,
      "VNTY_006",
    ],
    [
      () => farmAccount({ suffix: "A", signal: AbortSignal.abort() }),
      sdk.FarmAbortedError,
      "VNTY_007",
    ],
    [
      () => deriveContractAddress(" ", address, salt),
      sdk.MissingNetworkPassphraseError,
      "VNTY_008",
    ],
    [
      () => deriveContractAddress(network.networkPassphrase, "bad", salt),
      sdk.InvalidDeployerAddressError,
      "VNTY_009",
    ],
    [
      () =>
        deriveContractAddress(
          network.networkPassphrase,
          address,
          new Uint8Array(31),
        ),
      sdk.InvalidSaltLengthError,
      "VNTY_010",
    ],
    [
      () => farmContract({ ...farm, stride: 0n }),
      sdk.InvalidSaltStrideError,
      "VNTY_011",
    ],
    [
      () => hexToSalt("private-invalid-salt"),
      sdk.InvalidSaltHexError,
      "VNTY_012",
    ],
    [
      () => renderPlateSvg(plate, { width: 100 }),
      sdk.InvalidPlateWidthError,
      "VNTY_015",
    ],
    [
      () => renderPlateSvg(plate, { idPrefix: "0bad" }),
      sdk.InvalidSvgIdPrefixError,
      "VNTY_016",
    ],
    [() => browserPng(plate), sdk.BrowserDomUnavailableError, "VNTY_017"],
    [
      () => assertCompatibleSpec(NftSpec, withoutOwner),
      sdk.IncompatibleContractSpecError,
      "VNTY_022",
    ],
    [
      () => new NftClient({ networkConfig: network, contractId: account }),
      sdk.InvalidProtocolContractAddressError,
      "VNTY_023",
    ],
    [
      () =>
        createTreasuryAssetClients(network, {
          ...treasury,
          share_asset: account,
        }),
      sdk.InvalidTreasuryShareAssetError,
      "VNTY_024",
    ],
    [
      () =>
        createTreasuryAssetClients(network, {
          ...treasury,
          fee_asset: account,
        }),
      sdk.InvalidTreasuryFeeAssetError,
      "VNTY_025",
    ],
    [
      () =>
        createTreasuryAssetClients(network, {
          ...treasury,
          defindex_vault: account,
        }),
      sdk.InvalidTreasuryVaultError,
      "VNTY_026",
    ],
  ] as const;
  for (const [run, ErrorClass, code] of cases) {
    await t.step(code, async () => {
      let caught: unknown;
      try {
        await run();
      } catch (error) {
        caught = error;
      }
      assert(caught instanceof ErrorClass);
      assert(caught instanceof sdk.VanityError);
      assertInstanceOf(caught, ColibriError);
      assertEquals(caught.code, code);
      assertEquals(caught.name, ErrorClass.name);
      assertEquals(sdk.VANITY_ERRORS[caught.code], ErrorClass);
      assert(caught.source.startsWith("@vanity-plates/sdk/"));
      assert(caught.details);
      assertEquals(caught.toJSON().code, code);
      assert(!JSON.stringify(caught).includes("private-invalid-salt"));
      if (caught instanceof sdk.IncompatibleContractSpecError) {
        assertEquals(caught.meta?.data?.specEntry, "function_v0:owner_of");
      }
    });
  }
  const codes = Object.values(sdk.VanityErrorCode);
  const constructors = Object.values(sdk.VANITY_ERRORS);
  assertEquals(new Set(codes).size, codes.length);
  assertEquals(new Set(constructors).size, codes.length);
  assertEquals(Object.keys(sdk.VANITY_ERRORS).sort(), [...codes].sort());
  assert(codes.every((code) => /^VNTY_\d{3}$/.test(code)));
  assert(Object.isFrozen(sdk.VANITY_ERRORS));
});

Deno.test("browser PNG preserves specific failures and the cause of unexpected rendering errors", async () => {
  const descriptors = ["document", "Image"].map((key) =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
  );
  let mode: "context" | "encode" | "decode" = "context";
  const cause = new Error("image decoder failure");
  try {
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: class {
        src = "";
        decode() {
          return mode === "decode" ? Promise.reject(cause) : Promise.resolve();
        }
      },
    });
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement: () => ({
          width: 0,
          height: 0,
          getContext: () => mode === "context" ? null : { drawImage() {} },
          toBlob: (callback: (blob: Blob | null) => void) => callback(null),
        }),
      },
    });
    const context = await assertRejects(
      () => browserPng(plate),
      sdk.CanvasContextUnavailableError,
    );
    assertEquals(context.code, "VNTY_018");
    mode = "encode";
    const encoding = await assertRejects(
      () => browserPng(plate),
      sdk.PngEncodingError,
    );
    assertEquals(encoding.code, "VNTY_019");
    mode = "decode";
    const rendering = await assertRejects(
      () => browserPng(plate),
      sdk.BrowserPngRenderError,
    );
    assertEquals(rendering.code, "VNTY_020");
    assertEquals(rendering.cause, cause);
    assertEquals(rendering.meta?.cause, cause);
  } finally {
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});

Deno.test("upstream RPC and Colibri errors retain their identity", async () => {
  const cause = new ColibriError({
    domain: "rpc",
    source: "rpc",
    code: "RPC_TEST",
    message: "offline",
  });
  assert(!sdk.VanityError.is(cause));
  const caught = await assertRejects(() =>
    loadAccountConfiguration(account, {
      rpc: { getLedgerEntries: () => Promise.reject(cause) },
    })
  );
  assertEquals(caught, cause);
});
