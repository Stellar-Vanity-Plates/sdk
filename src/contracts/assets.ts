import {
  Contract,
  type NetworkConfig,
  SEP41TokenContract,
} from "@colibri/core";
import { isPlateAddress } from "../validation.ts";
import { VanityError } from "../errors.ts";
import type { TreasuryConfig } from "./generated/treasury.ts";

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
  for (
    const address of [
      config.share_asset,
      config.fee_asset,
      config.defindex_vault,
    ]
  ) {
    if (!isPlateAddress(address, "contract")) {
      throw new VanityError(
        "VNTY_INVALID_ADDRESS",
        "Treasury assets and vault must be valid C addresses.",
      );
    }
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
