import { assert, assertEquals, assertRejects } from "@std/assert";
import { chromium, type Page } from "playwright";
import { Buffer } from "node:buffer";
// @deno-types="@types/pngjs"
import { PNG } from "pngjs";
import { StrKey } from "@colibri/core";
import { referencePage } from "@tests/reference/render.tsx";
import {
  type PlateInput,
  renderPlateHtml,
  renderPlateSvg,
} from "@/rendering/mod.ts";
import { renderPlatePng } from "@/rendering/png-server.ts";
import { Plate } from "@/react/mod.tsx";
import { createElement } from "react";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";
// Give component and image captures the same clipped image frame. Chromium's
// fractional shadow rasterization otherwise depends on the surrounding viewport.
const captureFrame =
  `html,body{margin:0;min-width:0;min-height:0;width:100vw;height:100vh;overflow:hidden;background:transparent!important}svg{display:block}`;
const fixture = await Deno.readTextFile("dist/test/consumer.js");
async function ready(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, (image) => image.decode()));
  });
}
function samePixels(actual: Uint8Array, expected: Uint8Array, label: string) {
  const a = PNG.sync.read(Buffer.from(actual)),
    b = PNG.sync.read(Buffer.from(expected));
  assertEquals([a.width, a.height], [b.width, b.height], label);
  let changed = 0;
  const firstDifferences: unknown[] = [];
  for (let i = 0; i < a.data.length; i += 4) {
    if (
      a.data.subarray(i, i + 4).some((value: number, j: number) =>
        value !== b.data[i + j]
      )
    ) {
      changed++;
      if (firstDifferences.length < 12) {
        firstDifferences.push({
          x: i / 4 % a.width,
          y: Math.floor(i / 4 / a.width),
          actual: Array.from(a.data.subarray(i, i + 4)),
          expected: Array.from(b.data.subarray(i, i + 4)),
        });
      }
    }
  }
  if (changed) {
    console.error(label, firstDifferences);
    Deno.mkdirSync("output/parity", { recursive: true });
    Deno.writeFileSync(
      `output/parity/${label.replace(/[^a-zA-Z0-9-]/g, "_")}-actual.png`,
      actual,
    );
    Deno.writeFileSync(
      `output/parity/${label.replace(/[^a-zA-Z0-9-]/g, "_")}-expected.png`,
      expected,
    );
  }
  assertEquals(
    changed,
    0,
    `${label}: mismatched pixels (output/parity contains the failing pair)`,
  );
}
function fixtures(): PlateInput[] {
  const values: PlateInput[] = [];
  for (const account of [false, true]) {
    for (let finish = 0; finish < 4; finish++) {
      for (let font = 0; font < (account ? 3 : 4); font++) {
        for (const run of [1, 2, 3, 4, 7]) {
          const bytes = Uint8Array.from(
            { length: 32 },
            (_, i) => (i * 37 + finish * 43 + font * 23 + run * 11) % 256,
          );
          bytes[account ? 12 : 15] = finish;
          bytes[account ? 13 : 12] = font;
          const offset = account ? 14 : 5;
          for (let i = 0; i < 7; i++) {
            bytes[offset + i] = i < run ? 7 : 8;
          }
          const address = account
            ? StrKey.encodeEd25519PublicKey(bytes)
            : StrKey.encodeContract(bytes);
          const length = [1, 5, 12, 55][(finish + font + run) % 4];
          values.push({ address, suffix: address.slice(-length) });
          if (account && font === 0 && run === 1) {
            values.push({ address });
          }
        }
      }
    }
  }
  values.unshift({
    address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
    suffix: "PLATES",
  });
  return values;
}
Deno.test({
  name:
    "canonical webapp parity: HTML, SVG, React, web component and both PNG exporters",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const browser = await chromium
      .launch({
        channel: "chromium",
        executablePath: Deno.env.get("VNTY_CHROMIUM"),
      });
    try {
      const context = await browser.newContext({
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      let comparisons = 0;
      for (const width of [320, 600]) {
        for (const [index, input] of fixtures().entries()) {
          const height = Math.round(width / 2.9);
          await page.setViewportSize({ width, height });
          await page.setContent(
            referencePage(input, width) + `<style>${captureFrame}</style>`,
          );
          await ready(page);
          const expected = await page.screenshot({ omitBackground: true });
          for (const mode of ["html", "svg"]) {
            await page.setContent(
              `<style>${captureFrame}</style>${
                mode === "html"
                  ? renderPlateHtml(input)
                  : renderPlateSvg(input, { width })
              }`,
            );
            await ready(page);
            samePixels(
              await page.screenshot({ omitBackground: true }),
              expected,
              `${mode} width=${width} case=${index}`,
            );
            comparisons++;
          }
          if (index % 29 === 0) {
            await page.setContent(
              `<style>${captureFrame}</style>${
                renderToStaticMarkup(createElement(Plate, input))
              }`,
            );
            await ready(page);
            samePixels(
              await page.screenshot({ omitBackground: true }),
              expected,
              `React width=${width} case=${index}`,
            );
            comparisons++;
            await page.setContent(
              `<style>${captureFrame}</style>`,
            );
            await page.addScriptTag({ content: fixture, type: "module" });
            await page.waitForFunction(() =>
              customElements.get("vanity-plate")
            );
            await page.evaluate((input) => {
              const plate = document.createElement("vanity-plate");
              plate.setAttribute("address", input.address);
              if (input.suffix) plate.setAttribute("suffix", input.suffix);
              document.body.append(plate);
            }, input);
            await ready(page);
            await page.locator("vanity-plate img").evaluate(async (image) => {
              await (image as HTMLImageElement).decode();
            });
            samePixels(
              await page.screenshot({ omitBackground: true }),
              expected,
              `web width=${width} case=${index}`,
            );
            comparisons++;
            const png = await page.evaluate(async (input) => {
              const api = (globalThis as unknown as {
                sdkTest: {
                  renderPlatePng: (
                    input: PlateInput,
                    options: { width: number },
                  ) => Promise<Uint8Array>;
                };
              }).sdkTest;
              return Array.from(
                await api.renderPlatePng(input.plate, { width: input.width }),
              );
            }, { plate: input, width });
            samePixels(
              new Uint8Array(png),
              expected,
              `browser PNG width=${width} case=${index}`,
            );
            comparisons++;
            samePixels(
              await renderPlatePng(input, { width, browser }),
              expected,
              `server PNG width=${width} case=${index}`,
            );
            comparisons++;
          }
        }
      }
      assertEquals(errors, []);
      console.log(
        `${comparisons} exact pixel comparisons across ${fixtures().length} fixtures, 320/600px.`,
      );
      // Invalid inputs fail before launch; externally supplied browsers remain usable.
      await assertRejects(() =>
        renderPlatePng({ address: "invalid" }, { browser })
      );
      assert(browser.isConnected());
      await context.close();
    } finally {
      await browser.close();
    }
  },
});

Deno.test({
  name: "canonical hover motion, reduced-motion and invalid-input recovery",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const browser = await chromium
      .launch({
        channel: "chromium",
        executablePath: Deno.env.get("VNTY_CHROMIUM"),
      });
    try {
      const page = await browser.newPage({
        viewport: { width: 600, height: 207 },
        deviceScaleFactor: 1,
        reducedMotion: "no-preference",
      });
      for (
        const input of fixtures().filter((_, i) =>
          [4, 23, 42, 61, 86, 103, 120, 140].includes(i)
        )
      ) {
        const states: { names: string[]; pixels: Uint8Array }[] = [];
        for (const reference of [true, false]) {
          await page.setContent(
            reference
              ? referencePage(input, 600, true) +
                `<style>${captureFrame}</style>`
              : `<style>${captureFrame}</style>${
                renderPlateHtml(input, { animated: true })
              }`,
          );
          await ready(page);
          await page.locator(".contract-plate,.account-plate").hover();
          const names = await page.evaluate(() => {
            const animations = document.getAnimations();
            for (const animation of animations) {
              animation.pause();
              animation.currentTime = 1000;
            }
            return animations.map((animation) =>
              (animation as CSSAnimation).animationName
            ).sort();
          });
          states.push({
            names,
            pixels: await page.screenshot({ omitBackground: true }),
          });
        }
        assert(states[0].names.length > 0);
        assertEquals(states[1].names, states[0].names);
        samePixels(
          states[1].pixels,
          states[0].pixels,
          `hover ${input.address}`,
        );
      }
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.setContent(
        `<style>body{margin:0}</style>${
          renderPlateHtml(fixtures()[4], { animated: true })
        }`,
      );
      await ready(page);
      await page.locator(".contract-plate").hover();
      assertEquals(
        await page.evaluate(() => document.getAnimations().length),
        0,
      );
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await page.setContent("<style>body{margin:0}</style>");
      await page.addScriptTag({ content: fixture, type: "module" });
      await page.waitForFunction(() => customElements.get("vanity-plate"));
      const recovered = await page.evaluate((input) => {
        let failures = 0;
        const plate = document.createElement("vanity-plate");
        plate.addEventListener("plate-error", () => failures++);
        document.body.append(plate);
        plate.setAttribute("address", "invalid");
        const message = plate.shadowRoot!.textContent!.includes(
          "Plate unavailable",
        );
        plate.setAttribute("suffix", input.suffix!);
        plate.setAttribute("address", input.address);
        return {
          message,
          failures,
          valid: Boolean(plate.shadowRoot!.querySelector(".contract-plate")),
          fonts:
            document.querySelectorAll("style[data-vanity-plate-fonts]").length,
        };
      }, fixtures()[0]);
      assert(recovered.message && recovered.failures > 0 && recovered.valid);
      assertEquals(recovered.fonts, 1);
      await ready(page);
      await page.locator(".contract-plate").hover();
      assertEquals(
        await page.evaluate(() => document.getAnimations().length),
        0,
      );
    } finally {
      await browser.close();
    }
  },
});
