import { StrKey } from "@stellar/stellar-sdk";

export const CONTRACT_PLATE_PATTERNS = [
  "pinstripe",
  "microdot",
  "diagonal",
  "crosshatch",
  "horizontal",
  "guilloche",
] as const;

export const CONTRACT_PLATE_RARITIES = [
  "standard",
  "registered",
  "foil",
  "aurora",
  "pole",
] as const;

export type ContractPlatePattern = typeof CONTRACT_PLATE_PATTERNS[number];
export type ContractPlateRarity = typeof CONTRACT_PLATE_RARITIES[number];

export type ContractPlateTraits = {
  ink: string;
  inkHue: number;
  inkSaturation: number;
  inkLightness: number;
  patternColor: string;
  pattern: ContractPlatePattern;
  patternSelector: number;
  patternScale: number;
  rarity: ContractPlateRarity;
  rarityRunLength: number;
  raritySignature: string;
};

export type ContractPlateTraitSource = {
  bytes: string[];
  hex: string;
};

const STELLAR_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const DEFAULT_TRAITS: ContractPlateTraits = {
  ink: "var(--blue)",
  inkHue: 214,
  inkSaturation: 63,
  inkLightness: 31,
  patternColor: "rgba(23, 63, 115, 0.035)",
  pattern: "pinstripe",
  patternSelector: 0,
  patternScale: 8,
  rarity: "standard",
  rarityRunLength: 1,
  raritySignature: "",
};

/** Returns the decoded 32-byte contract ID used to derive plate traits. */
export function deriveContractPlateTraitSource(
  address?: string,
): ContractPlateTraitSource | undefined {
  if (!address || !StrKey.isValidContract(address)) return undefined;

  const bytes = Array.from(StrKey.decodeContract(address), hexByte);
  return {
    bytes,
    hex: bytes.join(" "),
  };
}

/** Derives the canonical visual traits from a Stellar contract address. */
export function deriveContractPlateTraits(
  address?: string,
): ContractPlateTraits {
  if (!address || !StrKey.isValidContract(address)) return DEFAULT_TRAITS;

  const bytes = Uint8Array.from(StrKey.decodeContract(address));
  const hueSeed = (bytes[0] << 8) | bytes[1];
  const hue = Math.round((hueSeed / 65_535) * 359);
  const saturation = 34 + (bytes[3] % 9);
  const lightness = 27 + (bytes[4] % 7);
  const raritySymbols = bytes.slice(5, 12).map((value) => value & 31);
  const rarityRunLength = matchingPrefixLength(raritySymbols);
  const rarity = rarityFromRunLength(rarityRunLength);

  return {
    ink: `hsl(${hue} ${saturation}% ${lightness}%)`,
    inkHue: hue,
    inkSaturation: saturation,
    inkLightness: lightness,
    patternColor: `hsl(${hue} ${saturation}% ${lightness}% / 0.055)`,
    pattern: CONTRACT_PLATE_PATTERNS[bytes[2] % CONTRACT_PLATE_PATTERNS.length],
    patternSelector: bytes[2],
    patternScale: 7 + (bytes[4] % 5),
    rarity,
    rarityRunLength,
    raritySignature: Array.from(
      raritySymbols,
      (value) => STELLAR_ALPHABET[value],
    ).join(""),
  };
}

function matchingPrefixLength(symbols: Uint8Array): number {
  const first = symbols[0];
  const mismatch = symbols.findIndex((symbol) => symbol !== first);
  return mismatch === -1 ? symbols.length : mismatch;
}

function rarityFromRunLength(runLength: number): ContractPlateRarity {
  if (runLength < 2) return "standard";
  if (runLength === 2) return "registered";
  if (runLength === 3) return "foil";
  if (runLength < 7) return "aurora";
  return "pole";
}

function hexByte(value: number): string {
  return `0x${value.toString(16).padStart(2, "0").toUpperCase()}`;
}
