import { Identicon } from "@colibri/identicon";
import { StrKey } from "@stellar/stellar-sdk";
import type { CSSProperties } from "react";

export const PLATE_INSIGNIA_FINISHES = [
  { id: "badge", label: "Club badge" },
  { id: "watermark", label: "Ghost paint" },
  { id: "sideband", label: "Touring stripe" },
  { id: "pattern", label: "Signature weave" },
] as const;

export const PLATE_IDENTICON_OPTIONS = Object.freeze({
  size: 224,
  padding: 14,
  saturation: 0.8,
  value: 0.55,
});

export function derivePlateInsignia(address?: string) {
  if (!address) return undefined;
  const contract = StrKey.isValidContract(address);
  if (!contract && !StrKey.isValidEd25519PublicKey(address)) return undefined;
  const bytes = contract
    ? StrKey.decodeContract(address)
    : StrKey.decodeEd25519PublicKey(address);
  const hue = bytes[1] / 255 * 360;
  return {
    finish: PLATE_INSIGNIA_FINISHES[bytes[contract ? 15 : 12] % 4],
    icon: `data:image/svg+xml,${
      encodeURIComponent(new Identicon(address).toSvg(PLATE_IDENTICON_OPTIONS))
    }`,
    ink: `hsl(${hue} 80% 23%)`,
    band: `hsl(${hue} 80% 23%)`,
    bandHighlight: `hsl(${hue} 80% 32%)`,
    badge: `hsl(${hue} 35% 93%)`,
  };
}

export type PlateInsigniaAppearance = NonNullable<
  ReturnType<typeof derivePlateInsignia>
>;

export function PlateInsignia({ appearance, rarity }: {
  appearance: PlateInsigniaAppearance;
  rarity: "standard" | "registered" | "foil" | "aurora" | "pole";
}) {
  return (
    <span
      className="plate-insignia"
      data-insignia-finish={appearance.finish.id}
      data-insignia-rarity={rarity}
      style={{
        "--account-icon": `url("${appearance.icon}")`,
        "--account-band": appearance.band,
        "--account-band-highlight": appearance.bandHighlight,
        "--account-badge": appearance.badge,
      } as CSSProperties}
      aria-hidden="true"
    >
      <span className="account-plate-identicon">
        <span className="account-identicon-shape">
          <img src={appearance.icon} alt="" draggable={false} />
        </span>
      </span>
      <span className="account-plate-lustre" />
    </span>
  );
}
