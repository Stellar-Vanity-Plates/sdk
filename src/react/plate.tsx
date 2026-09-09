/** Optional React adapter; excluded from backend and SVG entrypoints. @module */
import { type CSSProperties, type ReactElement, useMemo } from "react";
import { type PlateInput, renderPlateHtml } from "@/rendering/mod.ts";

/** React plate component properties. */
export interface PlateProps extends PlateInput {
  /** Enables the address's rarity animation, respecting reduced motion. */ animated?:
    boolean;
  /** Class on the outer container. */ className?: string;
  /** Optional sizing/layout styles on the outer container. */ style?:
    CSSProperties;
}
/** Renders a responsive, accessible plate using the canonical webapp HTML and CSS. Supports SSR. */
export function Plate(
  { address, suffix, suffixLength, animated = false, className, style }:
    PlateProps,
): ReactElement {
  const html = useMemo(
    () => renderPlateHtml({ address, suffix, suffixLength }, { animated }),
    [address, suffix, suffixLength, animated],
  );
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
