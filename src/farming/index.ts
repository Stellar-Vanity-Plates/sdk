/** Local G-keypair and C-salt search, independent of any platform backend. @module */
import { calculateContractId, LocalSigner, StrKey } from "@colibri/core";
import { VanityError } from "@/errors.ts";
import {
  isPlateAddress,
  normalizeSuffix,
  validatePlate,
} from "@/validation.ts";

/** Public progress data. No key or salt is included. */
export interface FarmProgress {
  /** Candidates checked in this call. */
  checked: number;
  /** Elapsed milliseconds measured with a monotonic clock. */
  elapsedMs: number;
}
/** Common local search controls. */
export interface FarmOptions {
  /** Desired ending, normalized to uppercase. */
  suffix: string;
  /** Maximum candidates; defaults to 100,000. Undefined result means budget exhausted. */
  maxAttempts?: number;
  /** Yield to the event loop and report progress after this many candidates; defaults to 128. */
  batchSize?: number;
  /** Abort the search; cancellation rejects with VNTY_ABORTED. */
  signal?: AbortSignal;
  /** Progress callback, invoked at batch boundaries and completion. */
  onProgress?: (progress: FarmProgress) => void;
}
/** A locally generated, unfunded account and its private master seed. */
export interface AccountFarmResult extends FarmProgress {
  /** Full G address. */
  address: string;
  /** Uppercase matching ending. */
  suffix: string;
  /** Secret S seed: store securely; never log or send to the platform. */
  secret: string;
}
/** C-address derivation inputs and resumable search controls. */
export interface ContractFarmOptions extends FarmOptions {
  /** Network passphrase; the same salt has a different result on another network. */
  networkPassphrase: string;
  /** G or C address that actually calls deploy; for NFT plates use the protocol deployer C address. */
  deployer: string;
  /** Optional starting 32-byte salt. Defaults to cryptographic randomness. */
  startSalt?: Uint8Array;
  /** Candidate spacing for partitioning searches. Defaults to 1. No wraparound is performed. */
  stride?: bigint;
}
/** A deterministic contract address and the private salt needed to deploy it. */
export interface ContractFarmResult extends FarmProgress {
  /** Full C address. */
  address: string;
  /** Uppercase matching ending. */
  suffix: string;
  /** 32-byte deployment salt; keep private until the reservation is confirmed. */
  salt: Uint8Array;
  /** Lowercase hexadecimal encoding of salt. */
  saltHex: string;
  /** Deployer identity used in the derivation. */
  deployer: string;
  /** Network passphrase used in the derivation. */
  networkPassphrase: string;
}

function controls(
  options: FarmOptions,
): { suffix: string; max: number; batch: number } {
  const suffix = normalizeSuffix(options.suffix);
  const max = options.maxAttempts ?? 100_000;
  const batch = options.batchSize ?? 128;
  if (
    !Number.isSafeInteger(max) || max < 0 || !Number.isSafeInteger(batch) ||
    batch < 1 || batch > 4096
  ) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "Use a nonnegative safe attempt count and a batch size from 1 to 4096.",
    );
  }
  checkAbort(options.signal);
  return { suffix, max, batch };
}
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new VanityError("VNTY_ABORTED", "The address search was cancelled.");
  }
}
function progress(
  options: FarmOptions,
  checked: number,
  start: number,
): FarmProgress {
  const value = { checked, elapsedMs: performance.now() - start };
  options.onProgress?.(value);
  return value;
}
async function yieldBatch(options: FarmOptions): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  checkAbort(options.signal);
}

