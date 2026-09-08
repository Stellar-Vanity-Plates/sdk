/** Read-only Testnet smoke test. No signer, funding or submission. */
import { NetworkConfig } from "@colibri/core";
import {
  createProtocolClients,
  createTreasuryAssetClients,
} from "../src/contracts/mod.ts";
import { deriveContractAddress } from "../src/farming/mod.ts";
import config from "./testnet.json" with { type: "json" };
const network = NetworkConfig.CustomNet({
  networkPassphrase: config.networkPassphrase,
  rpcUrl: config.rpcUrl,
});
const clients = createProtocolClients(network, config.contracts);
const results = await Promise.allSettled([
  clients.nft.read("get_deployer", {}),
  clients.deployer.read("get_predicted_address", { salt: new Uint8Array(32) }),
  clients.marketplace.read("get_config", {}),
  clients.treasury.read("get_config", {}),
  clients.rbac.read("get_role", { role: { tag: "Admin" } }),
]);
let failed = false;
for (const [i, result] of results.entries()) {
  const name = Object.keys(clients)[i];
  if (result.status === "rejected") {
    console.error(`${name}: failed`, result.reason);
    failed = true;
  } else console.log(`${name}: read OK`);
}
if (
  results[1].status === "fulfilled" &&
  results[1].value !==
    deriveContractAddress(
      config.networkPassphrase,
      config.contracts.deployer,
      new Uint8Array(32),
    )
) throw new Error("Local and deployed C derivation disagree.");
if (failed) Deno.exit(1);
console.log(
  "All five live interfaces match; local C derivation matches the deployed contract.",
);

const assets = createTreasuryAssetClients(
  network,
  await clients.treasury.read("get_config", {}),
);
const [shareSymbol, feeSymbol] = await Promise.all([
  assets.vnty.symbol(),
  assets.feeAsset.symbol(),
  assets.vault.loadSpecFromNetwork(),
]);
console.log(
  `Asset reads OK: ${shareSymbol}, ${feeSymbol}; vault specification loaded.`,
);
