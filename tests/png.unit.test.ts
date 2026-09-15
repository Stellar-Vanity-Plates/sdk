import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { stub } from "@std/testing/mock";
import { StrKey } from "@colibri/core";
import { type Browser, chromium } from "playwright";
import { renderPlatePng as browserPng } from "@/rendering/png.ts";
import {
  type PngBrowser,
  renderPlatePng as serverPng,
} from "@/rendering/png-server.ts";
import { ServerPngRenderError } from "@/errors.ts";
const plate = {
  address: StrKey.encodeContract(new Uint8Array(32)),
  suffixLength: 3,
};

describe("PNG rendering boundaries", () => {
  it("draws and encodes a browser PNG at the requested size", async () => {
    const documentDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "document",
    );
    const imageDescriptor = Object.getOwnPropertyDescriptor(
      globalThis,
      "Image",
    );
    const bytes = new Uint8Array([137, 80, 78, 71]);
    let drawn = false;
    class ImageFixture {
      src = "";
      decode() {
        assert(this.src.startsWith("data:image/svg+xml"));
        return Promise.resolve();
      }
    }
    const canvas = {
      width: 0,
      height: 0,
      getContext: (kind: string) => {
        assertEquals(kind, "2d");
        return {
          drawImage(image: ImageFixture, x: number, y: number) {
            assert(image instanceof ImageFixture);
            assertEquals([x, y], [0, 0]);
            drawn = true;
          },
        };
      },
      toBlob(callback: (blob: Blob) => void, type: string) {
        assertEquals(type, "image/png");
        callback(new Blob([bytes]));
      },
    };
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        createElement(name: string) {
          assertEquals(name, "canvas");
          return canvas;
        },
      },
    });
    Object.defineProperty(globalThis, "Image", {
      configurable: true,
      value: ImageFixture,
    });
    try {
      assertEquals(await browserPng(plate, { width: 600 }), bytes);
      assert(drawn);
      assertEquals(canvas.width, 600);
      assert(canvas.height > 0);
    } finally {
      for (
        const [key, descriptor] of [["document", documentDescriptor], [
          "Image",
          imageDescriptor,
        ]] as const
      ) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    }
  });
  it("blocks requests, awaits assets and closes exactly the resources it owns", async () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    let decoded = 0, aborted = 0, contextsClosed = 0, browsersClosed = 0;
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        fonts: { ready: Promise.resolve() },
        images: [{
          decode() {
            decoded++;
            return Promise.resolve();
          },
        }],
      },
    });
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const browser: PngBrowser & { close(): Promise<void> } = {
      newContext(options) {
        assertEquals(options.deviceScaleFactor, 1);
        assertEquals(options.reducedMotion, "reduce");
        return Promise.resolve({
          route(pattern, handler) {
            assertEquals(pattern, "**/*");
            return handler({
              abort() {
                aborted++;
                return Promise.resolve();
              },
            });
          },
          newPage: () =>
            Promise.resolve({
              setContent(html) {
                assert(html.includes("<svg"));
                return Promise.resolve();
              },
              evaluate: (callback) => callback(),
              screenshot(options) {
                assertEquals(options, {
                  omitBackground: true,
                  animations: "disabled",
                });
                return Promise.resolve(bytes);
              },
            }),
          close() {
            contextsClosed++;
            return Promise.resolve();
          },
        });
      },
      close() {
        browsersClosed++;
        return Promise.resolve();
      },
    };
    using launch = stub(
      chromium,
      "launch",
      () => Promise.resolve(browser as Browser),
    );
    try {
      assertEquals(await serverPng(plate, { browser }), bytes);
      assertEquals([contextsClosed, browsersClosed], [1, 0]);
      assertEquals(await serverPng(plate), bytes);
      assertEquals([contextsClosed, browsersClosed, aborted, decoded], [
        2,
        1,
        2,
        2,
      ]);
      assertEquals(launch.calls.length, 1);
    } finally {
      if (descriptor) Object.defineProperty(globalThis, "document", descriptor);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });
  it("preserves launch failure without trying to close an uncreated browser", async () => {
    const cause = new Error("Chromium unavailable");
    using _launch = stub(chromium, "launch", () => Promise.reject(cause));
    const error = await assertRejects(
      () => serverPng(plate),
      ServerPngRenderError,
    );
    assertEquals(error.cause, cause);
    assertEquals(error.meta?.cleanupCauses, []);
  });
});
