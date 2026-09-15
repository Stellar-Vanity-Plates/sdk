/** Complete-bundle budgets. Raising these limits requires measured release review. */
export const bundleProbes = [
  {
    name: "validation",
    entry: ".",
    symbol: "validatePlate",
    raw: 35000,
    gzip: 12000,
  },
  {
    name: "resolved-html",
    entry: "./rendering/local",
    symbol: "renderResolvedPlateHtml",
    raw: 45000,
    gzip: 16000,
  },
  {
    name: "shared-css",
    entry: "./rendering/styles",
    symbol: "plateSharedCss",
    raw: 760000,
    gzip: 365000,
  },
  {
    name: "network-react",
    entry: "./react",
    symbol: "Plate",
    raw: 1400000,
    gzip: 330000,
  },
  {
    name: "farming",
    entry: "./farming",
    symbol: "farmAccount, farmContractBatch, resumeContractFarm",
    raw: 1100000,
    gzip: 250000,
  },
] as const;
/** Enforces raw and compressed limits separately; one cannot mask growth in the other. */
export function bundleProblems(
  probe: { name: string; raw: number; gzip: number },
  actual: { raw: number; gzip: number },
): string[] {
  return (["raw", "gzip"] as const).flatMap((metric) =>
    actual[metric] > probe[metric]
      ? [
        `${probe.name}: ${metric} ${actual[metric]} bytes exceeds ${
          probe[metric]
        } bytes`,
      ]
      : []
  );
}
