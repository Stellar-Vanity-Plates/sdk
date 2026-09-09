import { assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("SVG update command refuses implicit or ambiguous baseline rewrites", async () => {
  for (const args of [[], ["--update"], ["--accept", "extra"]]) {
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["run", "tools/update-svg-fixtures.ts", ...args],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(result.code, 1);
    assertEquals(result.stdout.length, 0);
    assertStringIncludes(
      new TextDecoder().decode(result.stderr),
      "Usage: deno task fixtures:svg:update --accept",
    );
  }
});
