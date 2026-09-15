import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Nft } from "@/contracts/nft/index.ts";
import { NftSpec } from "@/contracts/nft/constants.ts";
import type { NftMethods } from "@/contracts/types.ts";
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
