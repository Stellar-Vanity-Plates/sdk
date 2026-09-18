import { StrKey } from "@colibri/core";
import {
  createPlateModel,
  type PlateInput,
  renderPlateSvg,
} from "@/rendering/index.ts";
import { registerVanityPlate } from "@/web/index.ts";
import { farmContract } from "@/farming/index.ts";
import config from "@examples/testnet.json" with { type: "json" };
registerVanityPlate();
const select = document.querySelector<HTMLSelectElement>("#sample")!;
const host = document.querySelector("#featured")!;
const status = document.querySelector<HTMLElement>("#status")!;
const fixtures: PlateInput[] = [{
  address: config.contracts.nft,
  suffixLength: 6,
}];
for (let i = 0; i < 4; i++) {
  const bytes = new Uint8Array(32).fill(40 + i);
  bytes[6] = i;
  bytes[7] = i;
  const address = i % 2 === 0
    ? StrKey.encodeContract(bytes)
    : StrKey.encodeEd25519PublicKey(bytes);
  fixtures.push({ address, ...(i === 3 ? {} : { suffixLength: 5 }) });
}
const names = [
  "Protocol · PLATES",
  "Club badge · contract",
  "Ghost paint · account",
  "Touring stripe · contract",
  "Unconfigured account",
];
for (const [i, name] of names.entries()) {
  const option = new Option(name, String(i));
  select.add(option);
}
function show(): void {
  const input = fixtures[Number(select.value)], model = createPlateModel(input);
  host.replaceChildren();
  const element = document.createElement("vanity-plate");
  element.setAttribute("address", input.address);
  if (input.suffixLength) {
    element.setAttribute("suffix-length", String(input.suffixLength));
  }
  element.setAttribute("animated", "");
  host.append(element);
  document.querySelector("#traits")!.textContent =
    `${model.kind} / ${model.finish} / ${model.lettering} / ${model.rarity}`;
  status.textContent = "Ready · rendered locally";
}
document.querySelector("#apply-custom")!.addEventListener("click", () => {
  const error = document.querySelector("#custom-error")!;
  try {
    const address = document.querySelector<HTMLInputElement>("#custom-address")!
      .value.trim();
    const count =
      document.querySelector<HTMLInputElement>("#custom-suffix-length")!.value;
    const input = { address, suffixLength: count ? Number(count) : undefined };
    createPlateModel(input);
    const index = fixtures.push(input) - 1;
    select.add(
      new Option(`Your address · ${address.slice(-6)}`, String(index)),
    );
    select.value = String(index);
    show();
    error.textContent = "";
  } catch (cause) {
    error.textContent = cause instanceof Error ? cause.message : String(cause);
  }
});
select.addEventListener("change", show);
show();
function download(bytes: BlobPart, type: string, name: string): void {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
document.querySelector("#svg")!.addEventListener(
  "click",
  async () =>
    download(
      await renderPlateSvg(fixtures[Number(select.value)]),
      "image/svg+xml",
      "vanity-plate.svg",
    ),
);
document.querySelector("#png")!.addEventListener("click", async () => {
  try {
    status.textContent = "Rendering PNG…";
    const { renderPlatePng } = await import("@/rendering/png.ts");
    const png = await renderPlatePng(fixtures[Number(select.value)], {
      width: 1600,
    });
    download(png as Uint8Array<ArrayBuffer>, "image/png", "vanity-plate.png");
    status.textContent = `PNG ready · 1600 × ${Math.round(1600 / 2.9)}`;
  } catch (error) {
    status.textContent = String(error);
  }
});
for (const input of fixtures.slice(1, 4)) {
  const card = document.createElement("div");
  card.className = "sample";
  const plate = document.createElement("vanity-plate");
  plate.setAttribute("address", input.address);
  plate.setAttribute("suffix-length", String(input.suffixLength));
  plate.setAttribute("animated", "");
  card.append(plate);
  document.querySelector("#gallery")!.append(card);
}
let controller: AbortController | undefined;
document.querySelector("#stop")!.addEventListener(
  "click",
  () => controller?.abort(),
);
document.querySelector("#farm")!.addEventListener("click", async () => {
  if (controller) return;
  controller = new AbortController();
  const message = document.querySelector("#farm-status")!;
  try {
    const found = await farmContract({
      suffix: document.querySelector<HTMLInputElement>("#suffix")!.value,
      networkPassphrase: config.networkPassphrase,
      deployer: config.contracts.deployer,
      maxAttempts: 20000,
      batchSize: 128,
      signal: controller.signal,
      onProgress: (p) => {
        message.textContent =
          `${p.checked.toLocaleString()} candidates checked locally`;
      },
    });
    message.textContent = found
      ? `Found ${found.address} after ${found.checked} candidates. Demo discards the salt; use the API to retain it.`
      : "Search budget exhausted. Try a shorter ending.";
  } catch (error) {
    message.textContent = error instanceof Error
      ? error.message
      : String(error);
  } finally {
    controller = undefined;
  }
});
document.documentElement.dataset.sdkReady = "true";
