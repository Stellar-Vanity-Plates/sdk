import { assert, assertEquals, assertThrows } from "@std/assert";
import { createPlateModel } from "@/rendering/model.ts";
import { renderPlateSvg } from "@/rendering/svg.ts";
import {
  assertSvgFixture,
  svgFixtureDirectory,
  svgFixtureFilename,
  svgFixtures,
} from "@tools/quality/svg-fixtures.ts";

Deno.test("SVG fixture inventory covers every named visual combination and has no missing or orphaned files", async () => {
  const names = svgFixtures.map(svgFixtureFilename);
  assertEquals(new Set(names).size, names.length, "Fixture IDs must be unique");
  const files: string[] = [];
  for await (const file of Deno.readDir(svgFixtureDirectory)) {
    if (file.name.endsWith(".svg")) {
      assert(file.isFile && !file.isSymlink, file.name);
      files.push(file.name);
    }
  }
  assertEquals(
    files.sort(),
    names.toSorted(),
    "Missing or orphaned SVG baseline",
  );
  const combinations: string[] = [];
  for (const kind of ["account", "contract"]) {
    for (const finish of ["badge", "watermark", "sideband", "pattern"]) {
      for (
        const lettering of kind === "account"
          ? ["rally", "coach", "mono"]
          : ["mono", "rally", "coach", "slab"]
      ) {
        for (
          const rarity of ["standard", "registered", "foil", "aurora", "pole"]
        ) {
          combinations.push(`${kind}-${finish}-${lettering}-${rarity}`);
        }
      }
    }
  }
  assertEquals(
    svgFixtures.filter((fixture) => fixture.coverage === "traits").map(
      (fixture) => {
        const { kind, finish, lettering, rarity } = createPlateModel(
          fixture.input,
        );
        const derived = `${kind}-${finish}-${lettering}-${rarity}`;
        assertEquals(
          derived,
          fixture.id,
          "Fixture name must match derived traits",
        );
        return derived;
      },
    ).sort(),
    combinations.sort(),
  );
  // Independently require the supported display/serialization boundaries too.
  for (const kind of ["account", "contract"]) {
    for (
      const edge of [
        "suffix-1",
        "suffix-55",
        "lowercase-suffix",
        "width-120",
        "width-320",
        "width-4096",
        "animated",
        "custom-id",
      ]
    ) {
      assert(names.includes(`${kind}-${edge}.svg`), `Missing ${kind} ${edge}`);
    }
  }
  const unconfigured = svgFixtures.filter((fixture) =>
    fixture.id.endsWith("-unconfigured")
  );
  assertEquals(
    unconfigured.map((fixture) => {
      const { kind, finish, lettering, configured } = createPlateModel(
        fixture.input,
      );
      assertEquals(configured, false);
      const derived = `${kind}-${finish}-${lettering}-unconfigured`;
      assertEquals(
        derived,
        fixture.id,
        "Fallback name must match derived traits",
      );
      return derived;
    }).sort(),
    ["badge", "watermark", "sideband", "pattern"].flatMap((finish) =>
      ["rally", "coach", "mono"].map((lettering) =>
        `account-${finish}-${lettering}-unconfigured`
      )
    ).sort(),
  );
  for (const length of [0, 5, 56]) {
    assert(names.includes(`account-metadata-${length}.svg`));
  }
});

Deno.test("fresh SVG generation matches every saved baseline exactly, including fonts, styles and accessible labels", async (test) => {
  for (const fixture of svgFixtures) {
    await test.step(fixture.id, async () => {
      const model = createPlateModel(fixture.input);
      const { kind, finish, lettering, rarity, configured, label } = model;
      assertEquals(
        { kind, finish, lettering, rarity, configured, label },
        fixture.expected,
        "The address must actually produce the traits named by this fixture",
      );
      const expected = await Deno.readTextFile(
        new URL(svgFixtureFilename(fixture), svgFixtureDirectory),
      );
      assertSvgFixture(
        await renderPlateSvg(fixture.input, fixture.options),
        expected,
        fixture.id,
      );
    });
  }
  console.log(
    `${svgFixtures.length} complete SVG files match byte-for-byte; 140 visual combinations and 31 display/export edge cases.`,
  );
});

Deno.test("SVG baseline comparison rejects changed dimensions and embedded styles with concise diagnostics", async () => {
  const fixture = svgFixtures[0];
  const expected = await Deno.readTextFile(
    new URL(svgFixtureFilename(fixture), svgFixtureDirectory),
  );
  const changedWidth = await renderPlateSvg(fixture.input, { width: 320 });
  const error = assertThrows(
    () => assertSvgFixture(changedWidth, expected, fixture.id),
    Error,
    fixture.id,
  );
  assert(
    error.message.length < 1000,
    "Do not dump embedded fonts into CI logs",
  );
  assertThrows(
    () =>
      assertSvgFixture(
        expected.replace("<style>", "<style>svg{opacity:0.5}"),
        expected,
        fixture.id,
      ),
    Error,
    "SVG differs",
  );
});
