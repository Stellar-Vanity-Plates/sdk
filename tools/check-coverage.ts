import { inspectCoverage, publishedSources } from "@tools/quality/coverage.ts";
const path = Deno.args[0] ?? "coverage/lcov.info";
const sources = new Map(
  publishedSources().map((file) => [file, Deno.readTextFileSync(file)]),
);
const { records, failures } = inspectCoverage(
  sources,
  Deno.readTextFileSync(path),
);
for (const kind of ["lines", "branches", "functions"] as const) {
  const [hit, found] = records.reduce(
    ([h, f], record) => [h + record[kind][0], f + record[kind][1]],
    [0, 0],
  );
  console.log(
    `${kind}: ${hit}/${found}${
      found ? ` (${(hit / found * 100).toFixed(2)}%)` : ""
    }`,
  );
}
console.log(
  `Inventoried ${sources.size} published TypeScript files; ${records.length} coverage records.`,
);
if (failures.length) {
  console.error(failures.join("\n"));
  Deno.exitCode = 1;
} else console.log("100% coverage satisfied, with no missing runtime sources.");
