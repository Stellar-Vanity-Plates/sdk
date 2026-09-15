import { packageTargets } from "@tools/quality/policy.ts";

/** Omit the artifact URL to exercise JSR with no local SDK import mapping. */
export function consumerConfiguration(config: {
  name: string;
  version: string;
  exports: Record<string, string>;
  imports: Record<string, string>;
  compilerOptions: Record<string, unknown>;
}, artifactUrl?: string): {
  compilerOptions: Record<string, unknown>;
  imports: Record<string, string>;
  scopes?: Record<string, Record<string, string>>;
} {
  const runtimeImports = Object.fromEntries(
    Object.entries(config.imports).filter(([key]) => key in packageTargets),
  );
  const publicImports = Object.fromEntries(
    Object.entries(config.exports).map(([subpath, target]) => {
      const suffix = subpath === "." ? "" : subpath.slice(1);
      return [
        `@consumer/sdk${suffix}`,
        artifactUrl
          ? new URL(target, artifactUrl).href
          : `jsr:${config.name}@${config.version}${suffix}`,
      ];
    }),
  );
  return {
    compilerOptions: config.compilerOptions,
    imports: {
      // Consumers get Colibri through the SDK's curated export. There is no
      // direct Colibri alias and no test/tooling or source-checkout alias.
      ...Object.fromEntries(
        Object.entries(runtimeImports).filter(([key]) =>
          !key.startsWith("@colibri/")
        ),
      ),
      ...publicImports,
      "react-dom/server": config.imports["react-dom/server"],
      "@types/react-dom/server": config.imports["@types/react-dom/server"],
    },
    ...(artifactUrl
      ? {
        scopes: {
          [artifactUrl]: {
            ...runtimeImports,
            "@/": new URL("src/", artifactUrl).href,
          },
        },
      }
      : {}),
  };
}
