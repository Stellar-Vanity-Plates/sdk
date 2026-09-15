import { assertEquals } from "@std/assert";
import { bundleProblems } from "@tools/quality/bundles.ts";
Deno.test("bundle budgets independently reject raw and gzip growth", () => {
  const budget = { name: "consumer", raw: 100, gzip: 50 };
  assertEquals(bundleProblems(budget, { raw: 100, gzip: 50 }), []);
  assertEquals(bundleProblems(budget, { raw: 101, gzip: 50 }), [
    "consumer: raw 101 bytes exceeds 100 bytes",
  ]);
  assertEquals(bundleProblems(budget, { raw: 99, gzip: 51 }), [
    "consumer: gzip 51 bytes exceeds 50 bytes",
  ]);
  assertEquals(bundleProblems(budget, { raw: 101, gzip: 51 }).length, 2);
});
