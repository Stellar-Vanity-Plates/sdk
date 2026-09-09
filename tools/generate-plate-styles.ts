// Extract plate rules from the independently captured webapp styles, in cascade order.
import postcss from "postcss";
const root = new URL("../tests/reference/webapp/public/", import.meta.url);
const sources = [
  "styles.css",
  "clubhouse.css",
  "showroom/plates.css",
  "showroom/finishes.css",
  "account-plates.css",
];
const selected =
  /\.(?:contract-plate|plate-stage|plate-screw(?:-n[we]|-s[we])?|plate-insignia|account-plate(?:-container|-face|-label|-word|-address|-identicon|-lustre)?|account-identicon-shape)(?![\w-])|\[data-lettering=/;
let css = "";
for (const source of sources) {
  let text = await Deno.readTextFile(new URL(source, root));
  if (source === "showroom/finishes.css") {
    text = text.replaceAll(
      /\.plate-stage(\[data-[^\]]+\])? \.contract-plate/g,
      (_, attribute) => `.contract-plate${attribute ?? "[data-lettering]"}`,
    );
  }
  if (source.startsWith("showroom/")) {
    text = `html[data-clubhouse-theme] {${text}}`;
  }
  const sheet = postcss.parse(text);
  sheet.walkRules((rule) => {
    if (
      rule.parent?.type === "atrule" && rule.parent.name.endsWith("keyframes")
    ) return;
    if (rule.selector === "html[data-clubhouse-theme]") return;
    const selectors = rule.selectors.filter((selector) =>
      selected.test(selector)
    );
    if (!selectors.length) rule.remove();
    else {
      let parent: postcss.Container | postcss.Document | undefined =
        rule.parent;
      let themed = false;
      while (parent) {
        if (
          parent.type === "rule" &&
          (parent as postcss.Rule).selector === "html[data-clubhouse-theme]"
        ) themed = true;
        parent = parent.parent;
      }
      rule.selectors = selectors.map((selector) =>
        themed || selector.includes("html[data-clubhouse-theme]")
          ? selector
          : `:where(.vnty-plate-root) ${selector}`
      );
    }
  });
  sheet.walkComments((comment) => {
    comment.remove();
  });
  const animationValues: string[] = [];
  sheet.walkDecls(/^animation(?:-name)?$/, (declaration) => {
    animationValues.push(declaration.value);
  });
  sheet.walkAtRules(/keyframes$/, (rule) => {
    if (
      !animationValues.some((value) =>
        value.split(/[\s,]+/).includes(rule.params)
      )
    ) rule.remove();
  });
  // Global registrations from other app surfaces must not leak into consumers.
  sheet.walkAtRules("property", (rule) => {
    rule.remove();
  });
  sheet.walkAtRules((rule) => {
    if (rule.nodes?.length === 0) rule.remove();
  });
  css += sheet.toString().replaceAll(
    "html[data-clubhouse-theme]",
    "div.vnty-plate-root",
  ) + "\n";
}
// Scope every rule and preserve the original theme selector's specificity.
css =
  `.vnty-plate-root {--mono:"DM Mono",monospace;line-height:normal;text-align:start;color-scheme:light;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;text-size-adjust:100%;} .vnty-plate-root * {box-sizing:border-box;} ${css}`;
css +=
  `\n.vnty-plate-root[data-animated="false"] *, .vnty-plate-root[data-animated="false"] *::before, .vnty-plate-root[data-animated="false"] *::after {animation:none!important;transition:none!important;}`;
await Deno.writeTextFile(
  "src/rendering/vendor/plate-styles.ts",
  `/** Generated from the pinned webapp; run deno task generate:styles. */\nexport const plateStyles: string = ${
    JSON.stringify(css)
  };\n`,
);
