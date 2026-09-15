// Colibri owns ABI interpretation and client generation. Each contract owns its
// binding files; shared Colibri exports live in the SDK-wide colibri module.
import { generateBindings } from "@colibri/contract-bindings";
import { NftSpec } from "@/contracts/nft/constants.ts";
import { DeployerSpec } from "@/contracts/deployer/constants.ts";
import { MarketplaceSpec } from "@/contracts/marketplace/constants.ts";
import { TreasurySpec } from "@/contracts/treasury/constants.ts";
import { RbacSpec } from "@/contracts/rbac/constants.ts";

if (Deno.args.some((arg) => arg !== "--check") || Deno.args.length > 1) {
  throw new Error("Usage: generate-clients.ts [--check]");
}
const check = Deno.args.includes("--check");

for (
  const [name, spec] of [
    ["nft", NftSpec],
    ["deployer", DeployerSpec],
    ["marketplace", MarketplaceSpec],
    ["treasury", TreasurySpec],
    ["rbac", RbacSpec],
  ] as const
) {
  const className = name[0].toUpperCase() + name.slice(1);
  const plan = generateBindings(spec, { className });
  const directory = `src/contracts/${name}`;
  if (!check) await Deno.mkdir(directory, { recursive: true });
  for (const [path, source] of Object.entries(plan.files)) {
    if (path === "colibri.ts") continue;
    const local = source.replace(
      /export (?:type )?\{[^}]*\} from "\.\/colibri\.ts";\n/g,
      "",
    );
    let aliased = local.replace(
      /from "\.\/(constants|types)\.ts"/g,
      `from "@/contracts/${name}/$1.ts"`,
    );
    // Bindings 0.1.0 emits a value import even when a spec has no UDT factories.
    // This is the only import-kind adaptation, required by verbatim-module-syntax.
    if (name === "deployer" && path === "types.ts") {
      aliased = aliased.replace(
        "import { SorobanType }",
        "import type { SorobanType }",
      );
    }
    const formatter = new Deno.Command(Deno.execPath(), {
      args: ["fmt", "--ext=ts", "-"],
      stdin: "piped",
      stdout: "piped",
      stderr: "piped",
    }).spawn();
    const writer = formatter.stdin.getWriter();
    await writer.write(new TextEncoder().encode(aliased));
    await writer.close();
    const formatted = await formatter.output();
    if (!formatted.success) {
      throw new Error(`Formatting failed: ${name}/${path}`);
    }
    const content = new TextDecoder().decode(formatted.stdout);
    const target = `${directory}/${path}`;
    if (check) {
      if (await Deno.readTextFile(target) !== content) {
        throw new Error(
          `Generated binding differs: ${target}. Run deno task generate.`,
        );
      }
    } else await Deno.writeTextFile(target, content);
  }
  for (const warning of plan.warnings) console.warn(`${name}: ${warning}`);
  console.log(
    `${name}: ${check ? "verified" : "generated"} ${
      Object.keys(plan.files).length - 1
    } Colibri files`,
  );
}
if (check) {
  for (
    const path of [
      "src/contracts/generated",
      ...["nft", "deployer", "marketplace", "treasury", "rbac"].map(
        (name) => `src/contracts/${name}/colibri.ts`,
      ),
    ]
  ) {
    try {
      await Deno.lstat(path);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) continue;
      throw error;
    }
    throw new Error(`Redundant binding layout: ${path}`);
  }
}
