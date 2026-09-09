import postcss from "postcss";
// Independent reference: original app components, not SDK rendering helpers.
import { createElement } from "react";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";
import { ContractPlate } from "@reference/src/browser/contract-plates/ContractPlate.tsx";
import { AccountPlate } from "@reference/src/browser/account-plates/AccountPlate.tsx";
import { ClubhouseContext } from "@reference/src/browser/design-system/ClubhouseTheme.tsx";
import { webFonts } from "@/rendering/vendor/web-fonts.ts";
import type { PlateInput } from "@/rendering/model.ts";
let css = webFonts +
  `*{box-sizing:border-box}body{margin:0;background:transparent}html{--mono:"DM Mono",monospace}`;
for (
  const path of [
    "styles.css",
    "clubhouse.css",
    "showroom/plates.css",
    "showroom/finishes.css",
    "account-plates.css",
  ]
) {
  let content = await Deno.readTextFile(
    new URL(`webapp/public/${path}`, import.meta.url),
  );
  if (path === "showroom/finishes.css") {
    content = content.replaceAll(
      /\.plate-stage(\[data-[^\]]+\])? \.contract-plate/g,
      (_, attr) => `.contract-plate${attr ?? "[data-lettering]"}`,
    );
  }
  if (path.startsWith("showroom/")) {
    content = `html[data-clubhouse-theme] {${content}}`;
  }
  css += content;
}
css +=
  `html,body{margin:0;min-width:0;min-height:0;background:transparent!important}html{--mono:"DM Mono",monospace}`;
function referenceMarkup(input: PlateInput): string {
  const label = input.suffix ??
    (input.suffixLength
      ? input.address.slice(-input.suffixLength)
      : `${input.address.slice(0, 6)}…${input.address.slice(-6)}`);
  const plate = input.address.startsWith("G")
    ? createElement(AccountPlate, { word: label, address: input.address })
    : createElement(
      "div",
      { className: "plate-stage" },
      createElement(ContractPlate, { word: label, address: input.address }),
    );
  return renderToStaticMarkup(
    createElement(ClubhouseContext.Provider, { value: true }, plate),
  );
}
const noMotion =
  "*{animation:none!important;transition:none!important}*::before,*::after{animation:none!important;transition:none!important}";
export function referencePage(
  input: PlateInput,
  width: number,
  animated = false,
): string {
  return `<html data-clubhouse-theme="clubhouse"><style>${css}${
    animated ? "" : noMotion
  }</style><body><div id="capture" style="width:${width}px">${
    referenceMarkup(input)
  }</div></body></html>`;
}
// Original app components and full styles transported through SVG independently
// of the SDK renderer. Match the transport as well as the browser: Canvas and DOM
// rasterization can differ by one antialiasing unit even for identical artwork.
const svgStyles = postcss.parse(css);
svgStyles.walkRules((rule) => {
  rule.selector = rule.selector.replaceAll(
    /(^|[\s>+~,])(html|body)(?=[\s.#[:>+~,]|$)/g,
    (_match, lead, tag) => `${lead}div.reference-${tag}`,
  ).replaceAll(":root", "div.reference-html");
});
export function referenceSvg(input: PlateInput, width: number): string {
  const innerWidth = width - 64;
  const height = Math.ceil(innerWidth / 2.9) + 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="${width}" height="${height}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${innerWidth}px;margin:32px"><style>/*<![CDATA[*/${svgStyles}${noMotion}/*]]>*/</style><div class="reference-html" data-clubhouse-theme="clubhouse"><div class="reference-body">${
    referenceMarkup(input)
  }</div></div></div></foreignObject></svg>`;
}
