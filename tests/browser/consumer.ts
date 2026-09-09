import { registerVanityPlate } from "@/web/mod.ts";
import { renderPlateHtml, renderPlateSvg } from "@/rendering/mod.ts";
import { renderPlatePng } from "@/rendering/png.ts";
registerVanityPlate();
Object.assign(globalThis, {
  sdkTest: { renderPlateHtml, renderPlateSvg, renderPlatePng },
});
