import { posix, resolve } from "node:path";

export interface Snippet {
  path: string;
  line: number;
  language: string;
  code: string;
}
export interface DocumentationInventory {
  snippets: Snippet[];
  problems: string[];
}

/** Complete TypeScript examples must be checked; fragments need an explicit reason. */
export function inspectDocumentation(
  files: ReadonlyMap<string, string>,
): DocumentationInventory {
  const snippets: Snippet[] = [], problems: string[] = [];
  for (const [path, source] of files) {
    const lines = source.split("\n");
    let marker = "",
      language: string | undefined,
      start = 0,
      code: string[] = [];
    const prose: string[] = [];
    for (const [index, line] of lines.entries()) {
      if (language !== undefined) {
        if (/^```\s*$/.test(line)) {
          if (["ts", "tsx", "typescript"].includes(language)) {
            if (marker === "deno-check") {
              snippets.push({
                path,
                line: start + 1,
                language,
                code: code.join("\n"),
              });
            } else if (!/^deno-skip: .+/.test(marker)) {
              problems.push(
                `${path}:${start}: Mark complete examples with deno-check or explain a deno-skip fragment.`,
              );
            }
          } else if (marker) {
            problems.push(
              `${path}:${start}: Check marker requires a TypeScript fence.`,
            );
          }
          language = undefined;
          marker = "";
          code = [];
        } else code.push(line);
      } else if (/^<!-- (deno-check|deno-skip: .+) -->$/.test(line)) {
        if (marker) problems.push(`${path}:${index + 1}: Unused check marker.`);
        marker = line.slice(5, -4);
      } else if (/^```(\w*)\s*$/.test(line)) {
        language = line.match(/^```(\w*)/)![1];
        start = index + 1;
      } else {
        if (marker && line.trim()) {
          problems.push(
            `${path}:${
              index + 1
            }: Check marker must immediately precede a fence.`,
          );
          marker = "";
        }
        prose.push(line);
      }
    }
    if (language !== undefined) {
      problems.push(`${path}:${start}: Unclosed code fence.`);
    }
    if (marker && language === undefined) {
      problems.push(`${path}: Unused check marker.`);
    }
    for (const match of prose.join("\n").matchAll(/\]\(([^\s)]+)\)/g)) {
      const link = match[1];
      if (/^(?:[a-z]+:|#|\/)/i.test(link)) continue;
      const target = posix.normalize(
        posix.join(posix.dirname(path), link.split("#")[0]),
      );
      if (!files.has(target)) {
        problems.push(`${path}: Broken local documentation link ${link}.`);
      }
    }
  }
  return { snippets, problems };
}

/** Type checks only: documentation containing RPC or signing examples is never executed. */
export async function checkDocumentation(
  root: string,
): Promise<{ code: number; checked: number; diagnostics: string }> {
  const files = new Map<string, string>();
  for (
    const name of [
      "README.md",
      "CONTRIBUTING.md",
      "THIRD_PARTY_NOTICES.md",
      "LICENSE",
    ]
  ) {
    try {
      files.set(name, await Deno.readTextFile(resolve(root, name)));
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  }
  const inventory = inspectDocumentation(files);
  if (!files.has("README.md")) {
    inventory.problems.push("README.md is required.");
  }
  if (!inventory.snippets.length) {
    inventory.problems.push("No checked TypeScript examples were found.");
  }
  if (inventory.problems.length) {
    return { code: 1, checked: 0, diagnostics: inventory.problems.join("\n") };
  }
  const directory = await Deno.makeTempDir({ prefix: "vanity-sdk-docs-" });
  try {
    const paths: string[] = [];
    for (const snippet of inventory.snippets) {
      const path = resolve(
        directory,
        `${snippet.path.replaceAll("/", "-")}-L${snippet.line}.${
          snippet.language === "tsx" ? "tsx" : "ts"
        }`,
      );
      await Deno.writeTextFile(
        path,
        `// ${snippet.path}:${snippet.line}\n${snippet.code}\nexport {};\n`,
      );
      paths.push(path);
    }
    const result = await new Deno.Command(Deno.execPath(), {
      cwd: root,
      args: ["check", "--config", resolve(root, "deno.json"), ...paths],
      stdin: "null",
      stdout: "piped",
      stderr: "piped",
    }).output();
    return {
      code: result.code,
      checked: paths.length,
      diagnostics: new TextDecoder().decode(result.stderr) +
        new TextDecoder().decode(result.stdout),
    };
  } finally {
    await Deno.remove(directory, { recursive: true });
  }
}
