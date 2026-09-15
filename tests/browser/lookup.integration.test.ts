import { assertEquals } from "@std/assert";
import { chromium, type Route } from "playwright";
import {
  buildAccountLedgerKey,
  buildDataLedgerKey,
  StrKey,
} from "@colibri/core";
import { ACCOUNT_SUFFIX_DATA_KEY } from "@/accounts/index.ts";
import { rpcFixture } from "@tests/fixtures/account-rpc.ts";
import type { HtmlOptions, PlateInput, SvgOptions } from "@/rendering/index.ts";
import type { PngOptions } from "@/rendering/png-options.ts";
import type { PlateProps } from "@/react/index.tsx";
import type { VanityPlateElement } from "@/web/index.ts";

declare global {
  var lookupTest: {
    react(props: PlateProps): void;
    unmount(): void;
    network(rpcUrl: string): NonNullable<PlateProps["networkConfig"]>;
  };
  var plateErrors: number;
  var sdkTest: {
    renderPlateHtml(input: PlateInput, options?: HtmlOptions): Promise<string>;
    renderPlateSvg(input: PlateInput, options?: SvgOptions): Promise<string>;
    renderPlatePng(
      input: PlateInput,
      options?: PngOptions,
    ): Promise<Uint8Array>;
  };
}
const address = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const abbreviation = `${address.slice(0, 6)}…${address.slice(-6)}`;
const bundle = await Deno.readTextFile("dist/test/consumer.js");
async function ledgerReply(route: Route, count?: string) {
  const { latestLedger, entries } = await rpcFixture(
    count === undefined ? undefined : new TextEncoder().encode(count),
  ).getLedgerEntries(
    buildAccountLedgerKey({ accountId: address }),
    buildDataLedgerKey({
      accountId: address,
      dataName: ACCOUNT_SUFFIX_DATA_KEY,
    }),
  );
  await route.fulfill({
    json: {
      jsonrpc: "2.0",
      id: route.request().postDataJSON().id,
      result: {
        latestLedger,
        entries: entries.map((entry) => ({
          key: entry.key.toXdr("base64"),
          xdr: entry.val.toXdr("base64"),
          lastModifiedLedgerSeq: 100,
        })),
      },
    },
  });
}
Deno.test({
  name:
    "web and React resolve RPC metadata, honor offline fallback, and ignore stale results",
  sanitizeOps: false,
  sanitizeResources: false,
  fn: async () => {
    const browser = await chromium.launch({
      channel: "chromium",
      executablePath: Deno.env.get("VNTY_CHROMIUM"),
    });
    try {
      const page = await browser.newPage();
      const pending: Route[] = [];
      let slowReady = Promise.withResolvers<void>();
      const failures: string[] = [];
      page.on("pageerror", (error) => failures.push(error.message));
      await page.route("https://rpc.example.test/**", async (route) => {
        const body = route.request().postDataJSON();
        if (body.method === "getNetwork") {
          await route.fulfill({
            json: {
              jsonrpc: "2.0",
              id: body.id,
              result: { passphrase: "Test SDF Network ; September 2015" },
            },
          });
        } else {
          assertEquals(body.method, "getLedgerEntries");
          if (route.request().url().endsWith("/slow")) {
            pending.push(route);
            if (pending.length === 2) slowReady.resolve();
          } else if (route.request().url().endsWith("/error")) {
            await route.fulfill({ status: 503, body: "unavailable" });
          } else {
            await ledgerReply(
              route,
              route.request().url().endsWith("/empty") ? undefined : "7",
            );
          }
        }
      });
      await page.setContent(
        '<div id="react"></div><vanity-plate id="web"></vanity-plate>',
      );
      await page.addScriptTag({ content: bundle, type: "module" });
      await page.waitForFunction(() => Boolean(globalThis.lookupTest));
      await page.evaluate((address) => {
        globalThis.plateErrors = 0;
        const plate = document.querySelector("#web")!;
        plate.addEventListener("plate-error", () => globalThis.plateErrors++);
        plate.setAttribute("address", address);
        plate.setAttribute("suffix-length", "3");
        lookupTest.react({ address, suffixLength: 3 });
      }, address);
      const web = page.locator("#web .account-plate-word");
      const react = page.locator("#react .account-plate-word");
      await page.waitForFunction(
        (label) =>
          document.querySelector("#react .account-plate-word")?.textContent ===
            label,
        address.slice(-3),
      );
      assertEquals(await web.textContent(), address.slice(-3));
      // RPC URL resolves via getNetwork. Slow old responses must not replace fast new results.
      await page.evaluate((address) => {
        document.querySelector("#web")!.setAttribute(
          "rpc-url",
          "https://rpc.example.test/slow",
        );
        lookupTest.react({
          address,
          suffixLength: 3,
          rpcUrl: "https://rpc.example.test/slow",
        });
      }, address);
      await page.waitForFunction(() =>
        document.querySelector('#react [aria-busy="true"]')
      );
      assertEquals(await web.textContent(), abbreviation);
      assertEquals(await react.textContent(), abbreviation);
      // Wait for both requests to reach the mocked RPC before changing inputs.
      await slowReady.promise;
      await page.evaluate((address) => {
        document.querySelector("#web")!.setAttribute(
          "rpc-url",
          "https://rpc.example.test/fast",
        );
        lookupTest.react({
          address,
          suffixLength: 3,
          rpcUrl: "https://rpc.example.test/fast",
        });
      }, address);
      await page.waitForFunction(
        (label) =>
          document.querySelector("#react .account-plate-word")?.textContent ===
            label,
        address.slice(-7),
      );
      await page.waitForFunction(
        (label) =>
          document.querySelector("#web")?.shadowRoot?.querySelector(
            ".account-plate-word",
          )?.textContent === label,
        address.slice(-7),
      );
      for (const route of pending.splice(0)) await ledgerReply(route, "4");
      await page.evaluate(() =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
      );
      assertEquals(await web.textContent(), address.slice(-7));
      assertEquals(await react.textContent(), address.slice(-7));
      // A networkConfig property works for web and React; missing metadata ignores local counts.
      await page.evaluate((address) => {
        const plate = document.querySelector("#web") as VanityPlateElement;
        plate.removeAttribute("rpc-url");
        plate.networkConfig = lookupTest.network(
          "https://rpc.example.test/empty",
        );
        lookupTest.react({
          address,
          suffixLength: 3,
          networkConfig: lookupTest.network("https://rpc.example.test/empty"),
        });
      }, address);
      await page.waitForFunction(() =>
        !document.querySelector("#web")!.hasAttribute("aria-busy") &&
        !document.querySelector('#react [aria-busy="true"]')
      );
      assertEquals(await web.textContent(), abbreviation);
      assertEquals(await react.textContent(), abbreviation);
      await page.evaluate(() => {
        (document.querySelector("#web") as VanityPlateElement).networkConfig =
          lookupTest.network("https://rpc.example.test/error");
      });
      await page.waitForFunction(() => globalThis.plateErrors === 1);
      assertEquals(await web.textContent(), abbreviation);
      // Removing network settings restores count-only display immediately.
      await page.evaluate((address) => {
        (document.querySelector("#web") as VanityPlateElement).networkConfig =
          undefined;
        lookupTest.react({ address });
      }, address);
      assertEquals(await web.textContent(), address.slice(-3));
      await page.waitForFunction(
        (label) =>
          document.querySelector("#react .account-plate-word")?.textContent ===
            label,
        abbreviation,
      );
      const exportsMatch = await page.evaluate(async (address) => {
        const online = {
          address,
          rpcUrl: "https://rpc.example.test/fast",
          suffixLength: 2,
        };
        const offline = { address, suffixLength: 7 };
        return {
          html: await sdkTest.renderPlateHtml(online) ===
            await sdkTest.renderPlateHtml(offline),
          svg: await sdkTest.renderPlateSvg(online) ===
            await sdkTest.renderPlateSvg(offline),
          png: String(await sdkTest.renderPlatePng(online)) ===
            String(await sdkTest.renderPlatePng(offline)),
        };
      }, address);
      assertEquals(exportsMatch, { html: true, svg: true, png: true });
      // Late responses after disconnect/unmount must not mutate detached UI or emit errors.
      slowReady = Promise.withResolvers<void>();
      await page.evaluate((address) => {
        document.querySelector("#web")!.setAttribute(
          "rpc-url",
          "https://rpc.example.test/slow",
        );
        lookupTest.react({ address, rpcUrl: "https://rpc.example.test/slow" });
      }, address);
      await slowReady.promise;
      await page.evaluate(() => {
        const plate = document.querySelector("#web")!;
        Object.assign(globalThis, { detachedPlate: plate });
        plate.remove();
        lookupTest.unmount();
      });
      for (const route of pending.splice(0)) await ledgerReply(route, "4");
      await page.evaluate(() =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        )
      );
      const detached = await page.evaluate(() => ({
        label: (globalThis as unknown as { detachedPlate: HTMLElement })
          .detachedPlate.shadowRoot!.querySelector(".account-plate-word")!
          .textContent,
        errors: plateErrors,
        reactChildren: document.querySelector("#react")!.childElementCount,
      }));
      assertEquals(detached, {
        label: abbreviation,
        errors: 1,
        reactChildren: 0,
      });
      await page.evaluate(() => lookupTest.unmount());
      assertEquals(failures, []);
    } finally {
      await browser.close();
    }
  },
});
