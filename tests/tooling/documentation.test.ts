import { assert, assertEquals } from "@std/assert";
import {
  checkDocumentation,
  inspectDocumentation,
} from "@tools/quality/documentation.ts";

Deno.test("documentation: checked examples, explicit fragments and links are inventoried", () => {
  const result = inspectDocumentation(
    new Map([
      [
        "README.md",
        "<!-- deno-check -->\n```tsx\nexport const view = <div/>;\n```\n[Guide](CONTRIBUTING.md)\n<!-- deno-skip: Fragment needs a caller-owned client. -->\n```ts\nawait client.read();\n```",
      ],
      ["CONTRIBUTING.md", "Contributing"],
    ]),
  );
  assertEquals(result.problems, []);
  assertEquals(result.snippets, [{
    path: "README.md",
    line: 3,
    language: "tsx",
    code: "export const view = <div/>;",
  }]);
});
Deno.test("documentation: unmarked examples, dangling markers, malformed fences and missing links fail", () => {
  for (
    const source of [
      "```ts\nconst x = 1;\n```",
      "<!-- deno-check -->\nProse",
      "<!-- deno-check -->",
      "<!-- deno-check -->\n```ts\nconst x = 1;",
      "[Missing](missing.md)",
      "<!-- deno-check -->\n```sh\ntrue\n```",
    ]
  ) {
    assert(
      inspectDocumentation(new Map([["README.md", source]])).problems.length >
        0,
    );
  }
});
Deno.test("documentation: actual compiler failures retain a failing status and file diagnostics", async () => {
  const root = await Deno.makeTempDir({ prefix: "vanity-doc-test-" });
  try {
    await Deno.writeTextFile(`${root}/deno.json`, "{}");
    await Deno.writeTextFile(
      `${root}/README.md`,
      '<!-- deno-check -->\n```ts\nexport const amount: bigint = "wrong";\n```',
    );
    const failed = await checkDocumentation(root);
    assert(failed.code !== 0);
    assert(failed.diagnostics.includes("README.md-L3.ts"));
    assert(failed.diagnostics.includes("TS2322"));
    await Deno.writeTextFile(
      `${root}/README.md`,
      "<!-- deno-check -->\n```ts\nexport const amount: bigint = 1n;\n```",
    );
    assertEquals((await checkDocumentation(root)).code, 0);
    await Deno.writeTextFile(`${root}/README.md`, "\n[License](LICENSE)\n", {
      append: true,
    });
    assert(
      (await checkDocumentation(root)).diagnostics.includes(
        "Broken local documentation link LICENSE",
      ),
    );
    await Deno.writeTextFile(`${root}/LICENSE`, "MIT License");
    assertEquals((await checkDocumentation(root)).code, 0);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});
