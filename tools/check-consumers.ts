import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import config from "@config" with { type: "json" };
import {
  analyzeManifest,
  readRepository,
} from "@tools/quality/architecture.ts";
import { packageTargets } from "@tools/quality/policy.ts";

// Preserve only the dependency-cache location in otherwise empty child environments.
const cacheInfo = await new Deno.Command(Deno.execPath(), {
  args: ["info", "--json"],
  stdout: "piped",
  stderr: "inherit",
}).output();
if (!cacheInfo.success) {
  throw new Error("Cannot locate Deno's dependency cache.");
}
const { denoDir } = JSON.parse(new TextDecoder().decode(cacheInfo.stdout)) as {
  denoDir: string;
};
const files = await readRepository();
const problems = analyzeManifest(files, config);
if (problems.length) throw new Error(JSON.stringify(problems, null, 2));
const directory = await Deno.makeTempDir({ prefix: "vanity-sdk-consumer-" });
const artifact = resolve(directory, "package"),
  consumer = resolve(directory, "consumer");
try {
  await Deno.mkdir(artifact);
  await Deno.mkdir(consumer);
  let copied = 0;
  for (const [path, source] of files) {
    if (
      !config.publish.include.some((value) =>
        value.endsWith("/")
          ? path.startsWith(value.replace(/^\.\//, ""))
          : path === value.replace(/^\.\//, "")
      )
    ) continue;
    const target = resolve(artifact, path);
    await Deno.mkdir(resolve(target, ".."), { recursive: true });
    await Deno.writeTextFile(target, source);
    copied++;
  }
  // Only runtime aliases enter the package scope. No tests, tooling, source
  // checkout paths or sibling repositories are available to fill missing files.
  const runtimeImports = Object.fromEntries(
    Object.entries(config.imports).filter(([key]) =>
      key === "@/" || key in packageTargets
    ).map(([key, target]) => [
      key,
      target.startsWith("./")
        ? pathToFileURL(resolve(artifact, target)).href +
          (target.endsWith("/") ? "/" : "")
        : target,
    ]),
  );
  const publicImports = Object.fromEntries(
    Object.entries(config.exports).map((
      [subpath, target],
    ) => [
      `@consumer/sdk${subpath === "." ? "" : subpath.slice(1)}`,
      pathToFileURL(resolve(artifact, target)).href,
    ]),
  );
  const consumerConfig = {
    compilerOptions: config.compilerOptions,
    imports: {
      ...runtimeImports,
      ...publicImports,
      "react-dom/server": config.imports["react-dom/server"],
      "@types/react-dom/server": config.imports["@types/react-dom/server"],
    },
    scopes: { [pathToFileURL(artifact).href + "/"]: runtimeImports },
  };
  await Deno.writeTextFile(
    resolve(consumer, "deno.json"),
    JSON.stringify(consumerConfig, null, 2),
  );
  await Deno.writeTextFile(
    resolve(consumer, "public.ts"),
    await Deno.readTextFile("tests/consumers/public.ts"),
  );
  // An import inventory derived from the manifest prevents new entrypoints from
  // accidentally being omitted by the preserved, behavior-focused consumer.
  await Deno.writeTextFile(
    resolve(consumer, "entrypoints.ts"),
    Object.keys(publicImports).map((name) => `import ${JSON.stringify(name)};`)
      .join("\n"),
  );
  for (
    // A type-only graph can omit runtime packages behind @deno-types (for
    // example React's scheduler). Warm the actual runtime graph before going offline.
    const args of [["cache", "public.ts", "entrypoints.ts"], [
      "check",
      "public.ts",
      "entrypoints.ts",
    ], [
      "run",
      "--cached-only",
      "--deny-net",
      "--allow-read",
      "--allow-env",
      "--allow-sys=homedir,osRelease,cpus",
      "entrypoints.ts",
    ], [
      "run",
      "--cached-only",
      "--deny-net",
      "--allow-read",
      "--allow-env",
      "--allow-sys=homedir,osRelease,cpus",
      "public.ts",
    ]]
  ) {
    const result = await new Deno.Command(Deno.execPath(), {
      cwd: consumer,
      // Playwright inspects several optional environment flags at import time.
      // Give it an empty environment instead of exposing the developer's values.
      clearEnv: true,
      env: { NODE_ENV: "production", DENO_DIR: denoDir, NO_COLOR: "1" },
      args,
      stdin: "null",
      stdout: "inherit",
      stderr: "inherit",
    }).output();
    if (!result.success) {
      throw new Error(
        `Isolated consumer failed: ${args[0]} (exit ${result.code}).`,
      );
    }
  }
  console.log(
    `${
      Object.keys(publicImports).length
    } public entrypoints verified from ${copied} publishable files in an isolated temporary tree. This is a source-package check, not a published JSR/npm artifact.`,
  );
} finally {
  await Deno.remove(directory, { recursive: true });
}
