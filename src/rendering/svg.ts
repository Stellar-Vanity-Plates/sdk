import { type PlateInput, resolvePlateInput } from "@/rendering/resolve.ts";
/** Canonical webapp plate rendering and browser-compatible SVG export. @module */
import { createPlateModel } from "@/rendering/model.ts";
import { escapeMarkup, renderResolvedPlateHtml } from "@/rendering/html.ts";
import { InvalidPlateWidthError, InvalidSvgIdPrefixError } from "@/errors.ts";
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
    throw new InvalidPlateWidthError();
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
 * Fonts and identicons are embedded. Only configured metadata lookup uses the network; no DOM is required.
 * Uses SVG foreignObject, requiring a browser renderer. SVG-only engines such
 * as resvg do not support this format; use the PNG exporter for those consumers.
 */
export async function renderPlateSvg(
  input: PlateInput,
  options: SvgOptions = {},
): Promise<string> {
  const width = plateWidth(options.width ?? 600);
  const id = options.idPrefix ?? `vnty-${input.address}`;
  if (!/^[A-Za-z][A-Za-z0-9_-]{0,127}$/.test(id)) {
    throw new InvalidSvgIdPrefixError();
  }
  const resolved = await resolvePlateInput(input);
  const model = createPlateModel(resolved);
  const { height, plateWidth: innerWidth, padding } = plateImageFrame(width);
  const html = renderResolvedPlateHtml(resolved, { animated: options.animated })
    .replace(
      /<style>([\s\S]*?)<\/style>/g,
      (_match, css: string) => `<style>/*<![CDATA[*/${css}/*]]>*/</style>`,
    );
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="${id}-title" data-kind="${model.kind}" data-rarity="${model.rarity}" data-finish="${model.finish}"><title id="${id}-title">${
    escapeMarkup(model.label)
  } · Stellar ${model.kind} plate · ${model.address}</title><foreignObject width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${innerWidth}px;margin:${padding}px">${html}</div></foreignObject></svg>`;
}
