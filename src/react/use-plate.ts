import { useCallback, useContext, useEffect, useState } from "react";
import { QueryClientContext, useQuery } from "@tanstack/react-query";
import type { PlateInput } from "@/rendering/resolve.ts";
import { type PlateNetwork, VanityContext } from "@/react/provider.tsx";
import {
  defaultPlateQueryClient,
  hasPlateNetwork,
  type PlateData,
  plateQueryOptions,
} from "@/react/query.ts";

/** Supply explicit display data or an address. Explicit data bypasses every network option. */
export type PlateSource =
  | { data: PlateData; address?: never; suffixLength?: never }
  | { data?: never; address: string; suffixLength?: number };
/** Address/data input with optional overrides for inherited network settings. */
export type UsePlateOptions = PlateSource & PlateNetwork;
/** Shared query state for custom UI. Missing owner metadata is successful abbreviated data. */
export interface UsePlateResult {
  /** Available synchronously for explicit/local data and existing cache entries. */
  data: PlateData | undefined;
  /** Initial loading, completed data, or a lookup failure. */
  status: "pending" | "success" | "error";
  /** Transport/protocol failure; never disguised as missing configuration. */
  error: Error | null;
  /** True while the initial lookup has no data. */
  isPending: boolean;
  /** Includes background refresh while previous data remains visible. */
  isFetching: boolean;
  /** Refresh ledger metadata; explicit/local data is simply returned. Failures reject. */
  refetch: () => Promise<PlateData | undefined>;
}

/** A component's network override replaces the inherited source as a unit. */
function plateInput(
  options: UsePlateOptions,
  inherited: PlateNetwork,
): PlateInput {
  if (options.data !== undefined) return options.data;
  const ownSource = hasPlateNetwork(options);
  return {
    address: options.address,
    suffixLength: options.suffixLength,
    networkConfig: ownSource ? options.networkConfig : inherited.networkConfig,
    rpcUrl: ownSource ? options.rpcUrl : inherited.rpcUrl,
    nftContractId: options.nftContractId ?? inherited.nftContractId,
  };
}

/**
 * Reads shared TanStack state. Provider-free browser calls share one SDK cache;
 * an enclosing QueryClientProvider or VanityProvider takes precedence.
 * Explicit data never seeds or overwrites an on-chain cache entry.
 */
export function usePlate(options: UsePlateOptions): UsePlateResult {
  const inherited = useContext(VanityContext);
  const providedClient = useContext(QueryClientContext);
  const [fallbackClient] = useState(defaultPlateQueryClient);
  const client = providedClient ?? fallbackClient;
  // QueryClient's reference-counted lifecycle also supports provider-free roots.
  useEffect(() => {
    client.mount();
    return () => client.unmount();
  }, [client]);
  const input = plateInput(options, inherited);
  const local = !hasPlateNetwork(input);
  const query = useQuery(plateQueryOptions(input), client);
  const data = local
    ? { address: input.address, suffixLength: input.suffixLength }
    : query.data;
  const status = local ? "success" : query.status;
  const refetch = useCallback(async () => {
    if (local) {
      return { address: input.address, suffixLength: input.suffixLength };
    }
    return (await query.refetch({ throwOnError: true })).data;
  }, [local, input.address, input.suffixLength, query.refetch]);
  return {
    data,
    status,
    error: local ? null : query.error,
    isPending: status === "pending",
    isFetching: !local && query.isFetching,
    refetch,
  };
}
