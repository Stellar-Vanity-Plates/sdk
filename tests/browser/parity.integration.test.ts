import { PlateStyles } from "@/react/styles/index.tsx";
import {
  svgFixtureDirectory,
  svgFixtureFilename,
  svgFixtures,
} from "@tools/quality/svg-fixtures.ts";
import { assert, assertEquals, assertRejects } from "@std/assert";
import { chromium, type Page } from "playwright";
import { Buffer } from "node:buffer";
// @deno-types="@types/pngjs"
import { PNG } from "pngjs";
import { StrKey } from "@colibri/core";
import { referencePage, referenceSvg } from "@tests/reference/render.tsx";
import {
  type PlateInput,
  renderPlateHtml,
  renderPlateSvg,
} from "@/rendering/index.ts";
import { renderPlatePng } from "@/rendering/png-server.ts";
import { Plate } from "@/react/index.tsx";
import { createElement } from "react";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";
// Give component and image captures the same clipped image frame. Chromium's
// fractional shadow rasterization otherwise depends on the surrounding viewport.
const captureFrame =
  `html,body{margin:0;min-width:0;min-height:0;width:100vw;height:100vh;overflow:hidden;background:transparent!important}svg{display:block}`;
function componentPage(markup: string, width: number): string {
  return `<style>${captureFrame}</style><div id="sdk-capture" style="width:${width}px;margin:32px">${markup}</div>`;
}
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
      for (let font = 0; font < 4; font++) {
        for (const run of [1, 2, 3, 4, 7]) {
          const bytes = Uint8Array.from(
            { length: 32 },
            (_, i) => (i * 37 + finish * 43 + font * 23 + run * 11) % 256,
          );
          bytes[7] = finish;
          bytes[6] = font;
          const offset = 8;
          for (let i = 0; i < 7; i++) {
            bytes[offset + i] = i < run ? 7 : 8;
          }
          const address = account
            ? StrKey.encodeEd25519PublicKey(bytes)
            : StrKey.encodeContract(bytes);
          const length = [1, 5, 12, 55][(finish + font + run) % 4];
          values.push({ address, suffixLength: length });
          if (account && font === 0 && run === 1) {
            values.push({ address });
          }
        }
      }
    }
  }
  values.unshift({
    address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
    suffixLength: 6,
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
        const componentSize = {
          width: width + 64,
          height: Math.ceil(width / 2.9) + 64,
        };
        const imageSize = { width, height: Math.ceil((width - 64) / 2.9) + 64 };
        for (const [index, input] of fixtures().entries()) {
          await page.setViewportSize(componentSize);
          await page.setContent(
            referencePage(input, width) +
              `<style>${captureFrame}#capture{margin:32px}</style>`,
          );
          await ready(page);
          const expectedComponent = await page.screenshot({
            omitBackground: true,
          });
          await page.setContent(
            componentPage(await renderPlateHtml(input), width),
          );
          await ready(page);
          samePixels(
            await page.screenshot({ omitBackground: true }),
            expectedComponent,
            `HTML width=${width} case=${index}`,
          );
          comparisons++;

          await page.setViewportSize(imageSize);
          const referenceImage = referenceSvg(input, width);
          await page.setContent(
            `<style>${captureFrame}</style>${referenceImage}`,
          );
          await ready(page);
          const expectedImage = await page.screenshot({ omitBackground: true });
          await page.setContent(
            `<style>${captureFrame}</style>${await renderPlateSvg(input, {
              width,
            })}`,
          );
          await ready(page);
          samePixels(
            await page.screenshot({ omitBackground: true }),
            expectedImage,
            `SVG width=${width} case=${index}`,
          );
          comparisons++;

          if (index % 29 === 0) {
            await page.setViewportSize(componentSize);
            await page.setContent(
              componentPage(
                renderToStaticMarkup(createElement(PlateStyles)) +
                  renderToStaticMarkup(createElement(Plate, input)),
                width,
              ),
            );
            await ready(page);
            samePixels(
              await page.screenshot({ omitBackground: true }),
              expectedComponent,
              `React width=${width} case=${index}`,
            );
            comparisons++;
            await page.setContent(componentPage("", width));
            await page.addScriptTag({ content: fixture, type: "module" });
            await page.waitForFunction(() =>
              customElements.get("vanity-plate")
            );
            await page.evaluate((input) => {
              const plate = document.createElement("vanity-plate");
              plate.setAttribute("address", input.address);
              if (input.suffixLength) {
                plate.setAttribute("suffix-length", String(input.suffixLength));
              }
              document.querySelector("#sdk-capture")!.append(plate);
            }, input);
            await ready(page);
            await page.locator("vanity-plate img").evaluate(async (image) => {
              await (image as HTMLImageElement).decode();
            });
            samePixels(
              await page.screenshot({ omitBackground: true }),
              expectedComponent,
              `web width=${width} case=${index}`,
            );
            comparisons++;

            // Transport the original app through the same browser Canvas path.
            // This leaves the full scene comparison strict without confusing
            // native DOM and Canvas antialiasing with a design difference.
            const referencePng = await page.evaluate(async (svg) => {
              const image = new Image();
              image.src = `data:image/svg+xml;charset=utf-8,${
                encodeURIComponent(svg)
              }`;
              await image.decode();
              const canvas = document.createElement("canvas");
              canvas.width = image.width;
              canvas.height = image.height;
              canvas.getContext("2d")!.drawImage(image, 0, 0);
              const blob = await new Promise<Blob>((resolve) =>
                canvas.toBlob((value) => resolve(value!))
              );
              return Array.from(new Uint8Array(await blob.arrayBuffer()));
            }, referenceImage);
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
              new Uint8Array(referencePng),
              `browser PNG width=${width} case=${index}`,
            );
            comparisons++;
            samePixels(
              await renderPlatePng(input, { width, browser }),
              expectedImage,
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
        viewport: { width: 664, height: 271 },
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
                `<style>${captureFrame}#capture{margin:32px}</style>`
              : componentPage(
                await renderPlateHtml(input, { animated: true }),
                600,
              ),
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
        `<style>body{margin:0}</style>${await renderPlateHtml(fixtures()[4], {
          animated: true,
        })}`,
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
        plate.setAttribute("suffix-length", String(input.suffixLength));
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

Deno.test({
  name:
    "saved SVG baselines render like the independent webapp for all 160 visual combinations",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const browser = await chromium.launch({
      channel: "chromium",
      executablePath: Deno.env.get("VNTY_CHROMIUM"),
    });
    try {
      const page = await browser.newPage({
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
      });
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      const cases = svgFixtures.filter((fixture) =>
        fixture.coverage === "traits"
      );
      for (const sample of cases) {
        const width = sample.options.width ?? 600;
        await page.setViewportSize({
          width,
          height: Math.ceil((width - 64) / 2.9) + 64,
        });
        await page.setContent(
          `<style>${captureFrame}</style>${referenceSvg(sample.input, width)}`,
        );
        await ready(page);
        const expected = await page.screenshot({ omitBackground: true });
        const saved = await Deno.readTextFile(
          new URL(svgFixtureFilename(sample), svgFixtureDirectory),
        );
        await page.setContent(`<style>${captureFrame}</style>${saved}`);
        await ready(page);
        samePixels(
          await page.screenshot({ omitBackground: true }),
          expected,
          `saved SVG ${sample.id}`,
        );
      }
      assertEquals(errors, []);
      console.log(
        `${cases.length} saved SVG baselines are pixel-identical to the independent webapp renderer.`,
      );
    } finally {
      await browser.close();
    }
  },
});
