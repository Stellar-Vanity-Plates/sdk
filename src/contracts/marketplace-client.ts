import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Marketplace } from "@/contracts/marketplace/index.ts";
import { MarketplaceSpec } from "@/contracts/marketplace/constants.ts";
import type { MarketplaceMethods } from "@/contracts/types.ts";
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
