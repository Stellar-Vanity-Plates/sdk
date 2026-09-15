/** Canonical plate rendering and appearance. @module */
export { createPlateModel } from "@/rendering/model.ts";
export type {
  PlateFinish,
  PlateModel,
  PlateRarity,
  ResolvedPlateInput,
} from "@/rendering/model.ts";
export { plateCss, renderPlateHtml } from "@/rendering/html.ts";
export type { HtmlOptions } from "@/rendering/html.ts";

export { renderPlateSvg } from "@/rendering/svg.ts";
export type { SvgOptions } from "@/rendering/svg.ts";
export {
  NFT_CONTRACT_DEFAULTS,
  resolvePlateInput,
} from "@/rendering/resolve.ts";
export type { PlateInput } from "@/rendering/resolve.ts";
