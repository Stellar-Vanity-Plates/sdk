/** Optional React stylesheet component. Mount once at the document root. @module */
import type { ReactElement } from "react";
import { plateSharedCss } from "@/rendering/styles/index.ts";
/** Installs shared artwork and fonts once when mounted once; accepts a CSP nonce. */
export function PlateStyles(
  { nonce }: { /** Content Security Policy nonce. */ nonce?: string } = {},
): ReactElement {
  return (
    <style
      nonce={nonce}
      data-vanity-plate-styles=""
      dangerouslySetInnerHTML={{ __html: plateSharedCss }}
    />
  );
}
