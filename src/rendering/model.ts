import { StrKey } from "@colibri/core/strkey";
import { parseSuffixLength } from "@/accounts/index.ts";
import { abbreviateAddress, type PlateKind, plateKind } from "@/validation.ts";
import {
  PLATE_FINISHES,
  PLATE_LETTERINGS,
  PLATE_PALETTE,
  PLATE_TRAIT_RECIPE,
} from "@/rendering/recipe.ts";

/** Plate rarity derived from the shared G/C identity recipe. */
export type PlateRarity =
  | "standard"
  | "registered"
  | "foil"
  | "aurora"
  | "pole";
/** Shared identity-art treatment. */
export type PlateFinish = "badge" | "watermark" | "sideband" | "pattern";
/** Resolved or local display data. No network requests are made by createPlateModel. */
export interface ResolvedPlateInput {
  /** Complete checksum-valid G or C address. */
  address: string;
  /** Number of ending characters to show, 1–56. Missing/invalid counts abbreviate. */
  suffixLength?: number;
}
/** Deterministic appearance and identity derived locally from a plate. */
export interface PlateModel {
  /** Stable recipe identifier; persisted derived traits must be recomputed when it changes. */ recipeVersion:
    typeof PLATE_TRAIT_RECIPE.version;
  /** Full address, never replaced by its decorative label. */ address: string;
  /** Account or contract identity. */ kind: PlateKind;
  /** Configured ending or standard address abbreviation. */ label: string;
  /** Whether the label is an explicit or configured suffix. */ configured:
    boolean;
  /** Address-derived rarity. */ rarity: PlateRarity;
  /** Matching prefix length used to derive rarity. */ rarityRun: number;
  /** Seven-symbol rarity fingerprint. */ raritySignature: string;
  /** Address-derived artwork treatment. */ finish: PlateFinish;
  /** Font family selected by the address. */ lettering:
    | "mono"
    | "rally"
    | "coach"
    | "slab";
  /** Address-derived text ink, in portable hexadecimal form. */ ink: string;
  /** Identicon stripe color. */ band: string;
  /** Colibri identicon hue in degrees, shared by the ink and insignia. */ hue:
    number;
}

function color(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16).padStart(2, "0");
  };
  return `#${channel(0)}${channel(8)}${channel(4)}`;
}
/** Builds the canonical deterministic rarity, lettering and insignia selections. */
export function createPlateModel(input: ResolvedPlateInput): PlateModel {
  const kind = plateKind(input.address);
  const bytes = kind === "account"
    ? StrKey.decodeEd25519PublicKey(input.address)
    : StrKey.decodeContract(input.address);
  const count = typeof input.suffixLength === "number"
    ? parseSuffixLength(String(input.suffixLength))
    : undefined;
  const label = count === undefined
    ? abbreviateAddress(input.address)
    : input.address.slice(-count);
  const configured = count !== undefined;
  const offset = PLATE_TRAIT_RECIPE.rarityFirstByte - 1;
  const symbols = Uint8Array.from(
    bytes.slice(offset, offset + PLATE_TRAIT_RECIPE.rarityByteCount),
    (b) => b & PLATE_TRAIT_RECIPE.rarityMask,
  );
  const mismatch = symbols.findIndex((b) => b !== symbols[0]);
  const run = mismatch < 0 ? 7 : mismatch;
  const rarity: PlateRarity = run < 2
    ? "standard"
    : run === 2
    ? "registered"
    : run === 3
    ? "foil"
    : run < 7
    ? "aurora"
    : "pole";
  const hue = bytes[PLATE_TRAIT_RECIPE.hueByte - 1] / 255 * 360;
  const band = color(
    hue,
    PLATE_PALETTE.inkSaturation,
    PLATE_PALETTE.inkLightness,
  );
  return {
    recipeVersion: PLATE_TRAIT_RECIPE.version,
    address: input.address,
    kind,
    label,
    configured,
    rarity,
    rarityRun: run,
    raritySignature: Array.from(
      symbols,
      (b) => "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"[b],
    ).join(""),
    finish: PLATE_FINISHES[
      bytes[PLATE_TRAIT_RECIPE.finishByte - 1] & PLATE_TRAIT_RECIPE.finishMask
    ].id,
    lettering: PLATE_LETTERINGS[
      bytes[PLATE_TRAIT_RECIPE.letteringByte - 1] &
      PLATE_TRAIT_RECIPE.letteringMask
    ].id,
    ink: band,
    band,
    hue,
  };
}
