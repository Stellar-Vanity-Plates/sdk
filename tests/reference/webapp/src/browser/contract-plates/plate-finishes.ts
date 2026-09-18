import type { CSSProperties } from "react";
import {
  deriveContractPlateTraits,
  deriveContractPlateTraitSource,
  describeContractPlateTraits,
} from "@reference/src/browser/contract-plates/plate-traits.ts";
import { derivePlateInsignia } from "@reference/src/browser/ui/PlateInsignia.tsx";

export const PLATE_LETTERING = [
  {
    id: "registration",
    label: "Registration",
    note: "Classic stamped lettering.",
  },
  {
    id: "rally",
    label: "Rally condensed",
    note: "Tall lettering from the pit lane.",
  },
  {
    id: "coach",
    label: "Coach script",
    note: "A sign-painted coachwork signature.",
  },
  {
    id: "slab",
    label: "Garage slab",
    note: "Bold letters with a vintage garage feel.",
  },
] as const;

export const PLATE_PAINTS = [
  { id: "enamel", label: "Enamel", note: "Solid color with a pressed edge." },
  {
    id: "lacquer",
    label: "Candy lacquer",
    note: "Deep color under a glossy clear coat.",
  },
  {
    id: "metallic",
    label: "Metallic",
    note: "Brushed highlights through the lettering.",
  },
  {
    id: "pinlined",
    label: "Signwriter’s outline",
    note: "A fine ivory keyline and painted shadow.",
  },
  {
    id: "pearl",
    label: "Pearlescent",
    note: "A soft pearl highlight over the original ink.",
  },
] as const;

export const PLATE_PATTERN_FINISHES = [
  ["pinstripe", "Pinstripe", "Twin coachlines"],
  ["microdot", "Microdot", "Metal flake"],
  ["diagonal", "Diagonal weave", "Herringbone"],
  ["crosshatch", "Crosshatch", "Diamond tuck"],
  ["horizontal", "Horizontal grain", "Speed lines"],
  ["guilloche", "Guilloche", "Engine turned"],
] as const;

export function derivePlateFinish(address?: string) {
  const traits = deriveContractPlateTraits(address);
  const source = deriveContractPlateTraitSource(address);
  const bytes = source?.bytes.map((byte) => Number.parseInt(byte.slice(2), 16));
  const lettering =
    PLATE_LETTERING[(bytes?.[6] ?? 0) & 3];
  const alternatePattern = (bytes?.[13] ?? 0) % 2 === 1;
  const paint = PLATE_PAINTS[(bytes?.[14] ?? 0) % PLATE_PAINTS.length];
  const pattern = PLATE_PATTERN_FINISHES.find(([id]) => id === traits.pattern)!;
  return {
    lettering,
    paint,
    pattern: {
      id: `${traits.pattern}${alternatePattern ? "-custom" : ""}`,
      label: pattern[alternatePattern ? 2 : 1],
    },
    traits,
  };
}

export function plateFinishAttributes(address?: string, word = "") {
  const finish = derivePlateFinish(address);
  const { inkHue, inkSaturation, inkLightness } = finish.traits;
  return {
    "data-lettering": finish.lettering.id,
    style: {
      "--finish-ink": `hsl(${inkHue} ${inkSaturation}% ${inkLightness}%)`,
      "--finish-word-limit": `${100 / Math.max(word.length, 1)}cqw`,
    } as CSSProperties,
  };
}

export function describeContractPlateFinishes(address: string) {
  const canonical = describeContractPlateTraits(address);
  const finish = derivePlateFinish(address);
  const source = deriveContractPlateTraitSource(address);
  const insignia = source ? derivePlateInsignia(address) : undefined;
  return [
    canonical[0],
    {
      kind: "lettering" as const,
      label: "Lettering",
      value: finish.lettering.label,
      explanation: `${finish.lettering.note} ${
        source
          ? "Selected by the lowest two bits of identity byte 7."
          : "Canonical fallback until a valid address exists."
      }`,
    },
    {
      ...canonical[2],
      explanation: `${
        canonical[2].explanation
      } The finish uses the same edge, lettering, and identicon effects as G plates.`,
    },
    {
      kind: "insignia" as const,
      label: "Identicon finish",
      value: insignia?.finish.label ?? "Awaiting address",
      explanation: source
        ? "Colibri generates the identicon from the contract ID. Payload byte 8 selects Club badge, Ghost paint, Touring stripe, or Signature weave. Foil follows the identicon shape using this plate’s existing rarity."
        : "The identicon appears once a valid contract address exists.",
    },
  ];
}
