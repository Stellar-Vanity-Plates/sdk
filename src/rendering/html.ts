import { type PlateInput, resolvePlateInput } from "@/rendering/resolve.ts";
import {
  type PlatePresentation,
  renderResolvedPlateHtml,
} from "@/rendering/markup.ts";
export { plateCss } from "@/rendering/styles/index.ts";
export { escapeMarkup, renderResolvedPlateHtml } from "@/rendering/markup.ts";
/** Options for self-contained or shared-style HTML. */
export interface HtmlOptions extends PlatePresentation {
  /** Includes fonts and CSS. Defaults to true; false uses the host's shared stylesheet. */ includeStyles?:
    boolean;
}
/** Resolves on-chain display data when configured, then renders canonical HTML. */
export async function renderPlateHtml(
  input: PlateInput,
  options: HtmlOptions = {},
): Promise<string> {
  const html = renderResolvedPlateHtml(await resolvePlateInput(input), options);
  if (options.includeStyles === false) return html;
  const { plateCss, plateSharedCss } = await import(
    "@/rendering/styles/index.ts"
  );
  const css = options.variant !== undefined || options.inline
    ? plateSharedCss
    : plateCss;
  return `<style>${css}</style>${html}`;
}
