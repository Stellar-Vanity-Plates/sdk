import { ColibriError } from "@colibri/core/errors";

/** Stable SDK-owned codes. Each numbered value identifies one concrete error class. */
export enum VanityErrorCode {
  /** Expected a checksum-valid Stellar G or C address. */
  INVALID_PLATE_ADDRESS = "VNTY_001",
  /** Invalid vanity suffix. */
  INVALID_SUFFIX = "VNTY_002",
  /** Account display requires a valid G address. */
  INVALID_ACCOUNT_ADDRESS = "VNTY_003",
  /** The displayed suffix length must be an integer from 1 to 55. */
  INVALID_SUFFIX_LENGTH = "VNTY_004",
  /** The attempt limit must be a nonnegative safe integer. */
  INVALID_ATTEMPT_LIMIT = "VNTY_005",
  /** The batch size must be an integer from 1 to 4096. */
  INVALID_BATCH_SIZE = "VNTY_006",
  /** The address search was cancelled. */
  FARM_ABORTED = "VNTY_007",
  /** Contract derivation requires a nonempty network passphrase. */
  MISSING_NETWORK_PASSPHRASE = "VNTY_008",
  /** Contract derivation requires a valid deployer address. */
  INVALID_DEPLOYER_ADDRESS = "VNTY_009",
  /** A deployment salt must be a 32-byte Uint8Array. */
  INVALID_SALT_LENGTH = "VNTY_010",
  /** Stride must be between 1 and 2^256 - 1. */
  INVALID_SALT_STRIDE = "VNTY_011",
  /** A salt must contain exactly 64 hexadecimal characters. */
  INVALID_SALT_HEX = "VNTY_012",
  // VNTY_013 and VNTY_014 retired with suffix-string display inputs.
  /** Plate width must be an integer from 120 to 4096. */
  INVALID_PLATE_WIDTH = "VNTY_015",
  /** Invalid SVG ID prefix. */
  INVALID_SVG_ID_PREFIX = "VNTY_016",
  /** A browser DOM is required for browser PNG export. */
  BROWSER_DOM_UNAVAILABLE = "VNTY_017",
  /** A 2D canvas context is unavailable. */
  CANVAS_CONTEXT_UNAVAILABLE = "VNTY_018",
  /** The canvas could not encode a PNG. */
  PNG_ENCODING_FAILED = "VNTY_019",
  /** The browser could not render the canonical plate PNG. */
  BROWSER_PNG_RENDER_FAILED = "VNTY_020",
  /** Local Chromium could not export the plate. */
  SERVER_PNG_RENDER_FAILED = "VNTY_021",
  /** The deployed contract interface is incompatible with the SDK. */
  INCOMPATIBLE_CONTRACT_SPEC = "VNTY_022",
  /** Protocol clients require a valid C address. */
  INVALID_PROTOCOL_CONTRACT_ADDRESS = "VNTY_023",
  /** The treasury share asset must be a valid C address. */
  INVALID_TREASURY_SHARE_ASSET = "VNTY_024",
  /** The treasury fee asset must be a valid C address. */
  INVALID_TREASURY_FEE_ASSET = "VNTY_025",
  /** The treasury vault must be a valid C address. */
  INVALID_TREASURY_VAULT = "VNTY_026",
  /** Local Chromium export resources could not be closed. */
  SERVER_PNG_CLEANUP_FAILED = "VNTY_027",
  /** No default NFT collection is configured for this network. */
  MISSING_NFT_COLLECTION = "VNTY_028",
  /** Provide either rpcUrl or networkConfig. */
  CONFLICTING_NETWORK_SOURCE = "VNTY_029",
  /** The RPC URL must be an absolute HTTP or HTTPS URL. */
  INVALID_RPC_URL = "VNTY_030",
  /** The RPC network could not be identified. */
  RPC_NETWORK_DISCOVERY_FAILED = "VNTY_031",
  /** Invalid or overflowing worker partition. */
  INVALID_FARM_PARTITION = "VNTY_032",
}

