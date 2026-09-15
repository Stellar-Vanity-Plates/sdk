import { assertEquals, assertRejects } from "@std/assert";
import { StrKey } from "@colibri/core";
import { ServerPngCleanupError, ServerPngRenderError } from "@sdk";
import {
  type PngBrowser,
  renderPlatePng as serverPng,
} from "@/rendering/png-server.ts";
const address = StrKey.encodeContract(new Uint8Array(32));
const plate = { address, suffixLength: 3 };

Deno.test("server PNG preserves the original failure when cleanup also fails", async () => {
  const cause = new Error("screenshot failed");
  const cleanupCause = new Error("context close failed");
  let renderFails = true, closes = 0;
  const browser: PngBrowser = {
    newContext: () =>
      Promise.resolve({
        route: () => Promise.resolve(),
        newPage: () =>
          Promise.resolve({
            setContent: () => Promise.resolve(),
            evaluate: () => Promise.resolve(),
            screenshot: () =>
              renderFails
                ? Promise.reject(cause)
                : Promise.resolve(new Uint8Array([1])),
          }),
        close: () => {
          closes++;
          return Promise.reject(cleanupCause);
        },
      }),
  };
  const render = await assertRejects(
    () => serverPng(plate, { browser }),
    ServerPngRenderError,
  );
  assertEquals(render.code, "VNTY_021");
  assertEquals(render.cause, cause);
  assertEquals(render.meta?.cleanupCauses, [cleanupCause]);
  renderFails = false;
  const cleanup = await assertRejects(
    () => serverPng(plate, { browser }),
    ServerPngCleanupError,
  );
  assertEquals(cleanup.code, "VNTY_027");
  assertEquals(cleanup.cause, cleanupCause);
  assertEquals(closes, 2);
});
