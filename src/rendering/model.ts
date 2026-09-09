import { StrKey } from "@colibri/core";
import { accountDisplay } from "@/accounts/mod.ts";
import { normalizeSuffix, type PlateKind, plateKind } from "@/validation.ts";
import { VanityError } from "@/errors.ts";

/** Plate rarity derived from address bytes, matching the web application's rules. */
export type PlateRarity =
  | "standard"
  | "registered"
  | "foil"
  | "aurora"
  | "pole";
/** Shared identity-art treatment. */
export type PlateFinish = "badge" | "watermark" | "sideband" | "pattern";
/** Display input. A suffix is mandatory for contract plates. */
export interface PlateInput {
  /** Complete checksum-valid G or C address. */
  address: string;
  /** Exact ending to display; case is normalized. */
  suffix?: string;
  /** Account ManageData suffix length; ignored when an explicit suffix is provided. */
  suffixLength?: number;
}
/** Deterministic appearance and identity derived locally from a plate. */
export interface PlateModel {
  /** Full address, never replaced by its decorative label. */ address: string;
  /** Account or contract identity. */ kind: PlateKind;
  /** Configured suffix or standard account abbreviation. */ label: string;
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
  /** Legacy contract pattern selector; the canonical Clubhouse finish suppresses it. */ pattern:
    | "pinstripe"
    | "microdot"
    | "diagonal"
    | "crosshatch"
    | "horizontal"
    | "guilloche";
  /** Pattern spacing in SVG units. */ patternScale: number;
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
/** Builds the same deterministic rarity, lettering and insignia selections as the application. */
export function createPlateModel(input: PlateInput): PlateModel {
  const kind = plateKind(input.address);
  const bytes = kind === "account"
    ? StrKey.decodeEd25519PublicKey(input.address)
    : StrKey.decodeContract(input.address);
  let label: string, configured: boolean;
  if (input.suffix !== undefined) {
    label = normalizeSuffix(input.suffix);
    if (!input.address.endsWith(label)) {
      throw new VanityError(
        "VNTY_INVALID_SUFFIX",
        "The plate label must match the ending of its full address.",
      );
    }
    configured = true;
  } else {
    if (kind === "contract") {
      throw new VanityError(
        "VNTY_INVALID_SUFFIX",
        "Contract plates require their claimed suffix.",
      );
    }
    ({ label, configured } = accountDisplay(input.address, input.suffixLength));
  }
  const offset = kind === "account" ? 14 : 5;
  const symbols = Uint8Array.from(
    bytes.slice(offset, offset + 7),
    (b) => b & 31,
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
  const band = color(bytes[1] / 255 * 360, 80, 23);
  return {
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
    finish: (["badge", "watermark", "sideband", "pattern"] as const)[
      bytes[kind === "account" ? 12 : 15] % 4
    ],
    lettering: kind === "account"
      ? (["rally", "coach", "mono"] as const)[bytes[13] % 3]
      : (["mono", "rally", "coach", "slab"] as const)[bytes[12] % 4],
    ink: kind === "account" ? band : color(
      Math.round(((bytes[0] << 8) | bytes[1]) / 65535 * 359),
      34 + bytes[3] % 9,
      27 + bytes[4] % 7,
    ),
    band,
    pattern: ([
      "pinstripe",
      "microdot",
      "diagonal",
      "crosshatch",
      "horizontal",
      "guilloche",
    ] as const)[bytes[2] % 6],
    patternScale: 7 + bytes[4] % 5,
  };
}
