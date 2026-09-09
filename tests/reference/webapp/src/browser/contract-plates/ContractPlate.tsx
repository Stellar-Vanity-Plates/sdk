import { type CSSProperties, useMemo } from "react";

import { deriveContractPlateTraits } from "@reference/src/browser/contract-plates/plate-traits.ts";
import { plateFinishAttributes } from "@reference/src/browser/contract-plates/plate-finishes.ts";
import { useClubhouse } from "@reference/src/browser/design-system/ClubhouseTheme.tsx";
import { derivePlateInsignia, PlateInsignia } from "@reference/src/browser/ui/PlateInsignia.tsx";

export function ContractPlate({
  word,
  address,
  compact = false,
  variant = "display",
  tokenId,
  wordOnly = false,
  label = "STELLAR CONTRACT PLATE",
  className = "",
}: {
  word: string;
  address?: string;
  compact?: boolean;
  variant?: "display" | "picker";
  tokenId?: number;
  wordOnly?: boolean;
  label?: string | null;
  className?: string;
}) {
  const normalizedWord = word || "PLATE";
  const clubhouse = useClubhouse();
  const insignia = useMemo(
    () =>
      clubhouse && address?.startsWith("C")
        ? derivePlateInsignia(address)
        : undefined,
    [clubhouse, address],
  );
  const finish = clubhouse
    ? plateFinishAttributes(address, normalizedWord)
    : undefined;
  const visibleAddress = address || `C${"·".repeat(47)}${normalizedWord}`;
  const traits = deriveContractPlateTraits(address);
  const plateStyle = {
    "--insignia-word-limit": `${66 / normalizedWord.length}cqw`,
    "--plate-ink": traits.ink,
    "--plate-pattern-color": traits.patternColor,
    "--plate-pattern-scale": `${traits.patternScale}px`,
    "--plate-pattern-wide": `${Math.round(traits.patternScale * 1.4)}px`,
    "--plate-pattern-wider": `${Math.round(traits.patternScale * 1.7)}px`,
    "--plate-pattern-arc-a": `${Math.round(traits.patternScale * 1.8)}px`,
    "--plate-pattern-arc-b": `${Math.round(traits.patternScale * 2.2)}px`,
  } as CSSProperties;
  const addressFontSize = normalizedWord.length > 8
    ? Math.max(
      compact ? 9 : 11,
      Math.min(
        compact ? 25 : 36,
        (compact ? 570 : 760) / normalizedWord.length,
      ),
    )
    : undefined;

  return (
    <div
      {...finish}
      className={`contract-plate ${
        clubhouse
          ? ""
          : `plate-pattern-${traits.pattern} plate-rarity-${traits.rarity}`
      } ${compact || variant === "picker" ? "is-compact" : ""} ${
        variant === "picker" ? "is-picker" : ""
      } ${className}`.trim()}
      data-plate-pattern={clubhouse ? undefined : traits.pattern}
      data-plate-rarity={traits.rarity}
      data-shared-rarity={clubhouse ? traits.rarity : undefined}
      data-plate-rarity-signature={traits.raritySignature}
      data-plate-insignia={insignia?.finish.id}
      style={{ ...plateStyle, ...finish?.style }}
    >
      {insignia && (
        <PlateInsignia appearance={insignia} rarity={traits.rarity} />
      )}
      <span className="plate-screw plate-screw-nw" aria-hidden="true" />
      <span className="plate-screw plate-screw-ne" aria-hidden="true" />
      <span className="plate-screw plate-screw-sw" aria-hidden="true" />
      <span className="plate-screw plate-screw-se" aria-hidden="true" />
      {!clubhouse && traits.rarity === "pole"
        ? (
          <span className="contract-plate-pole-mark" aria-hidden="true">
            <svg viewBox="0 0 24 18" focusable="false">
              <path d="M3 1.5v15" />
              <path d="M4 2h16v10H4z" className="pole-mark-field" />
              <path d="M4 2h4v3.33H4zm8 0h4v3.33h-4zm4 3.33h4v3.34h-4zM8 5.33h4v3.34H8zM4 8.67h4V12H4zm8 0h4V12h-4z" />
            </svg>
          </span>
        )
        : null}
      {variant === "picker"
        ? (
          <>
            <span className="contract-plate-picker-identity">
              <strong
                style={addressFontSize
                  ? { fontSize: `${addressFontSize}px` }
                  : undefined}
              >
                <b className="plate-rarity-word">{normalizedWord}</b>
              </strong>
              <code>{visibleAddress}</code>
            </span>
            {tokenId === undefined
              ? null
              : (
                <span className="contract-plate-picker-token">
                  NFT #{tokenId}
                </span>
              )}
          </>
        )
        : (
          <>
            {label ? <small>{label}</small> : null}
            <strong
              style={addressFontSize
                ? { fontSize: `${addressFontSize}px` }
                : undefined}
            >
              <b className="plate-rarity-word">{normalizedWord}</b>
            </strong>
            {!wordOnly ? <code>{visibleAddress}</code> : null}
          </>
        )}
    </div>
  );
}
