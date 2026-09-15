import type { CSSProperties, ReactElement } from "react";
import type { PlatePresentation } from "@/rendering/markup.ts";
import { usePlate, type UsePlateOptions } from "@/react/use-plate.ts";
import { PlateView } from "@/react/plate-view.tsx";

/** One component for automatically loaded, cached, or explicitly supplied plate data. */
export type PlateProps = UsePlateOptions & PlatePresentation & {
  /** Class on the outer container. */ className?: string;
  /** Sizing/layout styles on the outer container. */ style?: CSSProperties;
};
/** Internal address-driven adapter over the shared query hook. */
function LookupPlate(props: PlateProps): ReactElement {
  const result = usePlate(props);
  if (result.error) throw result.error;
  const display = result.data ?? { address: props.address! };
  return (
    <PlateView
      {...display}
      animated={props.animated}
      variant={props.variant}
      inline={props.inline}
      className={props.className}
      style={props.style}
      busy={result.isPending}
    />
  );
}

/**
 * Install PlateStyles once. Address inputs share cached queries; explicit data
 * renders immediately, skipping query subscriptions and cache allocation.
 * Without a network, count-only inputs render locally. Initial SSR without
 * prefetched data abbreviates and never fetches during render.
 * Query failures reach the nearest React error boundary.
 */
export function Plate(props: PlateProps): ReactElement {
  return props.data !== undefined
    ? <PlateView {...props} {...props.data} />
    : <LookupPlate {...props} />;
}
