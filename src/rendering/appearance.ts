/** Canonical palette and insignia data for plate renderers and trait selectors. @module */
import { StrKey } from "@colibri/core/strkey";
import { identiconSvg } from "@colibri/identicon/svg";
import { plateKind } from "@/validation.ts";
import { PLATE_PALETTE, PLATE_TRAIT_RECIPE } from "@/rendering/recipe.ts";
/** Exact CSS colors and identicon used by the canonical plate artwork. */
export interface PlateAppearance {
  /** Text and foil base color, in CSS HSL notation. */ ink: string;
  /** Identicon stripe color. */ band: string;
  /** Stripe highlight color. */ bandHighlight: string;
  /** Light badge background. */ badge: string;
  /** Self-contained SVG insignia. */ identiconSvg: string;
  /** Encoded insignia suitable for an img src or CSS URL. */ identiconUrl:
    string;
}
/** Derives reusable artwork data locally, without loading fonts, React or RPC clients. */
export function createPlateAppearance(address: string): PlateAppearance {
  const account = plateKind(address) === "account";
  const bytes = account
    ? StrKey.decodeEd25519PublicKey(address)
    : StrKey.decodeContract(address);
  const hue = bytes[PLATE_TRAIT_RECIPE.hueByte - 1] / 255 * 360;
  const band =
    `hsl(${hue} ${PLATE_PALETTE.inkSaturation}% ${PLATE_PALETTE.inkLightness}%)`;
  const svg = identiconSvg(address, {
    size: 224,
    padding: 14,
    saturation: .8,
    value: .55,
  });
  return {
    ink: band,
    band,
    bandHighlight:
      `hsl(${hue} ${PLATE_PALETTE.inkSaturation}% ${PLATE_PALETTE.highlightLightness}%)`,
    badge:
      `hsl(${hue} ${PLATE_PALETTE.badgeSaturation}% ${PLATE_PALETTE.badgeLightness}%)`,
    identiconSvg: svg,
    identiconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}