/** Diagnostic metadata; validation inputs, seeds and salts are never captured. */
export interface VanityErrorMeta {
  /** Original failure from a rendering adapter. */
  cause?: unknown;
  /** Cleanup failures retained alongside the original rendering failure. */
  cleanupCauses?: readonly unknown[];
  /** Public ABI entry identifying a compatibility failure. */
  data?: { specEntry: string };
}

/** Shared catch boundary for SDK failures. Construct a concrete subclass instead. */
export abstract class VanityError<C extends VanityErrorCode = VanityErrorCode>
  extends ColibriError<C, VanityErrorMeta> {
  /** Original rendering failure, also available through meta.cause. */
  override readonly cause?: unknown;

  /** Initializes the common Colibri-compatible fields for a concrete SDK error. */
  protected constructor(
    code: C,
    source: string,
    message: string,
    details: string,
    meta?: VanityErrorMeta,
  ) {
    super({
      domain: "core",
      source: `@vanity-plates/sdk/${source}`,
      code,
      message,
      details,
      meta,
    });
    this.name = new.target.name;
    this.cause = meta?.cause;
  }

  /** Narrows only SDK-owned errors; upstream Colibri errors remain distinct. */
  static override is(error: unknown): error is VanityError {
    return error instanceof VanityError;
  }
}

/** Expected a checksum-valid Stellar G or C address. */
export class InvalidPlateAddressError
  extends VanityError<VanityErrorCode.INVALID_PLATE_ADDRESS> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_PLATE_ADDRESS,
      "validation",
      "Expected a checksum-valid Stellar G or C address.",
      "Supply the public account or contract address, not a secret seed or muxed address.",
    );
  }
}

/** Invalid vanity suffix. */
export class InvalidSuffixError
  extends VanityError<VanityErrorCode.INVALID_SUFFIX> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SUFFIX,
      "validation",
      "Invalid vanity suffix.",
      "Use 1–55 letters A–Z or digits 2–7, without spaces.",
    );
  }
}

/** Account display requires a valid G address. */
export class InvalidAccountAddressError
  extends VanityError<VanityErrorCode.INVALID_ACCOUNT_ADDRESS> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_ACCOUNT_ADDRESS,
      "accounts",
      "Account display requires a valid G address.",
      "Supply a checksum-valid Stellar account public key.",
    );
  }
}

/** The displayed suffix length must be an integer from 1 to 55. */
export class InvalidSuffixLengthError
  extends VanityError<VanityErrorCode.INVALID_SUFFIX_LENGTH> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SUFFIX_LENGTH,
      "accounts",
      "The displayed suffix length must be an integer from 1 to 55.",
      "Choose a supported suffix length before encoding ManageData.",
    );
  }
}

/** The attempt limit must be a nonnegative safe integer. */
export class InvalidAttemptLimitError
  extends VanityError<VanityErrorCode.INVALID_ATTEMPT_LIMIT> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_ATTEMPT_LIMIT,
      "farming",
      "The attempt limit must be a nonnegative safe integer.",
      "Set maxAttempts to a finite whole number; zero performs no search.",
    );
  }
}

/** The batch size must be an integer from 1 to 4096. */
export class InvalidBatchSizeError
  extends VanityError<VanityErrorCode.INVALID_BATCH_SIZE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_BATCH_SIZE,
      "farming",
      "The batch size must be an integer from 1 to 4096.",
      "Set batchSize within the supported range, or omit it to use 128.",
    );
  }
}

/** The address search was cancelled. */
export class FarmAbortedError
  extends VanityError<VanityErrorCode.FARM_ABORTED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.FARM_ABORTED,
      "farming",
      "The address search was cancelled.",
      "Start another search with a fresh AbortSignal if cancellation was not intended.",
    );
  }
}

/** Contract derivation requires a nonempty network passphrase. */
export class MissingNetworkPassphraseError
  extends VanityError<VanityErrorCode.MISSING_NETWORK_PASSPHRASE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.MISSING_NETWORK_PASSPHRASE,
      "farming",
      "Contract derivation requires a nonempty network passphrase.",
      "Use the passphrase for the deployment network.",
    );
  }
}

