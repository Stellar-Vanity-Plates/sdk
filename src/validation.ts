import { StrKey } from "@colibri/core/strkey";
import { InvalidPlateAddressError, InvalidSuffixError } from "@/errors.ts";

/** The two supported Stellar address types. */
export type PlateKind = "account" | "contract";

/** Validates the complete address, including its checksum and G/C type. */
export function isPlateAddress(address: string, kind?: PlateKind): boolean {
  if (typeof address !== "string") return false;
  return (kind !== "contract" && StrKey.isValidEd25519PublicKey(address)) ||
    (kind !== "account" && StrKey.isValidContractId(address));
}

/** Returns the address kind, throwing for invalid, muxed or secret addresses. */
export function plateKind(address: string): PlateKind {
  if (!isPlateAddress(address)) {
    throw new InvalidPlateAddressError();
  }
  return address.startsWith("G") ? "account" : "contract";
}

/** Normalizes a user-entered suffix to uppercase Stellar base32, 1–56 characters. */
export function normalizeSuffix(suffix: string): string {
  if (typeof suffix !== "string" || !/^[a-z2-7]{1,56}$/i.test(suffix)) {
    throw new InvalidSuffixError();
  }
  return suffix.toUpperCase();
}

/** Checks the checksum, address type and exact uppercase suffix; does not prove NFT ownership. */
export function validatePlate(
  address: string,
  suffix: string,
  kind?: PlateKind,
): boolean {
  return isPlateAddress(address, kind) && typeof suffix === "string" &&
    /^[A-Z2-7]{1,56}$/.test(suffix) && address.endsWith(suffix);
}

/** The standard unconfigured display: first six characters, ellipsis, last six. */
export function abbreviateAddress(address: string): string {
  plateKind(address);
  return `${address.slice(0, 6)}…${address.slice(-6)}`;
}
