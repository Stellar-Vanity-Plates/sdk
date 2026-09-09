/** Reviewed SDK dependency directions; new areas must be classified explicitly. */
export function layer(path: string): string | undefined {
  if (path === "mod.ts" || /\/mod\.tsx?$/.test(path)) return "entry";
  if (/^src\/(errors|validation)\.ts$/.test(path)) return "foundation";
  for (const area of ["accounts", "farming", "contracts", "web", "react"]) {
    if (path.startsWith(`src/${area}/`)) return area;
  }
  if (path === "src/rendering/png.ts") return "png";
  if (path === "src/rendering/png-server.ts") return "server";
  if (/^src\/rendering\/(png-options|browser-types)\.ts$/.test(path)) {
    return "ports";
  }
  if (path.startsWith("src/rendering/")) return "rendering";
}
export const dependencies: Readonly<Record<string, readonly string[]>> = {
  entry: [
    "foundation",
    "accounts",
    "farming",
    "contracts",
    "rendering",
    "web",
    "react",
  ],
  foundation: ["foundation"],
  accounts: ["accounts", "foundation"],
  farming: ["farming", "foundation"],
  contracts: ["contracts", "foundation"],
  rendering: ["rendering", "foundation", "accounts"],
  ports: ["ports"],
  png: ["rendering", "foundation", "ports"],
  server: ["rendering", "foundation", "ports"],
  web: ["web", "rendering"],
  react: ["react", "rendering"],
};
export const externals: Readonly<Record<string, readonly string[]>> = {
  entry: [],
  foundation: ["@colibri/core"],
  accounts: ["@colibri/core"],
  farming: ["@colibri/core"],
  contracts: ["@colibri/core", "@stellar/stellar-sdk/contract"],
  rendering: ["@colibri/core", "@colibri/identicon"],
  ports: [],
  png: [],
  server: ["playwright"],
  web: [],
  react: ["react"],
};
// Dependency upgrades remain possible; changing the package identity requires review.
export const packageTargets: Readonly<Record<string, RegExp>> = {
  "@colibri/core": /^jsr:@colibri\/core@[^/]+$/,
  "@colibri/identicon": /^jsr:@colibri\/identicon@[^/]+$/,
  "@stellar/stellar-sdk": /^npm:@stellar\/stellar-sdk@[^/]+$/,
  react: /^npm:react@[^/]+$/,
  "react/jsx-runtime": /^npm:react@[^/]+\/jsx-runtime$/,
  "@types/react": /^npm:@types\/react@[^/]+$/,
  playwright: /^npm:playwright@[^/]+$/,
};
