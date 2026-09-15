import { analyze, lcovReader } from "crap4ts-tool";
import { publishedSources } from "@tools/quality/coverage.ts";
// Same analyzer and strict threshold as Colibri's _tools/check-crap.ts.
const threshold = 15;
const path = Deno.args[0] ?? "coverage/lcov.info";
Deno.statSync(path);
const metrics = analyze(publishedSources(), lcovReader.read(path));
const failures = metrics.filter((metric) =>
  metric.crapScore === null || metric.crapScore > threshold
);
for (const metric of failures) {
  console.error(
    `${metric.file}:${metric.startLine} ${metric.methodName}: CRAP ${
      metric.crapScore ?? "missing coverage"
    }, complexity ${metric.complexity}`,
  );
}
console.log(
  `CRAP: ${metrics.length} functions, maximum ${
    Math.max(...metrics.map((metric) => metric.crapScore ?? Infinity))
  }, threshold ${threshold}.`,
);
if (!metrics.length || failures.length) Deno.exitCode = 1;
