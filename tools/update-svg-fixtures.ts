import { renderPlateSvg } from "@/rendering/svg.ts";
import {
  svgFixtureDirectory,
  svgFixtureFilename,
  svgFixtures,
} from "@tools/quality/svg-fixtures.ts";

if (Deno.args.length !== 1 || Deno.args[0] !== "--accept") {
  console.error(
    "Usage: deno task fixtures:svg:update --accept\nThis deliberately replaces the saved SVG baselines. Review the manifest and renderer diff first; CI never runs this command.",
  );
  Deno.exit(1);
}
let bytes = 0;
for (const fixture of svgFixtures) {
  const svg = await renderPlateSvg(fixture.input, fixture.options);
  await Deno.writeTextFile(
    new URL(svgFixtureFilename(fixture), svgFixtureDirectory),
    svg,
  );
  bytes += new TextEncoder().encode(svg).length;
}
console.log(
  `Wrote ${svgFixtures.length} SVG baselines (${
    (bytes / 1_000_000).toFixed(1)
  } MB). Review the SVG diff and run test:svg and test:browser before accepting this baseline.`,
);
