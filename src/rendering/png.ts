/** Portable PNG export, loaded separately from SVG and UI code. @module */
import { initWasm, Resvg } from "@resvg/resvg-wasm";
import { wasmBase64 } from "./vendor/resvg.ts";
import { type PlateInput, renderPlateSvg } from "./mod.ts";
/** PNG export dimensions. */
export interface PngOptions {
  /** Output width, 120–4096 pixels; default 1200. */ width?: number;
}
let initialization: Promise<void> | undefined;
/** Renders an outlined plate to PNG bytes without native libraries, network access or a browser. */
export async function renderPlatePng(
  input: PlateInput,
  options: PngOptions = {},
): Promise<Uint8Array> {
  const svg = renderPlateSvg(input, { width: options.width ?? 1200 });
  initialization ??= initWasm(
    Uint8Array.from(atob(wasmBase64), (c) => c.charCodeAt(0)),
  ).catch((error) => {
    initialization = undefined;
    throw error;
  });
  await initialization;
  const renderer = new Resvg(svg, { font: { loadSystemFonts: false } });
  try {
    const image = renderer.render();
    try {
      return image.asPng().slice();
    } finally {
      image.free();
    }
  } finally {
    renderer.free();
  }
}
