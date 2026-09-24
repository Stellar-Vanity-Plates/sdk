import { StrKey } from "@colibri/core/strkey";
import {
  InvalidProtocolContractAddressError,
  InvalidTokenIdError,
} from "@/errors.ts";

/** Converts a C address to the full unsigned, big-endian SEP-50 token ID locally. */
export function addressToTokenId(address: string): bigint {
  if (typeof address !== "string" || !StrKey.isValidContractId(address)) {
    throw new InvalidProtocolContractAddressError();
  }
  let value = 0n;
  for (const byte of StrKey.decodeContract(address)) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

/** Converts an unsigned 256-bit token ID to its represented C address locally. */
export function tokenIdToAddress(tokenId: bigint): string {
  if (typeof tokenId !== "bigint" || tokenId < 0n || tokenId >= (1n << 256n)) {
    throw new InvalidTokenIdError();
  }
  const bytes = new Uint8Array(32);
  let remaining = tokenId;
  for (let i = 31; i >= 0; i--) {
    bytes[i] = Number(remaining & 255n);
    remaining >>= 8n;
  }
  return StrKey.encodeContract(bytes);
}
