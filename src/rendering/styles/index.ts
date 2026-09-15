/** Shared assets. Emit these strings as CSS at build time, or install once per document. @module */
import { plateStyles } from "@/rendering/vendor/plate-styles.ts";
import { webFonts } from "@/rendering/vendor/web-fonts.ts";
/** Embedded canonical fonts, shared by all plate sizes and variants. */
export const plateFontCss: string = webFonts;
/** Canonical artwork rules without embedded fonts. */
export const plateArtworkCss: string = plateStyles.replaceAll(
  "div.vnty-plate-root",
  ":is(div,span).vnty-plate-root",
);
/** Complete default artwork and fonts; compatible with 0.1 exports. */
export const plateCss: string = webFonts + plateStyles;
/** Optional compact, inline and picker layout rules. Artwork traits remain address-derived. */
export const plateVariantCss: string = `
.vnty-plate-root[data-inline="true"]{display:inline-block;width:10em;vertical-align:middle}
.vnty-plate-root[data-inline="true"] .account-plate-container,.vnty-plate-root[data-inline="true"] .plate-stage{display:block}
.vnty-plate-root[data-variant="compact"] .plate-screw,.vnty-plate-root[data-variant="picker"] .plate-screw{width:5px;height:5px}
.vnty-plate-root[data-variant="picker"] .contract-plate>small,.vnty-plate-root[data-variant="picker"] .account-plate-label{visibility:hidden}
.vnty-plate-root[data-variant="picker"] .contract-plate>code,.vnty-plate-root[data-variant="picker"] .account-plate-address{font-size:8px}
`;

/** One shared stylesheet for display, compact, picker and inline plates, with embedded fonts. */
export const plateSharedCss: string = plateFontCss + plateArtworkCss +
  plateVariantCss;