/** Contract derivation requires a valid deployer address. */
export class InvalidDeployerAddressError
  extends VanityError<VanityErrorCode.INVALID_DEPLOYER_ADDRESS> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_DEPLOYER_ADDRESS,
      "farming",
      "Contract derivation requires a valid deployer address.",
      "Supply the account or contract that deploys; NFT plates use the protocol deployer C address.",
    );
  }
}

/** A deployment salt must be a 32-byte Uint8Array. */
export class InvalidSaltLengthError
  extends VanityError<VanityErrorCode.INVALID_SALT_LENGTH> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SALT_LENGTH,
      "farming",
      "A deployment salt must be a 32-byte Uint8Array.",
      "Supply exactly 32 bytes. The invalid salt is not attached to this error.",
    );
  }
}

/** Stride must be between 1 and 2^256 - 1. */
export class InvalidSaltStrideError
  extends VanityError<VanityErrorCode.INVALID_SALT_STRIDE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SALT_STRIDE,
      "farming",
      "Stride must be between 1 and 2^256 - 1.",
      "Supply a bigint in that range, or omit stride to increment by one.",
    );
  }
}

/** A salt must contain exactly 64 hexadecimal characters. */
export class InvalidSaltHexError
  extends VanityError<VanityErrorCode.INVALID_SALT_HEX> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SALT_HEX,
      "farming",
      "A salt must contain exactly 64 hexadecimal characters.",
      "Use a 32-byte salt encoded as hexadecimal. The invalid salt is not attached to this error.",
    );
  }
}

/** Plate width must be an integer from 120 to 4096. */
export class InvalidPlateWidthError
  extends VanityError<VanityErrorCode.INVALID_PLATE_WIDTH> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_PLATE_WIDTH,
      "rendering",
      "Plate width must be an integer from 120 to 4096.",
      "Choose an export width within that range; the width includes the shadow margin.",
    );
  }
}

/** Invalid SVG ID prefix. */
export class InvalidSvgIdPrefixError
  extends VanityError<VanityErrorCode.INVALID_SVG_ID_PREFIX> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_SVG_ID_PREFIX,
      "rendering",
      "Invalid SVG ID prefix.",
      "Start with a letter and use only letters, digits, hyphens or underscores, up to 128 characters.",
    );
  }
}

/** A browser DOM is required for browser PNG export. */
export class BrowserDomUnavailableError
  extends VanityError<VanityErrorCode.BROWSER_DOM_UNAVAILABLE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.BROWSER_DOM_UNAVAILABLE,
      "png",
      "A browser DOM is required for browser PNG export.",
      "In Deno/Node, use @vanity-plates/sdk/png/server with local Chromium installed.",
    );
  }
}

/** A 2D canvas context is unavailable. */
export class CanvasContextUnavailableError
  extends VanityError<VanityErrorCode.CANVAS_CONTEXT_UNAVAILABLE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.CANVAS_CONTEXT_UNAVAILABLE,
      "png",
      "A 2D canvas context is unavailable.",
      "Use a browser with Canvas 2D support, or select the server PNG adapter.",
    );
  }
}

/** The canvas could not encode a PNG. */
export class PngEncodingError
  extends VanityError<VanityErrorCode.PNG_ENCODING_FAILED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.PNG_ENCODING_FAILED,
      "png",
      "The canvas could not encode a PNG.",
      "Check browser Canvas support or use the server PNG adapter.",
    );
  }
}

/** The browser could not render the canonical plate PNG. */
export class BrowserPngRenderError
  extends VanityError<VanityErrorCode.BROWSER_PNG_RENDER_FAILED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor(cause: unknown) {
    super(
      VanityErrorCode.BROWSER_PNG_RENDER_FAILED,
      "png",
      "The browser could not render the canonical plate PNG.",
      "Inspect the underlying cause and check support for SVG foreignObject, embedded fonts and Canvas.",
      { cause },
    );
  }
}

