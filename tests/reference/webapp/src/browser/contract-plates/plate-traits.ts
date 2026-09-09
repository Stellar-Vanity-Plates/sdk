import { StrKey } from "@stellar/stellar-sdk";

import {
  CONTRACT_PLATE_PATTERNS,
  type ContractPlatePattern,
  type ContractPlateRarity,
  type ContractPlateTraits,
  deriveContractPlateTraits,
  deriveContractPlateTraitSource,
} from "@reference/src/domain/contract-plate-traits.ts";

export {
  CONTRACT_PLATE_PATTERNS,
  deriveContractPlateTraits,
  deriveContractPlateTraitSource,
};
export type {
  ContractPlatePattern,
  ContractPlateRarity,
  ContractPlateTraits,
  ContractPlateTraitSource,
} from "@reference/src/domain/contract-plate-traits.ts";

export type ContractPlateTraitDetail = {
  kind: "color" | "pattern" | "rarity";
  label: string;
  value: string;
  explanation: string;
};

export const CONTRACT_PLATE_PATTERN_LABELS: Record<
  ContractPlatePattern,
  string
> = {
  pinstripe: "Pinstripe",
  microdot: "Microdot",
  diagonal: "Diagonal weave",
  crosshatch: "Crosshatch",
  horizontal: "Horizontal grain",
  guilloche: "Guilloche",
};

export const CONTRACT_PLATE_RARITY_LABELS: Record<
  ContractPlateRarity,
  string
> = {
  standard: "Standard",
  registered: "Registered edge",
  foil: "Foil",
  aurora: "Aurora foil",
  pole: "Pole edition",
};

/** Describes how each visible plate trait was selected from the address. */
export function describeContractPlateTraits(
  address?: string,
): ContractPlateTraitDetail[] {
  const traits = deriveContractPlateTraits(address);
  const validAddress = Boolean(address && StrKey.isValidContract(address));

  if (!validAddress) {
    return [
      {
        kind: "color",
        label: "Ink color",
        value: "Classic blue",
        explanation:
          "Preview color used until a valid contract address exists.",
      },
      {
        kind: "pattern",
        label: "Background",
        value: "Pinstripe",
        explanation:
          "Preview texture used until a valid contract address exists.",
      },
      {
        kind: "rarity",
        label: "Rarity",
        value: "Standard",
        explanation:
          "Rarity can be calculated once the contract address exists.",
      },
    ];
  }

  const bytes = Uint8Array.from(StrKey.decodeContract(address!));
  const colorSeed = `${hexByte(bytes[0])} ${hexByte(bytes[1])}`;
  const patternSlot = traits.patternSelector % CONTRACT_PLATE_PATTERNS.length;

  return [
    {
      kind: "color",
      label: "Ink color",
      value: `${colorFamily(traits.inkHue)} ink`,
      explanation:
        `Payload bytes 1–2 (${colorSeed}) set hue ${traits.inkHue}°. Byte 4 (${
          hexByte(bytes[3])
        }) sets ${traits.inkSaturation}% saturation, and byte 5 (${
          hexByte(bytes[4])
        }) sets ${traits.inkLightness}% lightness.`,
    },
    {
      kind: "pattern",
      label: "Background",
      value: `${CONTRACT_PLATE_PATTERN_LABELS[traits.pattern]} pattern`,
      explanation: `Payload byte 3 (${
        hexByte(traits.patternSelector)
      }) selects texture ${
        patternSlot + 1
      } of ${CONTRACT_PLATE_PATTERNS.length}. Byte 5 (${
        hexByte(bytes[4])
      }) sets the ${traits.patternScale}px spacing.`,
    },
    {
      kind: "rarity",
      label: "Rarity",
      value: CONTRACT_PLATE_RARITY_LABELS[traits.rarity],
      explanation: rarityExplanation(traits),
    },
  ];
}

function rarityExplanation(traits: ContractPlateTraits): string {
  const signature = traits.raritySignature;
  const source =
    `Payload bytes 6–12 map to rarity sequence ${signature} through Stellar's 32-character alphabet.`;
  if (traits.rarity === "standard") {
    return `${source} Its opening symbols differ, so no rare edge treatment is applied.`;
  }
  if (traits.rarity === "registered") {
    return `${source} A matching opening pair unlocks the registered edge.`;
  }
  if (traits.rarity === "foil") {
    return `${source} Three matching opening symbols unlock the foil finish.`;
  }
  if (traits.rarity === "aurora") {
    return `${source} ${traits.rarityRunLength} matching opening symbols unlock the animated aurora finish.`;
  }
  return `${source} All seven symbols match, unlocking the one-in-a-billion pole edition.`;
}

function colorFamily(hue: number): string {
  if (hue < 15 || hue >= 345) return "Ruby";
  if (hue < 45) return "Copper";
  if (hue < 75) return "Gold";
  if (hue < 165) return "Green";
  if (hue < 200) return "Teal";
  if (hue < 250) return "Blue";
  if (hue < 285) return "Indigo";
  if (hue < 330) return "Plum";
  return "Rose";
}

function hexByte(value: number): string {
  return `0x${value.toString(16).padStart(2, "0").toUpperCase()}`;
}
