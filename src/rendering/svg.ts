/** Canonical webapp plate rendering and browser-compatible SVG export. @module */
import { createPlateModel, type PlateInput } from "@/rendering/model.ts";
import { escapeMarkup, renderPlateHtml } from "@/rendering/html.ts";
import { VanityError } from "@/errors.ts";
/** SVG output settings. */
export interface SvgOptions {
  /** Intrinsic width in pixels, 120–4096. Includes a 32px transparent margin for the shadow. Defaults to 600. */ width?:
    number;
  /** Enables the app's hover effects when SVG is inline. Defaults to false. */ animated?:
    boolean;
  /** Unique accessible title prefix. Defaults to the full address. */ idPrefix?:
    string;
}
/** Validates a rendering width shared by all image exporters. */
export function plateWidth(width: number): number {
  if (!Number.isInteger(width) || width < 120 || width > 4096) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "Plate width must be an integer from 120 to 4096.",
    );
  }
  return width;
}
/** Image bounds preserving the entire canonical plate shadow. */
export function plateImageFrame(width: number): {
  width: number;
  height: number;
  plateWidth: number;
  padding: number;
} {
  plateWidth(width);
  const padding = 32;
  return {
    width,
    height: Math.ceil((width - padding * 2) / 2.9) + padding * 2,
    plateWidth: width - padding * 2,
    padding,
  };
}
/**
 * Exports a self-contained SVG using the same HTML/CSS as the web application.
 * Fonts and identicons are embedded; no network or DOM access is required.
 * Uses SVG foreignObject, requiring a browser renderer. SVG-only engines such
 * as resvg do not support this format; use the PNG exporter for those consumers.
 */
export function renderPlateSvg(
  input: PlateInput,
  options: SvgOptions = {},
): string {
  const model = createPlateModel(input),
    width = plateWidth(options.width ?? 600);
  const id = options.idPrefix ?? `vnty-${model.address}`;
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(id)) {
    throw new VanityError(
      "VNTY_INVALID_OPTION",
      "SVG ID prefixes must start with a letter and contain only letters, digits, hyphens or underscores (128 characters maximum).",
    );
  }
  const { height, plateWidth: innerWidth, padding } = plateImageFrame(width);
  const html = renderPlateHtml(input, { animated: options.animated }).replace(
    /<style>([\s\S]*?)<\/style>/g,
    (_match, css: string) => `<style>/*<![CDATA[*/${css}/*]]>*/</style>`,
  );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title" data-kind="${model.kind}" data-rarity="${model.rarity}" data-finish="${model.finish}"><title id="${id}-title">${
    escapeMarkup(model.label)
  } · Stellar ${model.kind} plate · ${model.address}</title><foreignObject width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${innerWidth}px;margin:${padding}px">${html}</div></foreignObject></svg>`;
}
