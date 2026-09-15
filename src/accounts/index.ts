/** RPC-first account configuration and consistent fallback display. @module */
import { type NetworkOptions, resolveNetwork } from "@/network.ts";
import type { NetworkConfig, RpcLedgerEntriesClient } from "@colibri/core";
import { StrKey } from "@colibri/core/strkey";
import { abbreviateAddress } from "@/validation.ts";
import {
  InvalidAccountAddressError,
  InvalidSuffixLengthError,
} from "@/errors.ts";

/** ManageData key used by the current Vanity Plates application. */
export const ACCOUNT_SUFFIX_DATA_KEY = "config.svp.gchar";

/** Decodes the application's decimal UTF-8 suffix length, 1–55, with no whitespace or leading zeros. */
export function parseSuffixLength(
  value: string | Uint8Array,
): number | undefined {
  let text: string;
  try {
    text = typeof value === "string"
      ? value
      : new TextDecoder("utf-8", { fatal: true }).decode(value);
  } catch {
    return undefined;
  }
  if (!/^[1-9]\d?$/.test(text)) return undefined;
  const count = Number(text);
  return count <= 55 ? count : undefined;
}

/** Reads a canonical Base64 Horizon ManageData value; RPC values are already bytes. */
export function decodeHorizonSuffixLength(value: unknown): number | undefined {
  if (typeof value !== "string" || value.length > 8) return undefined;
  try {
    const decoded = atob(value);
    return btoa(decoded) === value ? parseSuffixLength(decoded) : undefined;
  } catch {
    return undefined;
  }
}

/** A presentation model that keeps the complete address alongside the visible label. */
export interface AccountDisplay {
  /** Full checksum-valid G address. */
  address: string;
  /** Exact configured ending, or standard first-six/last-six abbreviation. */
  label: string;
  /** True only for a valid configured suffix length. */
  configured: boolean;
  /** Valid suffix length, omitted for fallback display. */
  suffixLength?: number;
}
/** Derives display without network access. Invalid/missing configuration uses the standard abbreviation. */
export function accountDisplay(
  address: string,
  suffixLength?: number,
): AccountDisplay {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new InvalidAccountAddressError();
  }
  const count = typeof suffixLength === "number"
    ? parseSuffixLength(String(suffixLength))
    : undefined;
  return {
    address,
    label: count ? address.slice(-count) : abbreviateAddress(address),
    configured: count !== undefined,
    ...(count === undefined ? {} : { suffixLength: count }),
  };
}

/** Configuration state, including unfunded accounts and malformed metadata. */
export interface AccountConfiguration extends AccountDisplay {
  /** RPC state: network errors reject and never become a missing configuration. */
  status: "configured" | "unconfigured" | "invalid" | "account-not-found";
}
/** Explicit RPC source: one URL, network configuration, or injected RPC client. */
export type AccountReadOptions =
  | { networkConfig: NetworkConfig; rpc?: never; rpcUrl?: never }
  | { rpc: RpcLedgerEntriesClient; networkConfig?: never; rpcUrl?: never }
  | (NetworkOptions & { rpcUrl: string; rpc?: never; networkConfig?: never });

/**
 * Loads the account and ManageData entry through Colibri in one RPC batch.
 * Missing/invalid metadata is distinct from transport errors, which propagate.
 * Reads do not activate, fund or modify the account.
 */
export async function loadAccountConfiguration(
  address: string,
  options: AccountReadOptions,
): Promise<AccountConfiguration> {
  const fallback = accountDisplay(address);
  const accountId = address as `G${string}`;
  const { LedgerEntries, buildAccountLedgerKey, buildDataLedgerKey } =
    await import("@colibri/core");
  const reader = new LedgerEntries(
    options.rpc
      ? { rpc: options.rpc }
      : { networkConfig: (await resolveNetwork(options))! },
  );
  const [account, data] = await reader.getMany(
    [
      buildAccountLedgerKey({ accountId }),
      buildDataLedgerKey({ accountId, dataName: ACCOUNT_SUFFIX_DATA_KEY }),
    ] as const,
  );
  if (!account) return { ...fallback, status: "account-not-found" };
  if (!data) return { ...fallback, status: "unconfigured" };
  const count = parseSuffixLength(data.dataValue);
  return {
    ...accountDisplay(address, count),
    status: count === undefined ? "invalid" : "configured",
  };
}

/** Returns the exact UTF-8 ManageData value for a validated display length. Does not submit a write. */
export function encodeSuffixLength(count: number): Uint8Array {
  if (
    typeof count !== "number" || parseSuffixLength(String(count)) === undefined
  ) {
    throw new InvalidSuffixLengthError();
  }
  return new TextEncoder().encode(String(count));
}
