import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Nft } from "@/contracts/nft/index.ts";
import { NftSpec } from "@/contracts/nft/constants.ts";
import { addressToTokenId } from "@/token-id.ts";
import type { Plate } from "@/contracts/nft/types.ts";
import type { NftMethods } from "@/contracts/types.ts";
/** SDK facade backed by the Colibri-generated nft client. */
export class NftClient extends ProtocolClient<NftMethods> {
  /** Generated client with typed method helpers, errors, events and Core pipelines. */
  declare readonly contract: Nft;
  /** Loads active, consumed or self-registered metadata directly by C address. */
  getPlate(address: string): Promise<Plate> {
    addressToTokenId(address);
    return this.read("get_plate", { contract_address: address });
  }
  /** Loads the current NFT owner by C address; consumed records reject per SEP-50. */
  ownerOf(address: string): Promise<string> {
    return this.read("owner_of", { token_id: addressToTokenId(address) });
  }
  /** Creates a client without issuing any network request. */
  constructor(options: ClientOptions) {
    super(
      options,
      NftSpec.entries.map((entry) => entry.toXdr("base64")),
      (args) => new Nft(args),
    );
  }
}
