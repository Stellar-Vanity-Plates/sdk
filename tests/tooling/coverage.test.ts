import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { hasRuntime, inspectCoverage } from "@tools/quality/coverage.ts";
const path = "/sdk/src/example.ts";
const sources = new Map([[path, "export function value() { return 1; }"]]);
const report =
  `SF:${path}\nFNF:1\nFNH:1\nLF:1\nLH:1\nBRF:0\nBRH:0\nend_of_record\n`;
describe("coverage gate", () => {
  it("accepts exact coverage and distinguishes type modules from runtime barrels", () => {
    assertEquals(inspectCoverage(sources, report).failures, []);
    assertEquals(
      hasRuntime("export interface A {id:string}; export type B = A;", path),
      false,
    );
    assertEquals(hasRuntime('export { x } from "./other.ts";', path), true);
    assertEquals(hasRuntime("export enum E { A }", path), true);
  });
  it("fails closed on missing sources, suppressed coverage and corrupt reports", () => {
    for (
      const lcov of [
        "",
        report.replace("LH:1", "LH:0"),
        report.replace("FNH:1", "FNH:0"),
        report.replace("BRF:0", "BRF:1"),
        report.replace("FNF:1", ""),
        report.replace("LH:1", "LH:2"),
        report.replace("LF:1\nLH:1", "LF:0\nLH:0"),
        report + report,
        report.replace(path, "/sdk/unexpected.ts"),
      ]
    ) {
      assert(inspectCoverage(sources, lcov).failures.length > 0, lcov);
    }
    assert(
      inspectCoverage(
        new Map([...sources, ["/sdk/missing.ts", "export const v=1;"]]),
        report,
      ).failures.some((f) => f.includes("missing.ts")),
    );
    assert(
      inspectCoverage(
        new Map([[path, "// deno-coverage-ignore-file\nexport const x=1;"]]),
        report,
      ).failures.some((f) => f.includes("suppression")),
    );
  });
});
