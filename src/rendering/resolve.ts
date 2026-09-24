import {
  loadAccountConfiguration,
  parseSuffixLength,
} from "@/accounts/index.ts";
import { MissingNftCollectionError } from "@/errors.ts";
import { type NetworkOptions, resolveNetwork } from "@/network.ts";
import { plateKind } from "@/validation.ts";
import type { ResolvedPlateInput } from "@/rendering/model.ts";

/** Bundled collection defaults by network passphrase. Override per input with nftContractId. */
export const NFT_CONTRACT_DEFAULTS: Readonly<
  Record<string, string | undefined>
> = Object.freeze({
  ["Test SDF Network ; September 2015"]:
    "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
  // Mainnet placeholder, requested until the deployment address is available.
  ["Public Global Stellar Network ; September 2015"]: undefined,
});

/** Shared display input for UI components and HTML, SVG and PNG exports. */
export interface PlateInput extends ResolvedPlateInput, NetworkOptions {
  /** Override the NFT collection for the selected network. Ignored for G addresses. */
  nftContractId?: string;
}

/**
 * Network configuration takes precedence over the local suffixLength.
 * G addresses read config.svp.gchar; C addresses read the collection's permanent plate record.
 * Missing/invalid metadata abbreviates. RPC and unexpected contract failures reject.
 * Without a network this is a local count-only input. Never signs or submits.
 */
export async function resolvePlateInput(
  input: PlateInput,
): Promise<ResolvedPlateInput> {
  const kind = plateKind(input.address);
  const networkConfig = await resolveNetwork(input);
  if (!networkConfig) {
    return { address: input.address, suffixLength: input.suffixLength };
  }
  if (kind === "account") {
    const config = await loadAccountConfiguration(input.address, {
      networkConfig,
    });
    return { address: input.address, suffixLength: config.suffixLength };
  }
  const contractId = input.nftContractId ??
    NFT_CONTRACT_DEFAULTS[networkConfig.networkPassphrase];
  if (!contractId) throw new MissingNftCollectionError();
  const [{ NftClient }, { KNOWN_CONTRACT_ERROR_SIMULATION_FAILED }] =
    await Promise.all([
      import("@/contracts/nft-client.ts"),
      import("@colibri/core"),
    ]);
  const nft = new NftClient({ networkConfig, contractId });
  try {
    const plate = await nft.read("get_plate", {
      contract_address: input.address,
    });
    const suffixLength = parseSuffixLength(String(plate.character_count));
    return { address: input.address, suffixLength };
  } catch (error) {
    if (error instanceof KNOWN_CONTRACT_ERROR_SIMULATION_FAILED) {
      const match = error.meta.data.match;
      // Missing plate; never swallow unrelated or nested failures.
      if (
        match.code === 2007 && match.contractId === contractId &&
        match.issuedFrom === "root-invocation"
      ) {
        return { address: input.address };
      }
    }
    throw error;
  }
}
