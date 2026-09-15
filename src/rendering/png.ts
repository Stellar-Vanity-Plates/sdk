import { plateImageFrame, plateWidth } from "@/rendering/svg.ts";
/** Browser PNG export using the canonical HTML/CSS-backed SVG. @module */
import type { PlateInput } from "@/rendering/resolve.ts";
import { renderPlateSvg } from "@/rendering/svg.ts";
import {
  BrowserDomUnavailableError,
  BrowserPngRenderError,
  CanvasContextUnavailableError,
  PngEncodingError,
  VanityError,
} from "@/errors.ts";
import type { PngOptions } from "@/rendering/png-options.ts";
export type { PngOptions } from "@/rendering/png-options.ts";
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
  const svg = await renderPlateSvg(input, { width });
  if (typeof document === "undefined") {
    throw new BrowserDomUnavailableError();
  }
  try {
    const image = new Image();
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = plateImageFrame(width).height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new CanvasContextUnavailableError();
    }
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value ? resolve(value) : reject(
            new PngEncodingError(),
          ),
        "image/png",
      )
    );
    return new Uint8Array(await blob.arrayBuffer());
  } catch (cause) {
    if (VanityError.is(cause)) throw cause;
    throw new BrowserPngRenderError(cause);
  }
}
