/** Typed clients for the deployed Vanity Plates protocol. @module */
export { createTreasuryAssetClients } from "@/contracts/assets.ts";
export type { TreasuryAssetClients } from "@/contracts/assets.ts";
import type { NetworkConfig } from "@colibri/core";
export { assertCompatibleSpec, ProtocolClient } from "@/contracts/client.ts";
export type {
  ClientOptions,
  InvocationOptions,
  MethodMap,
  Spec,
} from "@/contracts/client.ts";
export * from "@/contracts/types.ts";
export { Nft } from "@/contracts/nft/index.ts";
export { NftErrors, NftSpec } from "@/contracts/nft/constants.ts";
export { NftClient } from "@/contracts/nft-client.ts";
import { NftClient } from "@/contracts/nft-client.ts";
export { Deployer } from "@/contracts/deployer/index.ts";
export {
  DeployerErrors,
  DeployerSpec,
} from "@/contracts/deployer/constants.ts";
export { DeployerClient } from "@/contracts/deployer-client.ts";
import { DeployerClient } from "@/contracts/deployer-client.ts";
export { Marketplace } from "@/contracts/marketplace/index.ts";
export {
  MarketplaceErrors,
  MarketplaceSpec,
} from "@/contracts/marketplace/constants.ts";
export { MarketplaceClient } from "@/contracts/marketplace-client.ts";
import { MarketplaceClient } from "@/contracts/marketplace-client.ts";
export { Treasury } from "@/contracts/treasury/index.ts";
export {
  TreasuryErrors,
  TreasurySpec,
} from "@/contracts/treasury/constants.ts";
export { TreasuryClient } from "@/contracts/treasury-client.ts";
import { TreasuryClient } from "@/contracts/treasury-client.ts";
export { Rbac } from "@/contracts/rbac/index.ts";
export { RbacErrors, RbacSpec } from "@/contracts/rbac/constants.ts";
export { RbacClient } from "@/contracts/rbac-client.ts";
import { RbacClient } from "@/contracts/rbac-client.ts";
/** Addresses for one explicit protocol deployment. */
export interface ProtocolAddresses {
  /** Vanity NFT contract. */ nft: string;
  /** Address redemption and deployment contract. */ deployer: string;
  /** Secondary marketplace contract. */ marketplace: string;
  /** Protocol treasury and VNTY accounting contract. */ treasury: string;
  /** Role-based access control contract. */ rbac: string;
}
/** All protocol clients sharing a network. */
export interface ProtocolClients {
  /** Vanity NFT methods. */ nft: NftClient;
  /** Deployment methods. */ deployer: DeployerClient;
  /** Marketplace methods. */ marketplace: MarketplaceClient;
  /** Treasury and vault integration methods. */ treasury: TreasuryClient;
  /** Role administration methods. */ rbac: RbacClient;
}
/** Creates all clients without network access; reads and writes initialize lazily. */
export function createProtocolClients(
  networkConfig: NetworkConfig,
  addresses: ProtocolAddresses,
): ProtocolClients {
  return {
    nft: new NftClient({ networkConfig, contractId: addresses.nft }),
    deployer: new DeployerClient({
      networkConfig,
      contractId: addresses.deployer,
    }),
    marketplace: new MarketplaceClient({
      networkConfig,
      contractId: addresses.marketplace,
    }),
    treasury: new TreasuryClient({
      networkConfig,
      contractId: addresses.treasury,
    }),
    rbac: new RbacClient({ networkConfig, contractId: addresses.rbac }),
  };
}
