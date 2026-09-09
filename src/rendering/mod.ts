/** Canonical plate rendering and appearance. @module */
export { createPlateModel } from "@/rendering/model.ts";
export type {
  PlateFinish,
  PlateInput,
  PlateModel,
  PlateRarity,
} from "@/rendering/model.ts";
export { plateCss, renderPlateHtml } from "@/rendering/html.ts";
export type { HtmlOptions } from "@/rendering/html.ts";

export { renderPlateSvg } from "@/rendering/svg.ts";
export type { SvgOptions } from "@/rendering/svg.ts";
