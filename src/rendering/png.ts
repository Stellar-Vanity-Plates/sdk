import { plateWidth } from "@/rendering/svg.ts";
/** Browser PNG export using the canonical HTML/CSS-backed SVG. @module */
import { type PlateInput, renderPlateSvg } from "@/rendering/mod.ts";
import { VanityError } from "@/errors.ts";
/** PNG export dimensions. */
export interface PngOptions {
  /** Output width, 120–4096 pixels; default 1200. */ width?: number;
}
/**
 * Renders the canonical plate to PNG in a browser, entirely locally.
 * For Deno/Node without a DOM, import the same function from ./png/server.
 * Exports the resting frame; hover animations remain in the web components.
 */
export async function renderPlatePng(
  input: PlateInput,
  options: PngOptions = {},
): Promise<Uint8Array> {
  const width = plateWidth(options.width ?? 1200);
  const svg = renderPlateSvg(input, { width });
  if (typeof document === "undefined") {
    throw new VanityError(
      "VNTY_RENDER_FAILED",
      "A browser DOM is required. In Deno/Node, use @vanity-plates/sdk/png/server with local Chromium installed.",
    );
  }
  try {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.round(width / 2.9);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(new Error("PNG encoding failed")),
        "image/png",
      )
    );
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    throw new VanityError(
      "VNTY_RENDER_FAILED",
      "The browser could not render the canonical plate PNG.",
    );
  }
}
