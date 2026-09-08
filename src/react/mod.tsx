/** Optional React adapter; excluded from backend and SVG entrypoints. @module */
import { type CSSProperties, type ReactElement, useId, useMemo } from "react";
import { type PlateInput, renderPlateSvg } from "../rendering/mod.ts";

/** React plate component properties. */
export interface PlateProps extends PlateInput {
  /** Enables the address's rarity animation, respecting reduced motion. */ animated?:
    boolean;
  /** Class on the outer container. */ className?: string;
  /** Optional sizing/layout styles on the outer container. */ style?:
    CSSProperties;
}
/** Renders a responsive, accessible plate using the shared standalone SVG renderer. Supports SSR. */
export function Plate(
  { address, suffix, suffixLength, animated = false, className, style }:
    PlateProps,
): ReactElement {
  const reactId = useId();
  const idPrefix = `vnty-${
    Array.from(reactId, (c) => c.charCodeAt(0).toString(16)).join("-")
  }`;
  const svg = useMemo(
    () =>
      renderPlateSvg({ address, suffix, suffixLength }, { animated, idPrefix })
        .replace("<svg ", '<svg style="display:block;width:100%;height:auto" '),
    [address, suffix, suffixLength, animated, idPrefix],
  );
  return (
    <div
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
