import { assert, assertEquals } from "@std/assert";
import config from "@config" with { type: "json" };
import {
  analyzeArchitecture,
  type Manifest,
  readRepository,
} from "@tools/quality/architecture.ts";
import { inspectModule } from "@tools/quality/syntax.ts";

const manifest: Manifest = { ...config, exports: { ".": "./mod.ts" } };
const baseline = () =>
  new Map([
    ["deno.json", "{}"],
    ["README.md", "SDK"],
    ["CONTRIBUTING.md", "Contributing"],
    ["THIRD_PARTY_NOTICES.md", "Notices"],
    ["mod.ts", '/** SDK. @module */\nexport * from "@/validation.ts";'],
    ["src/errors.ts", "export class VanityError {}"],
    [
      "src/validation.ts",
      'import { VanityError } from "@/errors.ts"; export { VanityError };',
    ],
  ]);

Deno.test("architecture: syntax inventory handles every import form without reading comments as code", () => {
  const syntax = inspectModule(
    "src/farming/example.ts",
    `
// import "@tools/not-code.ts";
const explanation = 'throw new Error("not code")';
import "@/side-effect.ts";
import type { A } from "@/types.ts";
export { B } from "@/named.ts";
export * from "@/all.ts";
const lazy = () => import("@/dynamic.ts");
const template = () => import(\`@/template.ts\`);
type C = import("@/import-type.ts").C;
`,
  );
  assertEquals(syntax.imports.map((item) => item.specifier), [
    "@/side-effect.ts",
    "@/types.ts",
    "@/named.ts",
    "@/all.ts",
    "@/dynamic.ts",
    "@/template.ts",
    "@/import-type.ts",
  ]);
  assertEquals(syntax.problems, []);
});

