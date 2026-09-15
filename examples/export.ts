/** Export locally. Only output/ is written; no network request is made. */
import { renderPlateSvg } from "@/rendering/index.ts";
import { renderPlatePng } from "@/rendering/png-server.ts";
import config from "@examples/testnet.json" with { type: "json" };
const plate = { address: config.contracts.nft, suffixLength: 6 };
await Deno.mkdir("output", { recursive: true });
await Deno.writeTextFile("output/plate.svg", await renderPlateSvg(plate));
await Deno.writeFile(
  "output/plate.png",
  await renderPlatePng(plate, { width: 1600 }),
);
console.log("Wrote output/plate.svg and output/plate.png");
