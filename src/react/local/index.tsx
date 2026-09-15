/** Synchronous React plates. No network lookup or font assets. @module */
import { type CSSProperties, type ReactElement, useMemo } from "react";
import {
  type PlatePresentation,
  renderResolvedPlateHtml,
} from "@/rendering/markup.ts";
import type { ResolvedPlateInput } from "@/rendering/model.ts";
/** Properties for an offline or already resolved React plate. */
export interface ResolvedPlateProps
  extends ResolvedPlateInput, PlatePresentation {
  /** Class on the outer container. */ className?: string;
  /** Layout and sizing styles. */ style?: CSSProperties;
  /** Indicates an enclosing lookup is pending. */ busy?: boolean;
}
/** Renders immediately on server and client. Install PlateStyles once in the document. */
export function ResolvedPlate(
  {
    address,
    suffixLength,
    animated,
    variant,
    inline,
    className,
    style,
    busy = false,
  }: ResolvedPlateProps,
): ReactElement {
  const html = useMemo(
    () =>
      renderResolvedPlateHtml({ address, suffixLength }, {
        animated,
        variant,
        inline,
      }),
    [address, suffixLength, animated, variant, inline],
  );
  const Container = inline ? "span" : "div";
  return (
    <Container
      className={className}
      style={style}
      aria-busy={busy}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
