/** Measure complete production browser bundles through public exports, with fixed regression budgets. */
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import config from "@config" with { type: "json" };
import { bundleProbes, bundleProblems } from "@tools/quality/bundles.ts";
const root = Deno.cwd();
const directory = await Deno.makeTempDir({ prefix: "vanity-sdk-bundles-" });
try {
  const results = [];
  for (const probe of bundleProbes) {
    const target = config.exports[probe.entry];
    const input = resolve(directory, `${probe.name}.ts`);
    const output = resolve(directory, `${probe.name}.js`);
    await Deno.writeTextFile(
      input,
      `export { ${probe.symbol} } from ${
        JSON.stringify(pathToFileURL(resolve(root, target)).href)
      };`,
    );
    const build = await new Deno.Command(Deno.execPath(), {
      args: [
        "bundle",
        "--config",
        resolve(root, "deno.json"),
        "--frozen-lockfile",
        "--platform",
        "browser",
        "--minify",
        "--sourcemap=external",
        "--output",
        output,
        input,
      ],
      stdout: "piped",
      stderr: "piped",
    }).output();
    if (!build.success) throw new Error(new TextDecoder().decode(build.stderr));
    const bytes = await Deno.readFile(output);
    const sizes = {
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
    };
    const problems = bundleProblems(probe, sizes);
    results.push({ name: probe.name, entry: probe.entry, ...sizes });
    if (problems.length) throw new Error(problems.join("\n"));
  }
  await Deno.mkdir("output", { recursive: true });
  const report = {
    runtime: Deno.version,
    mode:
      "complete single-file minified browser bundle; external source map excluded; gzip level 9",
    bundles: results,
  };
  await Deno.writeTextFile(
    "output/bundle-sizes.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await Deno.remove(directory, { recursive: true });
}
