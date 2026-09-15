import { posix } from "node:path";
import { inspectModule } from "@tools/quality/syntax.ts";
import {
  dependencies,
  externals,
  layer,
  packageTargets,
} from "@tools/quality/policy.ts";

export interface Manifest {
  name: string;
  exports: Record<string, string>;
  imports: Record<string, string>;
  publish: { include: string[]; exclude?: string[] };
  compilerOptions?: Record<string, unknown>;
}
export interface Finding {
  path: string;
  line: number;
  rule: string;
  message: string;
}
export type Sources = ReadonlyMap<string, string>;

/** Validate package paths without requiring Deno's test-only syntax parser. */
export function analyzeManifest(
  files: Sources,
  config: Manifest,
): Finding[] {
  const findings: Finding[] = [];
  const add = (path: string, rule: string, message: string, line = 1) =>
    findings.push({ path, rule, message, line });
  const published = (path: string) =>
    config.publish.include.some((include) => {
      const value = include.replace(/^\.\//, "");
      return value.endsWith("/") ? path.startsWith(value) : path === value;
    });
  for (
    const required of [
      "index.ts",
      "deno.json",
      "README.md",
      "THIRD_PARTY_NOTICES.md",
    ]
  ) {
    if (!published(required) || !files.has(required)) {
      add("deno.json", "publication", `Missing published file: ${required}`);
    }
  }
  if (config.imports["@/"] !== "./src/") {
    add("deno.json", "aliases", "@/ must point to ./src/.");
  }
  for (const [alias, pattern] of Object.entries(packageTargets)) {
    if (!pattern.test(config.imports[alias] ?? "")) {
      add("deno.json", "package-identity", `Unexpected target for ${alias}.`);
    }
  }
  if (
    config.imports["react/jsx-runtime"] !==
      `${config.imports.react}/jsx-runtime`
  ) {
    add(
      "deno.json",
      "package-identity",
      "React and its JSX runtime must use the same version.",
    );
  }
  if (config.publish.exclude?.length) {
    add(
      "deno.json",
      "publication",
      "Review excluded paths: this package uses an explicit include-only publication inventory.",
    );
  }
  for (const include of config.publish.include) {
    if (
      !/^(?:\.\/)?(?:src\/|index\.ts|deno\.json|[A-Z][A-Z_]*\.md|LICENSE(?:\.txt)?)$/
        .test(include)
    ) {
      add(
        "deno.json",
        "publication",
        `Unreviewed publication path: ${include}`,
      );
    }
    if (
      ![...files.keys()].some((publishedPath) =>
        publishedPath === include.replace(/^\.\//, "") ||
        include.endsWith("/") &&
          publishedPath.startsWith(include.replace(/^\.\//, ""))
      )
    ) {
      add(
        "deno.json",
        "publication",
        `Publication path does not exist: ${include}`,
      );
    }
  }
  if (config.exports["."] !== "./index.ts") {
    add(
      "deno.json",
      "entrypoints",
      "The core entrypoint must remain ./index.ts.",
    );
  }
  for (const [subpath, target] of Object.entries(config.exports)) {
    const expected = subpath === "."
      ? ["./index.ts"]
      : subpath === "./colibri"
      ? ["./src/colibri.ts"]
      : subpath === "./png"
      ? ["./src/rendering/png.ts"]
      : subpath === "./png/server"
      ? ["./src/rendering/png-server.ts"]
      : [
        `./src/${subpath.slice(2)}/index.ts`,
        `./src/${subpath.slice(2)}/index.tsx`,
      ];
    if (!expected.includes(target)) {
      add(
        "deno.json",
        "entrypoints",
        `${subpath} must expose its own entrypoint instead of ${target}.`,
      );
    }
    const path = target.replace(/^\.\//, "");
    if (
      !/^\.(?:\/[a-z0-9/-]+)?$/.test(subpath) || !target.startsWith("./") ||
      path.includes("..") || !/\.tsx?$/.test(path) ||
      /\.test\.tsx?$/.test(path) || !published(path) || !files.has(path)
    ) {
      add(
        "deno.json",
        "entrypoints",
        `Invalid or missing export ${subpath}: ${target}`,
      );
    }
  }
  return findings;
}

/** Inspect every runtime module, including modules unreachable from public exports. */
export function analyzeArchitecture(
  files: Sources,
  config: Manifest,
): Finding[] {
  const findings = analyzeManifest(files, config);
  const add = (path: string, rule: string, message: string, line = 1) =>
    findings.push({ path, rule, message, line });
  const graph = new Map<string, string[]>();
  const entrypoints = new Set(
    Object.values(config.exports).map((value) => value.replace(/^\.\//, "")),
  );
  const published = (path: string) =>
    config.publish.include.some((include) => {
      const value = include.replace(/^\.\//, "");
      return value.endsWith("/") ? path.startsWith(value) : path === value;
    });
  const aliases = Object.keys(config.imports).sort((a, b) =>
    b.length - a.length
  );
  for (const [path, source] of files) {
    const runtime = path === "index.ts" || path === "mod.ts" ||
      path.startsWith("src/");
    if (!runtime || !/\.tsx?$/.test(path)) continue;
    if (path === "mod.ts" || /\/mod\.tsx?$/.test(path)) {
      add(
        path,
        "entrypoint-naming",
        "Use index.ts or index.tsx as the canonical directory entry point.",
      );
      continue;
    }
    if (!published(path)) {
      add(
        path,
        "publication",
        "Runtime module is outside the publication inventory.",
      );
    }
    if (/\.test\.tsx?$/.test(path)) {
      add(path, "publication", "Tests must not be included in runtime source.");
    }
    const area = layer(path);
    if (!area) {
      add(
        path,
        "layers",
        "Classify this runtime module's architectural layer.",
      );
      continue;
    }
    if (
      !path.split("/").every((part) =>
        /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\.(?:ts|tsx))?$/.test(part)
      )
    ) add(path, "naming", "Use kebab-case runtime paths.");
    const syntax = inspectModule(path, source);
    for (const violation of syntax.problems) {
      add(path, violation.rule, violation.message, violation.line);
    }
    if ((area === "entry" || area === "colibri") && !syntax.barrel) {
      add(
        path,
        "thin-barrels",
        "The package root and shared Colibri entrypoint must only re-export named APIs.",
      );
    }
    if (entrypoints.has(path) && !syntax.moduleDoc) {
      add(
        path,
        "module-docs",
        "Public entrypoints need @module documentation.",
      );
    }
    const edges: string[] = [];
    for (const edge of syntax.imports) {
      const { specifier, line } = edge;
      const alias = aliases.find((key) =>
        specifier === key || key.endsWith("/") && specifier.startsWith(key) ||
        /^(npm|jsr):/.test(config.imports[key]) &&
          specifier.startsWith(`${key}/`)
      );
      if (!alias) {
        add(path, "aliases", `Unconfigured import: ${specifier}`, line);
        continue;
      }
      const target = config.imports[alias];
      if (!target.startsWith("./")) {
        if (!(externals[area] ?? []).includes(specifier)) {
          add(
            path,
            "external-boundary",
            `${area} cannot import ${specifier}; use approved public package exports.`,
            line,
          );
        }
        continue;
      }
      const resolved = posix.normalize(target + specifier.slice(alias.length))
        .replace(/^\.\//, "");
      if (!files.has(resolved)) {
        add(
          path,
          "resolution",
          `Missing dependency ${specifier}: ${resolved}`,
          line,
        );
      }
      if (
        !published(resolved) ||
        !(resolved === "index.ts" || resolved.startsWith("src/")) ||
        /\.test\.tsx?$/.test(resolved)
      ) {
        add(
          path,
          "private-import",
          `Runtime cannot depend on ${resolved}.`,
          line,
        );
      }
      const targetLayer = layer(resolved);
      const entryArea = path === "index.ts" ? "foundation" : path.split("/")[1];
      if (area === "entry" && targetLayer !== entryArea) {
        add(
          path,
          "entrypoint-boundary",
          `${path} may only expose its ${entryArea} area; keep optional entrypoints separate.`,
          line,
        );
      }
      if (targetLayer === "entry") {
        add(
          path,
          "internal-barrels",
          `Import implementation modules directly instead of ${resolved}.`,
          line,
        );
      }
      if (!targetLayer || !(dependencies[area] ?? []).includes(targetLayer)) {
        add(
          path,
          "layer-direction",
          `${area} cannot depend on ${targetLayer ?? resolved}.`,
          line,
        );
      }
      edges.push(resolved);
    }
    graph.set(path, edges);
  }
  const visited = new Set<string>(), active = new Set<string>();
  const visit = (path: string, chain: string[]) => {
    if (active.has(path)) {
      add(
        path,
        "cycles",
        [...chain.slice(chain.indexOf(path)), path].join(" -> "),
      );
      return;
    }
    if (visited.has(path)) return;
    visited.add(path);
    active.add(path);
    for (const dependency of graph.get(path) ?? []) {
      visit(dependency, [...chain, path]);
    }
    active.delete(path);
  };
  for (const path of graph.keys()) visit(path, []);
  for (const [path, source] of files) {
    if (
      !path.startsWith("tests/") || path.startsWith("tests/reference/") ||
      !/\.test\.tsx?$/.test(path)
    ) continue;
    const syntax = inspectModule(path, source);
    if (!syntax.registrations) {
      add(
        path,
        "test-registration",
        "Executable test files must register at least one test.",
      );
    }
    for (
      const issue of syntax.problems.filter((value) =>
        ["active-tests", "parse"].includes(value.rule)
      )
    ) add(path, issue.rule, issue.message, issue.line);
  }
  return findings;
}

export async function readRepository(root = "."): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  async function read(path: string): Promise<void> {
    for await (const entry of Deno.readDir(`${root}/${path}`)) {
      const name = path ? `${path}/${entry.name}` : entry.name;
      if (entry.isSymlink) {
        throw new Error(`Symlinks are not package inputs: ${name}`);
      }
      if (entry.isDirectory) {
        if (
          name === "src" || name === "tests" || path.startsWith("src") ||
          path.startsWith("tests") && name !== "tests/reference/webapp"
        ) await read(name);
      } else if (
        entry.isFile &&
        // Golden SVGs embed fonts but are not executable test modules.
        (!path.startsWith("tests/") || /\.(?:tsx?|json)$/.test(name)) &&
        (path ||
          [
            "index.ts",
            "mod.ts",
            "deno.json",
            "README.md",
            "CONTRIBUTING.md",
            "THIRD_PARTY_NOTICES.md",
            "LICENSE",
            "LICENSE.txt",
          ].includes(name))
      ) files.set(name, await Deno.readTextFile(`${root}/${name}`));
    }
  }
  await read("");
  return files;
}
