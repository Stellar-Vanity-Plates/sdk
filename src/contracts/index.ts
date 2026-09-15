/** Typed clients for the deployed Vanity Plates protocol. @module */
export { createTreasuryAssetClients } from "@/contracts/assets.ts";
export type { TreasuryAssetClients } from "@/contracts/assets.ts";
import type { NetworkConfig } from "@colibri/core";
import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
export { assertCompatibleSpec, ProtocolClient } from "@/contracts/client.ts";
export type {
  ClientOptions,
  InvocationOptions,
  MethodMap,
  Spec,
} from "@/contracts/client.ts";
export * from "@/contracts/types.ts";
import { Nft } from "@/contracts/nft/index.ts";
import { NftSpec } from "@/contracts/nft/constants.ts";
import type { NftMethods } from "@/contracts/types.ts";
export { Nft } from "@/contracts/nft/index.ts";
export { NftErrors, NftSpec } from "@/contracts/nft/constants.ts";
/** SDK facade backed by the Colibri-generated nft client. */
export class NftClient extends ProtocolClient<NftMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Nft;
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      NftSpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Nft(args),
    );
  }
}
import { Deployer } from "@/contracts/deployer/index.ts";
import { DeployerSpec } from "@/contracts/deployer/constants.ts";
import type { DeployerMethods } from "@/contracts/types.ts";
export { Deployer } from "@/contracts/deployer/index.ts";
export {
  DeployerErrors,
  DeployerSpec,
} from "@/contracts/deployer/constants.ts";
/** SDK facade backed by the Colibri-generated deployer client. */
export class DeployerClient extends ProtocolClient<DeployerMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Deployer;
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      DeployerSpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Deployer(args),
    );
  }
}
import { Marketplace } from "@/contracts/marketplace/index.ts";
import { MarketplaceSpec } from "@/contracts/marketplace/constants.ts";
import type { MarketplaceMethods } from "@/contracts/types.ts";
export { Marketplace } from "@/contracts/marketplace/index.ts";
export {
  MarketplaceErrors,
  MarketplaceSpec,
} from "@/contracts/marketplace/constants.ts";
/** SDK facade backed by the Colibri-generated marketplace client. */
export class MarketplaceClient extends ProtocolClient<MarketplaceMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Marketplace;
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      MarketplaceSpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Marketplace(args),
    );
  }
}
import { Treasury } from "@/contracts/treasury/index.ts";
import { TreasurySpec } from "@/contracts/treasury/constants.ts";
import type { TreasuryMethods } from "@/contracts/types.ts";
export { Treasury } from "@/contracts/treasury/index.ts";
export {
  TreasuryErrors,
  TreasurySpec,
} from "@/contracts/treasury/constants.ts";
/** SDK facade backed by the Colibri-generated treasury client. */
export class TreasuryClient extends ProtocolClient<TreasuryMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Treasury;
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      TreasurySpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Treasury(args),
    );
  }
}
import { Rbac } from "@/contracts/rbac/index.ts";
import { RbacSpec } from "@/contracts/rbac/constants.ts";
import type { RbacMethods } from "@/contracts/types.ts";
export { Rbac } from "@/contracts/rbac/index.ts";
export { RbacErrors, RbacSpec } from "@/contracts/rbac/constants.ts";
/** SDK facade backed by the Colibri-generated rbac client. */
export class RbacClient extends ProtocolClient<RbacMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Rbac;
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      RbacSpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Rbac(args),
    );
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
