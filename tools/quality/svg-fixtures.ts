import manifest from "@tests/fixtures/svg/manifest.json" with { type: "json" };

/** Fixed public inputs and expected traits; tests never invent replacement cases. */
export const svgFixtures = manifest.cases;
export type SvgFixture = typeof svgFixtures[number];
export const svgFixtureDirectory = new URL(
  "../../tests/fixtures/svg/",
  import.meta.url,
);

export function svgFixtureFilename(fixture: SvgFixture): string {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(fixture.id)) {
    throw new Error(`Invalid SVG fixture ID: ${fixture.id}`);
  }
  return `${fixture.id}.svg`;
}

/** Keep failures readable even when a differing SVG embeds hundreds of KB of fonts. */
export function assertSvgFixture(
  actual: string,
  expected: string,
  id: string,
): void {
  if (actual === expected) return;
  let offset = 0;
  while (
    offset < Math.min(actual.length, expected.length) &&
    actual[offset] === expected[offset]
  ) offset++;
  const context = (value: string) =>
    JSON.stringify(value.slice(Math.max(0, offset - 50), offset + 100));
  throw new Error(
    `${id}: SVG differs at character ${offset} (expected ${expected.length}, actual ${actual.length} characters).\n` +
      `Expected: ${context(expected)}\nActual:   ${context(actual)}\n` +
      "Review the renderer change and the saved SVG. Tests never update fixtures; use fixtures:svg:update --accept only for an intentional baseline change.",
  );
}
