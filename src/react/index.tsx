/** Optional React adapter; excluded from backend and SVG entrypoints. @module */
import {
  type CSSProperties,
  type ReactElement,
  useEffect,
  useMemo,
  useState,
} from "react";
import { type PlateInput, resolvePlateInput } from "@/rendering/resolve.ts";
import type { ResolvedPlateInput } from "@/rendering/model.ts";
import type { PlatePresentation } from "@/rendering/markup.ts";
import { ResolvedPlate } from "@/react/local/index.tsx";
export { ResolvedPlate } from "@/react/local/index.tsx";
export type { ResolvedPlateProps } from "@/react/local/index.tsx";

/** React plate component properties. */
export interface PlateProps extends PlateInput, PlatePresentation {
  /** Enables rarity animation, respecting reduced motion. */ animated?:
    boolean;
  /** Class on the outer container. */ className?: string;
  /** Optional sizing/layout styles on the outer container. */ style?:
    CSSProperties;
}
/**
 * Install PlateStyles once, or load CSS emitted by /rendering/styles.
 * Resolves account/NFT display metadata when a network is supplied.
 * SSR and pending lookups abbreviate; offline suffixLength renders immediately.
 * Lookup failures reach the nearest React error boundary. Stale results are ignored.
 */
export function Plate(
  {
    address,
    suffixLength,
    rpcUrl,
    networkConfig,
    nftContractId,
    animated = false,
    variant,
    inline,
    className,
    style,
  }: PlateProps,
): ReactElement {
  const input = useMemo(
    () => ({ address, suffixLength, rpcUrl, networkConfig, nftContractId }),
    [address, suffixLength, rpcUrl, networkConfig, nftContractId],
  );
  const [result, setResult] = useState<
    { input: PlateInput; value: ResolvedPlateInput } | {
      input: PlateInput;
      error: unknown;
    }
  >();
  const online = rpcUrl !== undefined || networkConfig !== undefined;
  useEffect(() => {
    if (!online) return;
    let active = true;
    resolvePlateInput(input).then(
      (value) => {
        if (active) setResult({ input, value });
      },
      (error) => {
        if (active) setResult({ input, error });
      },
    );
    return () => {
      active = false;
    };
  }, [input, online]);
  const current = online && result?.input === input ? result : undefined;
  if (current && "error" in current) throw current.error;
  const display = current?.value ??
    { address, suffixLength: online ? undefined : suffixLength };
  return (
    <ResolvedPlate
      {...display}
      animated={animated}
      variant={variant}
      inline={inline}
      className={className}
      style={style}
      busy={online && !current}
    />
  );
}