/** Local Chromium could not export the plate. */
export class ServerPngRenderError
  extends VanityError<VanityErrorCode.SERVER_PNG_RENDER_FAILED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor(cause: unknown, cleanupCauses: readonly unknown[] = []) {
    super(
      VanityErrorCode.SERVER_PNG_RENDER_FAILED,
      "png/server",
      "Local Chromium could not export the plate.",
      "Install the pinned Playwright browser or provide an executablePath/browser; inspect the underlying cause.",
      { cause, cleanupCauses },
    );
  }
}

/** The deployed contract interface is incompatible with the SDK. */
export class IncompatibleContractSpecError
  extends VanityError<VanityErrorCode.INCOMPATIBLE_CONTRACT_SPEC> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor(specEntry: string) {
    super(
      VanityErrorCode.INCOMPATIBLE_CONTRACT_SPEC,
      "contracts",
      "The deployed contract interface is incompatible with the SDK.",
      "Update the SDK or select a compatible deployment; meta.data.specEntry identifies the mismatched entry.",
      { data: { specEntry } },
    );
  }
}

/** Protocol clients require a valid C address. */
export class InvalidProtocolContractAddressError
  extends VanityError<VanityErrorCode.INVALID_PROTOCOL_CONTRACT_ADDRESS> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_PROTOCOL_CONTRACT_ADDRESS,
      "contracts",
      "Protocol clients require a valid C address.",
      "Supply the checksum-valid contract ID for the selected protocol client.",
    );
  }
}

/** The treasury share asset must be a valid C address. */
export class InvalidTreasuryShareAssetError
  extends VanityError<VanityErrorCode.INVALID_TREASURY_SHARE_ASSET> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_TREASURY_SHARE_ASSET,
      "contracts",
      "The treasury share asset must be a valid C address.",
      "Check share_asset in the treasury configuration before constructing the VNTY client.",
    );
  }
}

/** The treasury fee asset must be a valid C address. */
export class InvalidTreasuryFeeAssetError
  extends VanityError<VanityErrorCode.INVALID_TREASURY_FEE_ASSET> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_TREASURY_FEE_ASSET,
      "contracts",
      "The treasury fee asset must be a valid C address.",
      "Check fee_asset in the treasury configuration before constructing its token client.",
    );
  }
}

/** The treasury vault must be a valid C address. */
export class InvalidTreasuryVaultError
  extends VanityError<VanityErrorCode.INVALID_TREASURY_VAULT> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_TREASURY_VAULT,
      "contracts",
      "The treasury vault must be a valid C address.",
      "Check defindex_vault in the treasury configuration before constructing its contract client.",
    );
  }
}

/** Local Chromium export resources could not be closed. */
export class ServerPngCleanupError
  extends VanityError<VanityErrorCode.SERVER_PNG_CLEANUP_FAILED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor(cleanupCauses: readonly unknown[]) {
    super(
      VanityErrorCode.SERVER_PNG_CLEANUP_FAILED,
      "png/server",
      "Local Chromium export resources could not be closed.",
      "Inspect meta.cleanupCauses for the failed context or browser cleanup.",
      { cause: cleanupCauses[0], cleanupCauses },
    );
  }
}

