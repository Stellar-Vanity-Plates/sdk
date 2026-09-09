import { assertEquals } from "@std/assert";
import plugin from "@tools/lint/no-relative-imports.ts";
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
