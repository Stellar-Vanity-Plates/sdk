/** Canonical palette and insignia data for plate renderers and trait selectors. @module */
import { StrKey } from "@colibri/core/strkey";
import { identiconSvg } from "@colibri/identicon/svg";
import { plateKind } from "@/validation.ts";
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
  const hue = bytes[1] / 255 * 360;
  const band = `hsl(${hue} 80% 23%)`;
  const svg = identiconSvg(address, {
    size: 224,
    padding: 14,
    saturation: .8,
    value: .55,
  });
  return {
    ink: account
      ? band
      : `hsl(${Math.round(((bytes[0] << 8) | bytes[1]) / 65535 * 359)} ${
        34 + bytes[3] % 9
      }% ${27 + bytes[4] % 7}%)`,
    band,
    bandHighlight: `hsl(${hue} 80% 32%)`,
    badge: `hsl(${hue} 35% 93%)`,
    identiconSvg: svg,
    identiconUrl: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
}