/** No default NFT collection is configured for this network. */
export class MissingNftCollectionError
  extends VanityError<VanityErrorCode.MISSING_NFT_COLLECTION> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.MISSING_NFT_COLLECTION,
      "rendering",
      "No default NFT collection is configured for this network.",
      "Provide nftContractId for this network.",
    );
  }
}
/** Provide either rpcUrl or networkConfig. */
export class ConflictingNetworkSourceError
  extends VanityError<VanityErrorCode.CONFLICTING_NETWORK_SOURCE> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.CONFLICTING_NETWORK_SOURCE,
      "rendering",
      "Provide either rpcUrl or networkConfig.",
      "Remove one of the two network sources.",
    );
  }
}
/** The RPC URL must be an absolute HTTP or HTTPS URL. */
export class InvalidRpcUrlError
  extends VanityError<VanityErrorCode.INVALID_RPC_URL> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_RPC_URL,
      "rendering",
      "The RPC URL must be an absolute HTTP or HTTPS URL.",
      "Check rpcUrl before requesting plate metadata.",
    );
  }
}
/** The RPC network could not be identified. */
export class RpcNetworkDiscoveryError
  extends VanityError<VanityErrorCode.RPC_NETWORK_DISCOVERY_FAILED> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor(cause?: unknown) {
    super(
      VanityErrorCode.RPC_NETWORK_DISCOVERY_FAILED,
      "rendering",
      "The RPC network could not be identified.",
      "Check the endpoint supports getNetwork and inspect the cause.",
      { cause },
    );
  }
}
/** Worker partitions must be disjoint and fit the 256-bit salt space. */
export class InvalidFarmPartitionError
  extends VanityError<VanityErrorCode.INVALID_FARM_PARTITION> {
  /** Creates this failure with its stable code and recovery guidance. */
  constructor() {
    super(
      VanityErrorCode.INVALID_FARM_PARTITION,
      "farming",
      "Invalid contract farming partition.",
      "Use a positive safe worker count and an index in range, without salt overflow.",
    );
  }
}
/** Complete, immutable code-to-constructor registry for SDK-owned errors. */
export const VANITY_ERRORS: {
  readonly [VanityErrorCode.INVALID_FARM_PARTITION]:
    typeof InvalidFarmPartitionError;
  readonly [VanityErrorCode.INVALID_PLATE_ADDRESS]:
    typeof InvalidPlateAddressError;
  readonly [VanityErrorCode.INVALID_SUFFIX]: typeof InvalidSuffixError;
  readonly [VanityErrorCode.INVALID_ACCOUNT_ADDRESS]:
    typeof InvalidAccountAddressError;
  readonly [VanityErrorCode.INVALID_SUFFIX_LENGTH]:
    typeof InvalidSuffixLengthError;
  readonly [VanityErrorCode.INVALID_ATTEMPT_LIMIT]:
    typeof InvalidAttemptLimitError;
  readonly [VanityErrorCode.INVALID_BATCH_SIZE]: typeof InvalidBatchSizeError;
  readonly [VanityErrorCode.FARM_ABORTED]: typeof FarmAbortedError;
  readonly [VanityErrorCode.MISSING_NETWORK_PASSPHRASE]:
    typeof MissingNetworkPassphraseError;
  readonly [VanityErrorCode.INVALID_DEPLOYER_ADDRESS]:
    typeof InvalidDeployerAddressError;
  readonly [VanityErrorCode.INVALID_SALT_LENGTH]: typeof InvalidSaltLengthError;
  readonly [VanityErrorCode.INVALID_SALT_STRIDE]: typeof InvalidSaltStrideError;
  readonly [VanityErrorCode.INVALID_SALT_HEX]: typeof InvalidSaltHexError;
  readonly [VanityErrorCode.INVALID_PLATE_WIDTH]: typeof InvalidPlateWidthError;
  readonly [VanityErrorCode.INVALID_SVG_ID_PREFIX]:
    typeof InvalidSvgIdPrefixError;
  readonly [VanityErrorCode.BROWSER_DOM_UNAVAILABLE]:
    typeof BrowserDomUnavailableError;
  readonly [VanityErrorCode.CANVAS_CONTEXT_UNAVAILABLE]:
    typeof CanvasContextUnavailableError;
  readonly [VanityErrorCode.PNG_ENCODING_FAILED]: typeof PngEncodingError;
  readonly [VanityErrorCode.BROWSER_PNG_RENDER_FAILED]:
    typeof BrowserPngRenderError;
  readonly [VanityErrorCode.SERVER_PNG_RENDER_FAILED]:
    typeof ServerPngRenderError;
  readonly [VanityErrorCode.INCOMPATIBLE_CONTRACT_SPEC]:
    typeof IncompatibleContractSpecError;
  readonly [VanityErrorCode.INVALID_PROTOCOL_CONTRACT_ADDRESS]:
    typeof InvalidProtocolContractAddressError;
  readonly [VanityErrorCode.INVALID_TREASURY_SHARE_ASSET]:
    typeof InvalidTreasuryShareAssetError;
  readonly [VanityErrorCode.INVALID_TREASURY_FEE_ASSET]:
    typeof InvalidTreasuryFeeAssetError;
  readonly [VanityErrorCode.INVALID_TREASURY_VAULT]:
    typeof InvalidTreasuryVaultError;
  readonly [VanityErrorCode.SERVER_PNG_CLEANUP_FAILED]:
    typeof ServerPngCleanupError;
  readonly [VanityErrorCode.MISSING_NFT_COLLECTION]:
    typeof MissingNftCollectionError;
  readonly [VanityErrorCode.CONFLICTING_NETWORK_SOURCE]:
    typeof ConflictingNetworkSourceError;
  readonly [VanityErrorCode.INVALID_RPC_URL]: typeof InvalidRpcUrlError;
  readonly [VanityErrorCode.RPC_NETWORK_DISCOVERY_FAILED]:
    typeof RpcNetworkDiscoveryError;
} = Object.freeze({
  [VanityErrorCode.INVALID_FARM_PARTITION]: InvalidFarmPartitionError,
  [VanityErrorCode.MISSING_NFT_COLLECTION]: MissingNftCollectionError,
  [VanityErrorCode.CONFLICTING_NETWORK_SOURCE]: ConflictingNetworkSourceError,
  [VanityErrorCode.INVALID_RPC_URL]: InvalidRpcUrlError,
  [VanityErrorCode.RPC_NETWORK_DISCOVERY_FAILED]: RpcNetworkDiscoveryError,

  [VanityErrorCode.INVALID_PLATE_ADDRESS]: InvalidPlateAddressError,
  [VanityErrorCode.INVALID_SUFFIX]: InvalidSuffixError,
  [VanityErrorCode.INVALID_ACCOUNT_ADDRESS]: InvalidAccountAddressError,
  [VanityErrorCode.INVALID_SUFFIX_LENGTH]: InvalidSuffixLengthError,
  [VanityErrorCode.INVALID_ATTEMPT_LIMIT]: InvalidAttemptLimitError,
  [VanityErrorCode.INVALID_BATCH_SIZE]: InvalidBatchSizeError,
  [VanityErrorCode.FARM_ABORTED]: FarmAbortedError,
  [VanityErrorCode.MISSING_NETWORK_PASSPHRASE]: MissingNetworkPassphraseError,
  [VanityErrorCode.INVALID_DEPLOYER_ADDRESS]: InvalidDeployerAddressError,
  [VanityErrorCode.INVALID_SALT_LENGTH]: InvalidSaltLengthError,
  [VanityErrorCode.INVALID_SALT_STRIDE]: InvalidSaltStrideError,
  [VanityErrorCode.INVALID_SALT_HEX]: InvalidSaltHexError,
  [VanityErrorCode.INVALID_PLATE_WIDTH]: InvalidPlateWidthError,
  [VanityErrorCode.INVALID_SVG_ID_PREFIX]: InvalidSvgIdPrefixError,
  [VanityErrorCode.BROWSER_DOM_UNAVAILABLE]: BrowserDomUnavailableError,
  [VanityErrorCode.CANVAS_CONTEXT_UNAVAILABLE]: CanvasContextUnavailableError,
  [VanityErrorCode.PNG_ENCODING_FAILED]: PngEncodingError,
  [VanityErrorCode.BROWSER_PNG_RENDER_FAILED]: BrowserPngRenderError,
  [VanityErrorCode.SERVER_PNG_RENDER_FAILED]: ServerPngRenderError,
  [VanityErrorCode.INCOMPATIBLE_CONTRACT_SPEC]: IncompatibleContractSpecError,
  [VanityErrorCode.INVALID_PROTOCOL_CONTRACT_ADDRESS]:
    InvalidProtocolContractAddressError,
  [VanityErrorCode.INVALID_TREASURY_SHARE_ASSET]:
    InvalidTreasuryShareAssetError,
  [VanityErrorCode.INVALID_TREASURY_FEE_ASSET]: InvalidTreasuryFeeAssetError,
  [VanityErrorCode.INVALID_TREASURY_VAULT]: InvalidTreasuryVaultError,
  [VanityErrorCode.SERVER_PNG_CLEANUP_FAILED]: ServerPngCleanupError,
});
