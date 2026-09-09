// Preserved consumer of public subpaths. Aliases are generated from exports in
// the isolated fixture config, never from repository-private source shortcuts.
import { isPlateAddress, VanityError } from "@consumer/sdk";
import {
  accountDisplay,
  encodeSuffixLength,
  parseSuffixLength,
} from "@consumer/sdk/accounts";
import {
  deriveContractAddress,
  farmContract,
  verifyContractFarmResult,
} from "@consumer/sdk/farming";
import {
  createProtocolClients,
  NftClient,
  type Spec,
} from "@consumer/sdk/contracts";
import {
  createPlateModel,
  renderPlateHtml,
  renderPlateSvg,
} from "@consumer/sdk/rendering";
import { renderPlatePng as browserPng } from "@consumer/sdk/png";
import { renderPlatePng as serverPng } from "@consumer/sdk/png/server";
import { registerVanityPlate } from "@consumer/sdk/web";
import { Plate } from "@consumer/sdk/react";
import { ColibriError, Contract, NetworkConfig, StrKey } from "@colibri/core";
import { Spec as NativeSpec } from "@stellar/stellar-sdk/contract";
import { createElement } from "react";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";

function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const network = NetworkConfig.TestNet();
const salt = new Uint8Array(32);
const address = deriveContractAddress(network.networkPassphrase, account, salt);
const plate = { address, suffix: address.slice(-3) };
ensure(isPlateAddress(address, "contract"), "Contract derivation failed.");
ensure(
  parseSuffixLength(encodeSuffixLength(4)) === 4,
  "ManageData encoding changed.",
);
ensure(
  accountDisplay(account).configured === false,
  "Account fallback changed.",
);
const farmed = await farmContract({
  suffix: address.slice(-1),
  deployer: account,
  networkPassphrase: network.networkPassphrase,
  startSalt: salt,
  maxAttempts: 1,
});
ensure(
  farmed && farmed.address === address && verifyContractFarmResult(farmed),
  "Deterministic one-attempt farming failed.",
);
const clients = createProtocolClients(network, {
  nft: address,
  deployer: address,
  marketplace: address,
  treasury: address,
  rbac: address,
});
ensure(
  clients.nft instanceof NftClient && clients.nft.contract instanceof Contract,
  "Public Colibri identity was duplicated.",
);
const spec: Spec = clients.nft.contract.getSpec();
ensure(spec instanceof NativeSpec, "Native Stellar Spec interop changed.");
ensure(
  new VanityError("VNTY_INVALID_OPTION", "example") instanceof ColibriError,
  "Colibri error identity changed.",
);
ensure(
  createPlateModel(plate).label === plate.suffix,
  "Public plate model changed.",
);
ensure(
  renderPlateHtml(plate).includes(address),
  "Canonical HTML is unavailable.",
);
ensure(
  renderPlateSvg(plate).includes("foreignObject"),
  "SVG renderer is unavailable.",
);
ensure(
  renderToStaticMarkup(createElement(Plate, plate)).includes(address),
  "React SSR failed.",
);
ensure(
  typeof registerVanityPlate === "function" && typeof serverPng === "function",
  "Optional adapters cannot be imported without a DOM.",
);
try {
  await browserPng(plate);
  throw new Error("Browser exporter silently used a server fallback.");
} catch (error) {
  ensure(
    error instanceof VanityError && error.code === "VNTY_RENDER_FAILED",
    "Browser exporter lost its explicit DOM boundary.",
  );
}

// Compile-only contracts: weakening these types makes @ts-expect-error fail.
// This function is never called; no ledger read or invocation is submitted.
export function verifyContractTypes(client: NftClient): void {
  const name: Promise<string> = client.read("name", {});
  const mint: Promise<number> = client.read("mint", { salt });
  void name;
  void mint;
  // @ts-expect-error Method names must remain exact.
  client.read("missing_method", {});
  // @ts-expect-error Salts must remain bytes.
  client.read("mint", { salt: "not bytes" });
  // @ts-expect-error Writes always require explicit transaction configuration.
  client.invoke("mint", { salt });
}
console.log(
  "Isolated public consumer passed: farming, metadata, five clients, native Colibri/Spec identity, SVG, React SSR and adapter boundaries. No ledger access.",
);
