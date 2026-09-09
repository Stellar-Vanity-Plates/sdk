import { assert, assertEquals } from "@std/assert";
import plugin from "@tools/lint/no-relative-imports.ts";
import config from "@config" with { type: "json" };
async function sources(path: string): Promise<string[]> {
  const result: string[] = [];
  for await (const entry of Deno.readDir(path)) {
    const name = `${path}/${entry.name}`;
    if (entry.isDirectory) result.push(...await sources(name));
    else if (/\.tsx?$/.test(name)) result.push(name);
  }
  return result;
}
Deno.test("Colibri-style aliases reject relative static, dynamic, re-export and type imports", () => {
  const bad = [
    'import {x} from "./x.ts"',
    'export * from "../x.ts"',
    'export {x} from "./x.ts"',
    'await import("./x.ts")',
    'type X = import("./x.ts").X',
    "await import(`../x.ts`)",
  ];
  for (const code of bad) {
    assertEquals(Deno.lint.runPlugin(plugin, "fixture.ts", code).length, 1);
  }
  assertEquals(
    Deno.lint.runPlugin(
      plugin,
      "fixture.ts",
      'import {x} from "@/x.ts";export * from "@colibri/core";',
    ),
    [],
  );
});
Deno.test("published modules have named exports, acyclic dependencies and no test/backend leaks", async () => {
  const graph = new Map<string, string[]>();
  for (const path of await sources("src")) {
    if (path.includes("/vendor/")) continue;
    const text = await Deno.readTextFile(path);
    assert(!/export\s+default\b/.test(text), path);
    const imports = Array.from(
      text.matchAll(/(?:from\s*|import\s*\()\s*["']([^"']+)["']/g),
      (m) => m[1],
    );
    assert(
      imports.every((value) =>
        !value.startsWith(".") &&
        !/^@(tests|reference|tools|examples)\//.test(value)
      ),
      path,
    );
    if (/src\/(accounts|farming|contracts)\//.test(path)) {
      assert(
        imports.every((value) => !/@\/(rendering|web|react)/.test(value)),
        path,
      );
    }
    if (path !== "src/rendering/png-server.ts") {
      assert(!imports.includes("playwright"), path);
    }
    graph.set(
      path,
      imports.filter((value) => value.startsWith("@/")).map((value) =>
        `src/${value.slice(2)}`
      ),
    );
  }
  function visit(path: string, chain: string[]): void {
    assert(
      !chain.includes(path),
      `Dependency cycle: ${[...chain, path].join(" -> ")}`,
    );
    for (const next of graph.get(path) ?? []) visit(next, [...chain, path]);
  }
  for (const path of graph.keys()) visit(path, []);
  for (const path of Object.values(config.exports)) {
    assert((await Deno.stat(path)).isFile, path);
  }
  assertEquals(config.publish.include.includes("tests/"), false);
});
