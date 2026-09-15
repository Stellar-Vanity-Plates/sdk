import { assert, assertEquals } from "@std/assert";
import { chromium } from "playwright";
import { StrKey } from "@colibri/core/strkey";
import { createElement } from "react";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";
import { Plate } from "@/react/index.tsx";
import { PlateStyles } from "@/react/styles/index.tsx";
import { renderResolvedPlateHtml } from "@/rendering/local/index.ts";
import { plateSharedCss } from "@/rendering/styles/index.ts";

Deno.test("compact, picker and inline artwork share real browser styles across React and HTML", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 760, height: 1000 },
      deviceScaleFactor: 1,
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const inputs = [
      StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(7)),
      StrKey.encodeContract(new Uint8Array(32).fill(19)),
    ].map((address) => ({ address, suffixLength: 5 }));
    const frame = (html: string) =>
      `<style>html,body{margin:0;background:#faf9f3}*{box-sizing:border-box}.frame{width:320px;padding:32px}.frame .vnty-plate-root[data-inline="true"]{width:100%}</style><div class="frame">${html}</div>`;
    for (const input of inputs) {
      for (const variant of ["display", "compact", "picker"] as const) {
        for (const inline of [false, true]) {
          const options = { variant, inline, animated: false };
          await page.setContent(
            frame(
              `<style>${plateSharedCss}</style>${
                renderResolvedPlateHtml(input, options)
              }`,
            ),
          );
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(Array.from(document.images, (i) => i.decode()));
          });
          const html = await page.locator(".frame").screenshot();
          const properties = await page.locator(".vnty-plate-root").evaluate(
            (root) => {
              const screw = root.querySelector(".plate-screw")!;
              const heading = root.querySelector(
                ".account-plate-label,.contract-plate>small",
              )!;
              return {
                tag: root.tagName,
                screw: getComputedStyle(screw).width,
                heading: getComputedStyle(heading).visibility,
                width: root.getBoundingClientRect().width,
              };
            },
          );
          assertEquals(properties.tag, inline ? "SPAN" : "DIV");
          assertEquals(properties.width, 256);
          if (variant !== "display") assertEquals(properties.screw, "5px");
          assertEquals(
            properties.heading,
            variant === "picker" ? "hidden" : "visible",
          );
          await page.setContent(
            frame(
              renderToStaticMarkup(createElement(PlateStyles)) +
                renderToStaticMarkup(
                  createElement(Plate, { data: input, ...options }),
                ),
            ),
          );
          await page.evaluate(async () => {
            await document.fonts.ready;
            await Promise.all(Array.from(document.images, (i) => i.decode()));
          });
          assertEquals(
            await page.locator(".frame").screenshot(),
            html,
            `${input.address[0]} ${variant} inline=${inline}`,
          );
        }
      }
    }
    await page.setContent(
      `<style>${plateSharedCss}body{background:#faf9f3;padding:32px;margin:0;font-family:system-ui;color:#193f36}.grid{display:grid;grid-template-columns:1fr 1fr;gap:32px}.sample{min-width:0}.sample h2{font-size:14px;font-weight:500}</style><div class="grid">${
        inputs.flatMap((input) =>
          (["display", "compact", "picker"] as const).map((variant) =>
            `<section class="sample"><h2>${input.address[0]} · ${variant}</h2>${
              renderResolvedPlateHtml(input, { variant })
            }</section>`
          )
        ).join("")
      }</div>`,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(Array.from(document.images, (i) => i.decode()));
    });
    await Deno.mkdir("output", { recursive: true });
    await page.screenshot({
      path: "output/presentation-variants.png",
      fullPage: true,
    });
    assert((await page.locator('[role="img"]').count()) === 6);
  } finally {
    await browser.close();
  }
});
