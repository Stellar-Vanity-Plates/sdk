import { type ClientOptions, ProtocolClient } from "@/contracts/client.ts";
import { Deployer } from "@/contracts/deployer/index.ts";
import { DeployerSpec } from "@/contracts/deployer/constants.ts";
import type { DeployerMethods } from "@/contracts/types.ts";
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
