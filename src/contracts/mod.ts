/** Typed clients for the deployed Vanity Plates protocol. @module */
export { createTreasuryAssetClients } from "@/contracts/assets.ts";
export type { TreasuryAssetClients } from "@/contracts/assets.ts";
import type { NetworkConfig } from "@colibri/core";
import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
export { assertCompatibleSpec, ProtocolClient } from "@/contracts/client.ts";
export type {
  ClientOptions,
  InvocationOptions,
  Spec,
} from "@/contracts/client.ts";
import nftSpec from "@/contracts/specs/nft.json" with { type: "json" };
import type { NftMethods } from "@/contracts/generated/nft.ts";
export type * from "@/contracts/generated/nft.ts";
/** Typed Colibri client for the nft contract. */
export class NftClient extends ProtocolClient<NftMethods> {
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(options, nftSpec.entries);
  }
}
import deployerSpec from "@/contracts/specs/deployer.json" with {
  type: "json",
};
import type { DeployerMethods } from "@/contracts/generated/deployer.ts";
export type * from "@/contracts/generated/deployer.ts";
/** Typed Colibri client for the deployer contract. */
export class DeployerClient extends ProtocolClient<DeployerMethods> {
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(options, deployerSpec.entries);
  }
}
import marketplaceSpec from "@/contracts/specs/marketplace.json" with {
  type: "json",
};
import type { MarketplaceMethods } from "@/contracts/generated/marketplace.ts";
export type * from "@/contracts/generated/marketplace.ts";
/** Typed Colibri client for the marketplace contract. */
export class MarketplaceClient extends ProtocolClient<MarketplaceMethods> {
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(options, marketplaceSpec.entries);
  }
}
import treasurySpec from "@/contracts/specs/treasury.json" with {
  type: "json",
};
import type { TreasuryMethods } from "@/contracts/generated/treasury.ts";
export type * from "@/contracts/generated/treasury.ts";
/** Typed Colibri client for the treasury contract. */
export class TreasuryClient extends ProtocolClient<TreasuryMethods> {
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(options, treasurySpec.entries);
  }
}
import rbacSpec from "@/contracts/specs/rbac.json" with { type: "json" };
import type { RbacMethods } from "@/contracts/generated/rbac.ts";
export type * from "@/contracts/generated/rbac.ts";
/** Typed Colibri client for the rbac contract. */
export class RbacClient extends ProtocolClient<RbacMethods> {
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(options, rbacSpec.entries);
  }
}
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
