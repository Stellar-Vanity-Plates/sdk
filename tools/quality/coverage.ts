import { resolve } from "node:path";
import ts from "typescript";
import config from "@config" with { type: "json" };

/** Inventory the publication, including generated clients and vendored runtime code. */
export function publishedSources(root = Deno.cwd()): string[] {
  function collect(path: string): string[] {
    const info = Deno.statSync(path);
    if (info.isDirectory) {
      return [...Deno.readDirSync(path)].flatMap((entry) =>
        collect(resolve(path, entry.name))
      );
    }
    return /\.tsx?$/.test(path) && !path.endsWith(".d.ts") ? [path] : [];
  }
  return config.publish.include.flatMap((path) => collect(resolve(root, path)))
    .sort();
}

/** Type-only modules have no executable statements to cover. Barrels do. */
export function hasRuntime(source: string, fileName: string): boolean {
  const { outputText } = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      removeComments: true,
    },
  });
  const parsed = ts.createSourceFile(
    fileName,
    outputText,
    ts.ScriptTarget.ESNext,
    true,
  );
  return parsed.statements.some((statement) =>
    !ts.isEmptyStatement(statement) &&
    !(ts.isExportDeclaration(statement) && !statement.moduleSpecifier &&
      statement.exportClause && ts.isNamedExports(statement.exportClause) &&
      statement.exportClause.elements.length === 0)
  );
}

export interface CoverageRecord {
  file: string;
  lines: [number, number];
  branches: [number, number];
  functions: [number, number];
}
/** Missing or corrupt records fail; a rounded 100% is insufficient. */
export function inspectCoverage(
  sources: ReadonlyMap<string, string>,
  lcov: string,
): { records: CoverageRecord[]; failures: string[] } {
  const records: CoverageRecord[] = [];
  const failures: string[] = [];
  const seen = new Set<string>();
  for (const block of lcov.split("end_of_record")) {
    const file = /^SF:(.+)$/m.exec(block)?.[1];
    if (!file) continue;
    const path = resolve(file);
    if (!sources.has(path)) {
      failures.push(`Unexpected source in coverage: ${file}`);
      continue;
    }
    if (seen.has(path)) failures.push(`Duplicate coverage record: ${file}`);
    seen.add(path);
    const metric = (found: string, hit: string): [number, number] => {
      const f = new RegExp(`^${found}:(\\d+)$`, "m").exec(block);
      const h = new RegExp(`^${hit}:(\\d+)$`, "m").exec(block);
      if (!f || !h || Number(h[1]) > Number(f[1])) {
        failures.push(`Invalid ${found}/${hit} counters: ${file}`);
        return [0, 0];
      }
      const counts: [number, number] = [Number(h[1]), Number(f[1])];
      if (counts[0] !== counts[1]) {
        failures.push(
          `${file}: ${hit} ${counts[0]}/${counts[1]} (requires 100%)`,
        );
      }
      return counts;
    };
    const record = {
      file: path,
      lines: metric("LF", "LH"),
      branches: metric("BRF", "BRH"),
      functions: metric("FNF", "FNH"),
    };
    if (record.lines[1] === 0 && hasRuntime(sources.get(path)!, path)) {
      failures.push(`Empty runtime coverage: ${file}`);
    }
    records.push(record);
  }
  for (const [file, source] of sources) {
    if (/(?:deno-coverage-ignore|[cv]8 ignore|istanbul ignore)/i.test(source)) {
      failures.push(`Coverage suppression is forbidden: ${file}`);
    }
    if (hasRuntime(source, file) && !seen.has(file)) {
      failures.push(`Runtime source missing from coverage: ${file}`);
    }
  }
  if (!records.length) failures.push("No SDK coverage records");
  return { records, failures };
}
