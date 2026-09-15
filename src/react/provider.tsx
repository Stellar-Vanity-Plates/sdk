import {
  createContext,
  type ReactElement,
  type ReactNode,
  useMemo,
  useState,
} from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import type { PlateInput } from "@/rendering/resolve.ts";
import {
  createPlateQueryClient,
  type PlateQueryClient,
} from "@/react/query.ts";

/** Inherited ledger source and NFT collection. */
export type PlateNetwork = Pick<
  PlateInput,
  "rpcUrl" | "networkConfig" | "nftContractId"
>;
/** Internal context carries configuration, not changing query results. */
export const VanityContext = createContext<PlateNetwork>({});

/** Application-level defaults. Either network or rpcUrl may be supplied. */
export interface VanityProviderProps {
  /** Colibri network for all descendant plates unless overridden locally. */
  network?: PlateInput["networkConfig"];
  /** RPC source with passphrase discovery; do not combine with network. */
  rpcUrl?: string;
  /** Override the network's default NFT collection. */
  nftContractId?: string;
  /** Reuse an application's TanStack cache, including prefetched or hydrated data. */
  queryClient?: PlateQueryClient;
  /** Components sharing this scope. */
  children?: ReactNode;
}

/**
 * Supplies network defaults and one stable query client. No data fetching setup is
 * required in consumers. Create a separate provider/client for each SSR request.
 */
export function VanityProvider(
  { network, rpcUrl, nftContractId, queryClient, children }:
    VanityProviderProps,
): ReactElement {
  const [ownedClient] = useState(createPlateQueryClient);
  const config = useMemo(
    () => ({ networkConfig: network, rpcUrl, nftContractId }),
    [network, rpcUrl, nftContractId],
  );
  return (
    <VanityContext.Provider value={config}>
      <QueryClientProvider client={queryClient ?? ownedClient}>
        {children}
      </QueryClientProvider>
    </VanityContext.Provider>
  );
}
