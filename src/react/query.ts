import { QueryClient } from "@tanstack/react-query";
import type * as TanStack from "@tanstack/react-query";
import type { PlateInput } from "@/rendering/resolve.ts";
import type { ResolvedPlateInput } from "@/rendering/model.ts";

/** Display data accepted by Plate and returned by usePlate. An absent count means abbreviation. */
export type PlateData = ResolvedPlateInput;
/** The application's TanStack QueryClient, accepted without a wrapper or adapter. */
export type PlateQueryClient = TanStack.QueryClient;
/** Canonical query definition usable by TanStack hooks, fetchQuery and prefetchQuery. */
export interface PlateQueryDefinition {
  /** Deterministic identity of this display lookup. */ queryKey:
    readonly unknown[];
  /** Lazy Colibri-backed read. */ queryFn: () => Promise<PlateData>;
  /** Local inputs do not fetch automatically. */ enabled: boolean;
}

/** True only when the caller selected a ledger source. No network is inferred from an address. */
export function hasPlateNetwork(input: PlateInput): boolean {
  return input.networkConfig !== undefined || input.rpcUrl !== undefined;
}

/** Stable cache identity includes the RPC source, network and collection, never visual options. */
export function plateQueryKey(input: PlateInput): readonly unknown[] {
  if (!hasPlateNetwork(input)) {
    return [
      "vanity-plates",
      "local",
      input.address,
      input.suffixLength ?? null,
    ];
  }
  return [
    "vanity-plates",
    "metadata",
    input.address,
    input.networkConfig?.networkPassphrase ?? null,
    input.networkConfig?.rpcUrl ?? null,
    input.rpcUrl ?? null,
    input.nftContractId ?? null,
  ];
}

/**
 * Canonical TanStack options for hooks, prefetching, hydration and invalidation.
 * Network clients load only when the query executes. Protocol errors reject unchanged.
 * Online metadata takes precedence over the legacy count-only input.
 */
export function plateQueryOptions(
  input: PlateInput,
): PlateQueryDefinition {
  return {
    queryKey: plateQueryKey(input),
    queryFn: async () => {
      const { resolvePlateInput } = await import("@/rendering/resolve.ts");
      return resolvePlateInput(input);
    },
    enabled: hasPlateNetwork(input),
  };
}

/**
 * Creates an isolated cache. Metadata is fresh for 30 seconds; inactive browser
 * entries expire after five minutes. Failures are exposed without automatic retries.
 * Server caches have no GC timers and must be scoped to one request.
 */
export function createPlateQueryClient(): PlateQueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: typeof window === "undefined" ? Infinity : 300_000,
        retry: false,
      },
    },
  });
}

let browserClient: QueryClient | undefined;
/** Browser default shared across SDK components; server callers receive isolated clients. */
export function defaultPlateQueryClient(): PlateQueryClient {
  if (typeof window === "undefined") return createPlateQueryClient();
  return browserClient ??= createPlateQueryClient();
}
