import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Treasury } from "@/contracts/treasury/index.ts";
import { TreasurySpec } from "@/contracts/treasury/constants.ts";
import type { TreasuryMethods } from "@/contracts/types.ts";
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
