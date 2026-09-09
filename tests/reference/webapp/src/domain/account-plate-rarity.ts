import { StrKey } from "@stellar/stellar-sdk";

export const ACCOUNT_PLATE_RARITIES = [
  { id: "standard", label: "Standard", run: 1 },
  { id: "registered", label: "Registered", run: 2 },
  { id: "foil", label: "Foil", run: 3 },
  { id: "aurora", label: "Aurora", run: 4 },
  { id: "pole", label: "Pole position", run: 7 },
] as const;

export function deriveAccountPlateRarity(address: string) {
  if (!StrKey.isValidEd25519PublicKey(address)) return undefined;
  const symbols = Uint8Array.from(StrKey.decodeEd25519PublicKey(address))
    .subarray(14, 21).map((
      byte,
    ) => byte & 31);
  const mismatch = symbols.findIndex((symbol) => symbol !== symbols[0]);
  const run = mismatch === -1 ? symbols.length : mismatch;
  const rarity = [...ACCOUNT_PLATE_RARITIES].reverse().find((item) =>
    run >= item.run
  )!;
  return {
    ...rarity,
    run,
    signature: Array.from(
      symbols,
      (symbol) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[symbol],
    ).join(""),
  };
}
