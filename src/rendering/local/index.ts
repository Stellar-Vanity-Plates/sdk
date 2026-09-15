/** Offline synchronous rendering. No network lookup, font assets or framework dependencies. @module */
export { createPlateModel } from "@/rendering/model.ts";
export type {
  PlateFinish,
  PlateModel,
  PlateRarity,
  ResolvedPlateInput,
} from "@/rendering/model.ts";
export { createPlateAppearance } from "@/rendering/appearance.ts";
export type { PlateAppearance } from "@/rendering/appearance.ts";
export { renderResolvedPlateHtml } from "@/rendering/markup.ts";
export type { PlatePresentation } from "@/rendering/markup.ts";
