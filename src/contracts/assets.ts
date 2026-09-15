import {
  Contract,
  type NetworkConfig,
  SEP41TokenContract,
} from "@colibri/core";
import { isPlateAddress } from "@/validation.ts";
import {
  InvalidTreasuryFeeAssetError,
  InvalidTreasuryShareAssetError,
  InvalidTreasuryVaultError,
} from "@/errors.ts";
import type { TreasuryConfig } from "@/contracts/types.ts";

/** Colibri clients for assets and the third-party vault selected by the treasury. */
export interface TreasuryAssetClients {
  /** VNTY share-token reads and explicit signer-backed transfers. */ vnty:
    SEP41TokenContract;
  /** Fee-token client, normally USDC on the selected deployment. */ feeAsset:
    SEP41TokenContract;
  /** Generic DeFindex vault; load its live specification before direct calls. */ vault:
    Contract;
}

/** Creates asset clients from a previously read treasury configuration, without network access. */
export function createTreasuryAssetClients(
  networkConfig: NetworkConfig,
  config: TreasuryConfig,
): TreasuryAssetClients {
  if (!isPlateAddress(config.share_asset, "contract")) {
    throw new InvalidTreasuryShareAssetError();
  }
  if (!isPlateAddress(config.fee_asset, "contract")) {
    throw new InvalidTreasuryFeeAssetError();
  }
  if (!isPlateAddress(config.defindex_vault, "contract")) {
    throw new InvalidTreasuryVaultError();
  }
  return {
    vnty: new SEP41TokenContract({
      networkConfig,
      contractId: config.share_asset as `C${string}`,
    }),
    feeAsset: new SEP41TokenContract({
      networkConfig,
      contractId: config.fee_asset as `C${string}`,
    }),
    vault: new Contract({
      networkConfig,
      contractConfig: { contractId: config.defindex_vault },
    }),
  };
}
