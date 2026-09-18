/** Shared G/C identity recipe. Positions are one-based decoded payload bytes. @module */
export const PLATE_TRAIT_RECIPE: Readonly<{
  version: "svp-1";
  hueByte: 2;
  letteringByte: 7;
  letteringMask: 3;
  finishByte: 8;
  finishMask: 3;
  rarityFirstByte: 9;
  rarityByteCount: 7;
  rarityMask: 31;
}> = Object.freeze(
  {
    version: "svp-1",
    hueByte: 2,
    letteringByte: 7,
    letteringMask: 3,
    finishByte: 8,
    finishMask: 3,
    rarityFirstByte: 9,
    rarityByteCount: 7,
    rarityMask: 31,
  } as const,
);

/** Stable lettering order selected by byte 7's lowest two bits. */
export const PLATE_LETTERINGS: readonly Readonly<{
  id: "mono" | "rally" | "coach" | "slab";
  label: string;
}>[] = Object.freeze(
  [
    Object.freeze({ id: "mono", label: "Registration" } as const),
    Object.freeze({ id: "rally", label: "Rally condensed" } as const),
    Object.freeze({ id: "coach", label: "Coach script" } as const),
    Object.freeze({ id: "slab", label: "Garage slab" } as const),
  ] as const,
);

/** Stable identicon presentations selected by byte 8's lowest two bits. */
export const PLATE_FINISHES: readonly Readonly<{
  id: "badge" | "watermark" | "sideband" | "pattern";
  label: string;
}>[] = Object.freeze(
  [
    Object.freeze({ id: "badge", label: "Club badge" } as const),
    Object.freeze({ id: "watermark", label: "Ghost paint" } as const),
    Object.freeze({ id: "sideband", label: "Touring stripe" } as const),
    Object.freeze({ id: "pattern", label: "Signature weave" } as const),
  ] as const,
);

/** Rarity thresholds for the opening run of equal five-bit symbols. */
export const PLATE_RARITIES: readonly Readonly<{
  id: "standard" | "registered" | "foil" | "aurora" | "pole";
  label: string;
  run: number;
}>[] = Object.freeze(
  [
    Object.freeze({ id: "standard", label: "Standard", run: 1 } as const),
    Object.freeze({ id: "registered", label: "Registered", run: 2 } as const),
    Object.freeze({ id: "foil", label: "Foil", run: 3 } as const),
    Object.freeze({ id: "aurora", label: "Aurora", run: 4 } as const),
    Object.freeze({ id: "pole", label: "Pole position", run: 7 } as const),
  ] as const,
);

/** Fixed readability settings; all colors use the Colibri identicon hue. */
export const PLATE_PALETTE: Readonly<{
  inkSaturation: 80;
  inkLightness: 23;
  highlightLightness: 32;
  badgeSaturation: 35;
  badgeLightness: 93;
}> = Object.freeze(
  {
    inkSaturation: 80,
    inkLightness: 23,
    highlightLightness: 32,
    badgeSaturation: 35,
    badgeLightness: 93,
  } as const,
);
