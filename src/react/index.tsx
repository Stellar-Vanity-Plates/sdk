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
import { renderResolvedPlateHtml } from "@/rendering/html.ts";

/** React plate component properties. */
export interface PlateProps extends PlateInput {
  /** Enables rarity animation, respecting reduced motion. */ animated?:
    boolean;
  /** Class on the outer container. */ className?: string;
  /** Optional sizing/layout styles on the outer container. */ style?:
    CSSProperties;
}
/**
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
  const html = renderResolvedPlateHtml(display, { animated });
  return (
    <div
      className={className}
      style={style}
      aria-busy={online && !current}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