/** Searches locally for a G address. Never funds or submits a transaction. */
export async function farmAccount(
  options: FarmOptions,
): Promise<AccountFarmResult | undefined> {
  const { suffix, max, batch } = controls(options);
  const start = performance.now();
  for (let checked = 1; checked <= max; checked++) {
    checkAbort(options.signal);
    const signer = LocalSigner.generateRandom();
    try {
      const address = signer.publicKey();
      if (address.endsWith(suffix)) {
        const secret = signer.secretKey();
        return {
          address,
          suffix,
          secret,
          ...progress(options, checked, start),
        };
      }
    } finally {
      signer.destroy();
    }
    if (checked % batch === 0) {
      progress(options, checked, start);
      await yieldBatch(options);
    }
  }
  progress(options, max, start);
  return undefined;
}

/** Derives a C address through Colibri without revealing the salt to any server. */
export function deriveContractAddress(
  networkPassphrase: string,
  deployer: string,
  salt: Uint8Array,
): string {
  if (
    !networkPassphrase?.trim() || !isPlateAddress(deployer) ||
    !(salt instanceof Uint8Array) || salt.length !== 32
  ) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "Derivation requires a network passphrase, valid deployer and 32-byte salt.",
    );
  }
  return calculateContractId(networkPassphrase, deployer, salt);
}

/** Searches deployment salts locally. A result proves derivation, not on-chain availability. */
export async function farmContract(
  options: ContractFarmOptions,
): Promise<ContractFarmResult | undefined> {
  const { suffix, max, batch } = controls(options);
  const seed = options.startSalt?.slice() ??
    crypto.getRandomValues(new Uint8Array(32));
  deriveContractAddress(options.networkPassphrase, options.deployer, seed);
  const stride = options.stride ?? 1n;
  const maximum = 1n << 256n;
  if (typeof stride !== "bigint" || stride < 1n || stride >= maximum) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "Stride must be between 1 and 2^256 - 1.",
    );
  }
  let cursor = BigInt(`0x${bytesToHex(seed)}`);
  seed.fill(0);
  const start = performance.now();
  let checked = 0;
  while (checked < max && cursor < maximum) {
    checkAbort(options.signal);
    const salt = hexToSalt(cursor.toString(16).padStart(64, "0"));
    const address = deriveContractAddress(
      options.networkPassphrase,
      options.deployer,
      salt,
    );
    checked++;
    if (address.endsWith(suffix)) {
      return {
        address,
        suffix,
        salt,
        saltHex: bytesToHex(salt),
        deployer: options.deployer,
        networkPassphrase: options.networkPassphrase,
        ...progress(options, checked, start),
      };
    }
    salt.fill(0);
    cursor += stride;
    if (checked % batch === 0) {
      progress(options, checked, start);
      await yieldBatch(options);
    }
  }
  progress(options, checked, start);
  return undefined;
}

/** Decodes exactly 64 hexadecimal characters into a deployment salt. */
export function hexToSalt(hex: string): Uint8Array {
  if (typeof hex !== "string" || !/^[0-9a-f]{64}$/i.test(hex)) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "A salt must contain exactly 64 hexadecimal characters.",
    );
  }
  return Uint8Array.from(hex.match(/../g)!, (byte) => parseInt(byte, 16));
}
/** Encodes bytes in lowercase hexadecimal. */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}
/** Verifies a returned account seed and suffix locally without contacting a server. */
export function verifyAccountFarmResult(
  result: Pick<AccountFarmResult, "address" | "secret" | "suffix">,
): boolean {
  if (
    !validatePlate(result.address, result.suffix, "account") ||
    !StrKey.isValidEd25519SecretSeed(result.secret)
  ) return false;
  const signer = LocalSigner.fromSecret(result.secret as `S${string}`);
  try {
    return signer.publicKey() === result.address;
  } finally {
    signer.destroy();
  }
}
/** Verifies a contract result against its deployer, network, salt and suffix. */
export function verifyContractFarmResult(result: ContractFarmResult): boolean {
  try {
    return validatePlate(result.address, result.suffix, "contract") &&
      bytesToHex(result.salt) === result.saltHex &&
      deriveContractAddress(
          result.networkPassphrase,
          result.deployer,
          result.salt,
        ) === result.address;
  } catch {
    return false;
  }
}