Deno.test("architecture: deliberately invalid packages fail with actionable rule and path evidence", async (test) => {
  assertEquals(analyzeArchitecture(baseline(), manifest), []);
  const cases: {
    name: string;
    file?: string;
    source?: string;
    change?: (config: Manifest) => void;
    rule: string;
  }[] = [
    {
      name: "side-effect dev imports",
      source: 'import "@tools/check-exports.ts";',
      rule: "private-import",
    },
    {
      name: "relative imports",
      source: 'import "./errors.ts";',
      rule: "aliases",
    },
    {
      name: "escaped source aliases",
      source: 'import "@/../README.md";',
      rule: "private-import",
    },
    {
      name: "unresolved aliases",
      source: 'import "@/missing.ts";',
      rule: "resolution",
    },
    {
      name: "dynamic dev imports",
      source: "const load = () => import(`@tests/unit.ts`);",
      rule: "private-import",
    },
    {
      name: "nonliteral dynamic imports",
      source: "const load = (path: string) => import(path);",
      rule: "static-imports",
    },
    {
      name: "type imports obey layers",
      source: 'type A = import("@/rendering/model.ts").PlateInput;',
      rule: "layer-direction",
    },
    {
      name: "foundation cannot use farming",
      source: 'export * from "@/farming/index.ts";',
      rule: "layer-direction",
    },
    {
      name: "SDK implementation cannot import public barrels",
      source: 'import "@/accounts/mod.ts";',
      rule: "internal-barrels",
    },
    {
      name: "farming cannot depend on contracts",
      file: "src/farming/example.ts",
      source: 'import "@/contracts/client.ts";',
      rule: "layer-direction",
    },
    {
      name: "rendering cannot depend on server export",
      file: "src/rendering/model.ts",
      source: 'import "@/rendering/png-server.ts";',
      rule: "layer-direction",
    },
    {
      name: "root entrypoint cannot expose optional React",
      file: "mod.ts",
      source: '/** @module */ export * from "@/react/plate.tsx";',
      rule: "entrypoint-boundary",
    },
    {
      name: "optional package cannot leak into core",
      source: 'import "playwright";',
      rule: "external-boundary",
    },
    {
      name: "Colibri implementation imports",
      source: 'import "@colibri/core/contract/index.ts";',
      rule: "external-boundary",
    },
    {
      name: "external alias substitution",
      change: (value) => {
        value.imports["@colibri/core"] = "npm:unrelated-package@1";
      },
      rule: "package-identity",
    },
    {
      name: "JSX runtime identity",
      change: (value) => {
        value.imports["react/jsx-runtime"] = "npm:react@99/jsx-runtime";
      },
      rule: "package-identity",
    },
    {
      name: "self cycles",
      file: "src/errors.ts",
      source: 'import "@/errors.ts";',
      rule: "cycles",
    },
    {
      name: "transitive cycles",
      file: "src/errors.ts",
      source: 'import "@/validation.ts";',
      rule: "cycles",
    },
    {
      name: "default exports",
      source: "export default class Example {}",
      rule: "named-exports",
    },
    {
      name: "default re-exports",
      source: 'export { VanityError as default } from "@/errors.ts";',
      rule: "named-exports",
    },
    {
      name: "default namespace exports",
      source: 'export * as default from "@/errors.ts";',
      rule: "named-exports",
    },
    {
      name: "CommonJS imports",
      source: 'const value = require("package");',
      rule: "esm-imports",
    },
    {
      name: "TypeScript import equals",
      source: 'import value = require("package");',
      rule: "esm-imports",
    },
    {
      name: "generic errors",
      source: 'export function fail() { throw new Error("oops"); }',
      rule: "typed-errors",
    },
    {
      name: "literal errors",
      source: 'export function fail() { throw "oops"; }',
      rule: "typed-errors",
    },
    {
      name: "barrel implementation",
      file: "mod.ts",
      source: "/** @module */ export const extra = 1;",
      rule: "thin-barrels",
    },
    {
      name: "entrypoint docs",
      file: "mod.ts",
      source: 'export * from "@/errors.ts";',
      rule: "module-docs",
    },
    {
      name: "unknown architecture region",
      file: "src/unknown/example.ts",
      source: "export const value = 1;",
      rule: "layers",
    },
    {
      name: "path naming",
      file: "src/farming/BadName.ts",
      source: "export const value = 1;",
      rule: "naming",
    },
    {
      name: "missing public entrypoint",
      change: (value) => {
        value.exports["./extra"] = "./src/absent.ts";
      },
      rule: "entrypoints",
    },
    {
      name: "core manifest cannot redirect to an optional export",
      change: (value) => {
        value.exports["."] = "./src/rendering/png-server.ts";
      },
      rule: "entrypoints",
    },
    {
      name: "missing core export",
      change: (value) => {
        delete value.exports["."];
      },
      rule: "entrypoints",
    },
    {
      name: "private public entrypoint",
      change: (value) => {
        value.exports["./extra"] = "../tools/tool.ts";
      },
      rule: "entrypoints",
    },
    {
      name: "broad publication globs",
      change: (value) => {
        value.publish.include.push("**/*");
      },
      rule: "publication",
    },
    {
      name: "source test leakage",
      file: "src/validation.test.ts",
      source: 'Deno.test("oops", () => {});',
      rule: "publication",
    },
    {
      name: "focused test option",
      file: "tests/example.test.ts",
      source: 'Deno.test({name:"oops", only:true, fn(){}});',
      rule: "active-tests",
    },
    {
      name: "computed skip option",
      file: "tests/example.test.ts",
      source: 'Deno.test({name:"oops", ["ignore"]:shouldSkip, fn(){}});',
      rule: "active-tests",
    },
    {
      name: "focused BDD call",
      file: "tests/example.test.ts",
      source: 'it.only("oops", () => {});',
      rule: "active-tests",
    },
    {
      name: "empty executable test",
      file: "tests/example.test.ts",
      source: "export const fixture = 1;",
      rule: "test-registration",
    },
    { name: "invalid TypeScript", source: "export function {", rule: "parse" },
  ];
  for (const sample of cases) {
    await test.step(sample.name, () => {
      const files = baseline();
      if (sample.source) {
        files.set(sample.file ?? "src/validation.ts", sample.source);
      }
      const candidate = structuredClone(manifest);
      sample.change?.(candidate);
      const findings = analyzeArchitecture(files, candidate);
      assert(
        findings.some((finding) => finding.rule === sample.rule),
        `${sample.name}: ${JSON.stringify(findings)}`,
      );
      assert(findings.every((finding) => finding.path && finding.line > 0));
    });
  }
});

Deno.test("architecture: explicitly active tests and caller error passthrough remain valid", () => {
  const files = baseline();
  files.set(
    "tests/example.test.ts",
    'Deno.test({name:"active", ignore:false, only:false, fn(){}});',
  );
  files.set(
    "src/errors.ts",
    "export function rethrow(error: unknown) { throw error; }",
  );
  assertEquals(analyzeArchitecture(files, manifest), []);
});

Deno.test("architecture: the complete SDK follows the reviewed dependency, package and test rules", async () => {
  const findings = analyzeArchitecture(await readRepository(), config);
  assertEquals(findings, []);
});
