import { plateImageFrame, plateWidth } from "@/rendering/svg.ts";
/** Optional Deno/Node Chromium exporter. Never imported by browser or core entrypoints. @module */
import { type Browser, chromium } from "playwright";
import type { PngBrowser } from "@/rendering/browser-types.ts";
export type {
  PngBrowser,
  PngBrowserContext,
  PngPage,
  PngRoute,
} from "@/rendering/browser-types.ts";
import type { PlateInput } from "@/rendering/model.ts";
import { renderPlateSvg } from "@/rendering/svg.ts";
import type { PngOptions } from "@/rendering/png-options.ts";
import { VanityError } from "@/errors.ts";
export type { PngOptions } from "@/rendering/png-options.ts";
/** Local Chromium launch options. No hosted rendering service is used. */
export interface ServerPngOptions extends PngOptions {
  /** Optional existing browser owned by the caller; it is never closed here. */ browser?:
    PngBrowser;
  /** Optional installed Chromium executable; otherwise use Playwright's installed browser. */ executablePath?:
    string;
}
/**
 * Exports the canonical resting plate using local Chromium in Deno or Node.
 * Install Chromium with `deno run -A npm:playwright@1.61.0 install chromium`.
 * Requires local process/filesystem permissions and browser loopback communication.
 * No application backend, remote assets, wallet or ledger access is used.
 * Pass a caller-owned browser for batch exports; each temporary page is closed.
 */
export async function renderPlatePng(
  input: PlateInput,
  options: ServerPngOptions = {},
): Promise<Uint8Array> {
  const width = plateWidth(options.width ?? 1200);
  const svg = renderPlateSvg(input, { width });
  let ownedBrowser: Browser | undefined;
  try {
    const browser = options.browser ??
      (ownedBrowser = await chromium.launch({
        channel: "chromium",
        executablePath: options.executablePath,
      }));
    const context = await browser.newContext({
      viewport: { width, height: plateImageFrame(width).height },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    try {
      await context.route("**/*", (route) => route.abort());
      const page = await context.newPage();
      await page.setContent(
        `<style>body{margin:0}svg{display:block}</style>${svg}`,
      );
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(
          Array.from(document.images, (image) => image.decode()),
        );
      });
      return new Uint8Array(
        await page.screenshot({ omitBackground: true, animations: "disabled" }),
      );
    } finally {
      await context.close();
    }
  } catch {
    throw new VanityError(
      "VNTY_RENDER_FAILED",
      "Local Chromium could not export the plate. Install the pinned Playwright browser or provide an executablePath/browser.",
    );
  } finally {
    if (ownedBrowser) await ownedBrowser.close();
  }
}
