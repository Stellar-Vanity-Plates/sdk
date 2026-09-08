/** Export locally. Only output/ is written; no network request is made. */
import { renderPlateSvg } from "../src/rendering/mod.ts";
import { renderPlatePng } from "../src/rendering/png.ts";
import config from "./testnet.json" with { type: "json" };
const plate = { address: config.contracts.nft, suffix: "PLATES" };
await Deno.mkdir("output", { recursive: true });
await Deno.writeTextFile("output/plate.svg", renderPlateSvg(plate));
await Deno.writeFile(
  "output/plate.png",
  await renderPlatePng(plate, { width: 1600 }),
);
console.log("Wrote output/plate.svg and output/plate.png");
