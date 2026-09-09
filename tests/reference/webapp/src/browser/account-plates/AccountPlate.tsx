import { type CSSProperties, useMemo } from "react";
import { deriveAccountPlateAppearance } from "@reference/src/browser/account-plates/plate-appearance.ts";
import { PlateInsignia } from "@reference/src/browser/ui/PlateInsignia.tsx";

export function AccountPlate({
  word,
  address,
  compact = false,
  inline = false,
}: {
  word: string;
  address: string;
  compact?: boolean;
  inline?: boolean;
}) {
  const appearance = useMemo(
    () => deriveAccountPlateAppearance(address),
    [address],
  );
  const label = word || "PLATE";
  const Element = inline ? "span" : "div";
  const style = {
    "--account-icon": appearance ? `url("${appearance.icon}")` : "none",
    "--account-ink": appearance?.ink,
    "--account-band": appearance?.band,
    "--account-band-highlight": appearance?.bandHighlight,
    "--account-badge": appearance?.badge,
    "--account-word-limit": `${66 / Math.max(label.length, 1)}cqw`,
  } as CSSProperties;

  return (
    <Element className="account-plate-container">
      <Element
        className={`account-plate${compact ? " is-compact" : ""}`}
        data-account-finish={appearance?.finish.id}
        data-account-lettering={appearance?.lettering.id}
        data-account-rarity={appearance?.rarity.id}
        style={style}
        role="img"
        aria-label={`${label} Stellar account plate. ${address}${
          appearance ? `. ${appearance.rarity.label}` : ""
        }`}
      >
        {appearance && (
          <PlateInsignia
            appearance={appearance}
            rarity={appearance.rarity.id}
          />
        )}
        <Element className="account-plate-face" aria-hidden="true">
          <span className="account-plate-label">STELLAR ACCOUNT PLATE</span>
          <strong className="account-plate-word">{label}</strong>
          <span className="account-plate-address">{address}</span>
        </Element>
        {["nw", "ne", "sw", "se"].map((corner) => (
          <span
            key={corner}
            className={`plate-screw plate-screw-${corner}`}
            aria-hidden="true"
          />
        ))}
      </Element>
    </Element>
  );
}
