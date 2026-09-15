import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Rbac } from "@/contracts/rbac/index.ts";
import { RbacSpec } from "@/contracts/rbac/constants.ts";
import type { RbacMethods } from "@/contracts/types.ts";
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
