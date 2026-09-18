import {
  createPlateAppearance,
  PLATE_TRAIT_RECIPE as localRecipe,
  renderResolvedPlateHtml,
} from "@consumer/sdk/rendering/local";
import { plateSharedCss } from "@consumer/sdk/rendering/styles";
import { PlateStyles } from "@consumer/sdk/react/styles";
// Preserved consumer of public subpaths. Aliases are generated from exports in
// the isolated fixture config, never from repository-private source shortcuts.
import {
  BrowserDomUnavailableError,
  InvalidPlateWidthError,
  isPlateAddress,
  VANITY_ERRORS,
  VanityError,
  VanityErrorCode,
} from "@consumer/sdk";
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
  NftErrors,
  type Spec,
} from "@consumer/sdk/contracts";
import {
  createPlateModel,
  PLATE_FINISHES,
  PLATE_LETTERINGS,
  PLATE_PALETTE,
  PLATE_RARITIES,
  PLATE_TRAIT_RECIPE,
  renderPlateHtml,
  renderPlateSvg,
} from "@consumer/sdk/rendering";
import { renderPlatePng as browserPng } from "@consumer/sdk/png";
import { renderPlatePng as serverPng } from "@consumer/sdk/png/server";
import { registerVanityPlate } from "@consumer/sdk/web";
import {
  createPlateQueryClient,
  Plate,
  plateQueryOptions,
  usePlate,
  VanityProvider,
} from "@consumer/sdk/react";
import { Nft } from "@consumer/sdk/contracts/nft";
import {
  ColibriError,
  Contract,
  LocalSigner,
  NetworkConfig,
  SorobanType,
  StrKey,
  type TransactionConfig,
} from "@consumer/sdk/colibri";
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
ensure(
  typeof LocalSigner.fromKeypair === "function",
  "Shared signer export missing.",
);
ensure(SorobanType.U32.from(42).value === 42, "Shared value export missing.");
const address = deriveContractAddress(network.networkPassphrase, account, salt);
const plate = { address, suffixLength: 3 };
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
  clients.nft instanceof NftClient &&
    clients.nft.contract instanceof Contract &&
    clients.nft.contract instanceof Nft,
  "Public Colibri identity was duplicated.",
);
ensure(
  Object.keys(NftErrors).length > 0,
  "Generated contract errors are missing.",
);
const spec: Spec = clients.nft.contract.getSpec();
ensure(spec instanceof NativeSpec, "Native Stellar Spec interop changed.");
ensure(
  new InvalidPlateWidthError() instanceof ColibriError &&
    VANITY_ERRORS[VanityErrorCode.INVALID_PLATE_WIDTH] ===
      InvalidPlateWidthError,
  "Colibri error identity changed.",
);
ensure(
  createPlateModel(plate).label === address.slice(-plate.suffixLength),
  "Public plate model changed.",
);
ensure(
  PLATE_TRAIT_RECIPE === localRecipe &&
    createPlateModel(plate).recipeVersion === "svp-1" &&
    PLATE_TRAIT_RECIPE.rarityFirstByte === 9 &&
    PLATE_LETTERINGS.length === 4 && PLATE_FINISHES.length === 4 &&
    PLATE_RARITIES.length === 5 && PLATE_PALETTE.inkSaturation === 80,
  "Canonical recipe definitions are missing from public rendering subpaths.",
);
ensure(
  Object.isFrozen(PLATE_TRAIT_RECIPE) &&
    PLATE_LETTERINGS.every(Object.isFrozen) &&
    PLATE_FINISHES.every(Object.isFrozen) &&
    PLATE_RARITIES.every(Object.isFrozen),
  "Consumers can mutate the shared trait definitions.",
);
ensure(
  (await renderPlateHtml(plate)).includes(address),
  "Canonical HTML is unavailable.",
);
ensure(
  (await renderPlateSvg(plate)).includes("foreignObject"),
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
    error instanceof VanityError &&
      error instanceof BrowserDomUnavailableError &&
      error.code === VanityErrorCode.BROWSER_DOM_UNAVAILABLE,
    "Browser exporter lost its explicit DOM boundary.",
  );
}

// Compile-only contracts: weakening these types makes @ts-expect-error fail.
// This function is never called; no ledger read or invocation is submitted.
export function verifyContractTypes(client: NftClient): void {
  const name: Promise<string> = client.read("name", {});
  const mint: Promise<number> = client.read("mint", { salt });
  const generatedName: Promise<string> = client.contract.name.read();
  const owner: Promise<string> = client.contract.ownerOf.read({ token_id: 42 });
  const config: TransactionConfig = {
    source: account,
    fee: "100",
    timeout: 60,
    signers: [],
  };
  const mintReceipt = client.contract.mint.invoke({
    methodArgs: { salt },
    config,
  });
  const mintedId: Promise<number | undefined> = mintReceipt.then((result) =>
    result.value
  );
  void generatedName;
  void owner;
  void mintedId;
  // @ts-expect-error Generated methods retain exact arguments.
  client.contract.ownerOf.read({ token_id: "wrong" });
  // @ts-expect-error Generated invocation requires explicit configuration.
  client.contract.mint.invoke({ methodArgs: { salt } });
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

// Compile-time count-only boundary for every display adapter.
function countOnlyInputs() {
  // @ts-expect-error Display APIs no longer accept a suffix word.
  renderPlateHtml({ address, suffix: "ABC" });
  // @ts-expect-error The same count-only payload applies to SVG.
  renderPlateSvg({ address, suffix: "ABC" });
  // @ts-expect-error The React component takes a count, not a word.
  Plate({ address, suffix: "ABC" });
}
void countOnlyInputs;

const localHtml = renderResolvedPlateHtml(plate, {
  inline: true,
  variant: "compact",
});
ensure(
  localHtml.startsWith("<span") && !localHtml.includes("<div"),
  "Inline markup is not phrasing content.",
);
ensure(!localHtml.includes("@font-face"), "Local renderer embeds assets.");
ensure(
  createPlateAppearance(address).identiconUrl.startsWith("data:image/svg+xml,"),
  "Missing canonical insignia.",
);
const shared = renderToStaticMarkup(createElement(PlateStyles));
ensure(shared.includes(plateSharedCss), "SSR corrupts the shared stylesheet.");
ensure(
  !renderToStaticMarkup(createElement(Plate, { data: plate })).includes(
    "@font-face",
  ),
  "React duplicates fonts.",
);

const queryClient = createPlateQueryClient();
await queryClient.fetchQuery(plateQueryOptions(plate));
function HookConsumer() {
  const result = usePlate({ data: plate });
  ensure(
    result.status === "success" &&
      result.data?.suffixLength === plate.suffixLength,
    "Explicit hook data is not synchronous.",
  );
  return createElement(Plate, { data: result.data });
}
const queryMarkup = renderToStaticMarkup(
  createElement(VanityProvider, { queryClient }, createElement(HookConsumer)),
);
ensure(
  queryMarkup.includes(address.slice(-3)),
  "Provider/hook public consumer failed.",
);
queryClient.clear();
