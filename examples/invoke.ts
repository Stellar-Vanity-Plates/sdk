/** Explicit write example: importing this file does not submit anything. */
import type { NetworkConfig, TransactionConfig } from "@colibri/core";
import { NftClient } from "../src/contracts/mod.ts";
import {
  type ContractFarmResult,
  verifyContractFarmResult,
} from "../src/farming/mod.ts";

/** Reserve an already-farmed address. The configured signer pays the contract's current fee. */
export async function reserveFarmedPlate(
  networkConfig: NetworkConfig,
  nftAddress: string,
  farmed: ContractFarmResult,
  recipient: string,
  config: TransactionConfig,
) {
  if (
    !verifyContractFarmResult(farmed) ||
    farmed.networkPassphrase !== networkConfig.networkPassphrase
  ) throw new Error("Invalid farm result or wrong network.");
  const nft = new NftClient({ networkConfig, contractId: nftAddress });
  const deployer = await nft.read("get_deployer", {});
  if (deployer !== farmed.deployer) {
    throw new Error("This NFT uses a different deployer.");
  }
  // Only the address and suffix are revealed in the reservation transaction.
  return await nft.invoke("reserve", {
    recipient,
    contract_address: farmed.address,
    suffix: farmed.suffix,
  }, { config });
}
