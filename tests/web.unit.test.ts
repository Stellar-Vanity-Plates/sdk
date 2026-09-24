import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { NetworkConfig, StrKey } from "@colibri/core";
import { registerVanityPlate, type VanityPlateElement } from "@/web/index.ts";
import { NftClient } from "@/contracts/index.ts";
import { installDom, settle } from "@tests/fixtures/dom.ts";
const address = StrKey.encodeContract(new Uint8Array(32));
const network = NetworkConfig.TestNet();
const label = (el: VanityPlateElement) =>
  el.shadowRoot!.querySelector(".plate-rarity-word")?.textContent;

describe("vanity-plate custom element", () => {
  it("registers once, shares fonts, renders offline, and reports invalid inputs", async () => {
    await using _dom = installDom();
    const Element = registerVanityPlate();
    assertStrictEquals(registerVanityPlate(), Element);
    assertEquals(
      document.querySelectorAll("style[data-vanity-plate-fonts]").length,
      1,
    );
    const el = new Element();
    el.setAttribute("animated", "");
    document.body.append(el);
    assert(el.shadowRoot!.textContent!.includes("Choose a plate"));
    el.setAttribute("address", address);
    el.setAttribute("suffix-length", "3");
    assertEquals(label(el), address.slice(-3));
    for (const variant of ["compact", "picker", "display", "invalid"]) {
      el.setAttribute("variant", variant);
      el.setAttribute("inline", "");
      const root = el.shadowRoot!.querySelector(".vnty-plate-root")!;
      assertEquals(
        root.getAttribute("data-variant"),
        variant === "invalid" ? "display" : variant,
      );
      assertEquals(root.tagName, "SPAN");
    }
    el.removeAttribute("inline");
    const errors: unknown[] = [];
    el.addEventListener(
      "plate-error",
      (event) => errors.push((event as CustomEvent).detail),
    );
    el.setAttribute("address", "bad");
    assert(el.shadowRoot!.textContent!.includes("Plate unavailable"));
    assertEquals(errors.length, 1);
    el.remove();
  });
  it("upgrades preassigned configuration, resolves counts, and exposes current failures", async () => {
    await using _dom = installDom();
    const Element = registerVanityPlate();
    const state: { failure?: Error } = {};
    using _read = stub(
      NftClient.prototype,
      "read",
      (() =>
        state.failure ? Promise.reject(state.failure) : Promise.resolve(
          { controller: address, character_count: 5, salt: undefined },
        )) as NftClient["read"],
    );
    const el = new Element();
    // Simulate the own property present on an element upgraded by the registry.
    Object.defineProperty(el, "networkConfig", {
      configurable: true,
      value: network,
    });
    el.setAttribute("address", address);
    el.setAttribute("nft-contract-id", address);
    document.body.append(el);
    assertStrictEquals(el.networkConfig, network);
    assertEquals(el.getAttribute("aria-busy"), "true");
    await settle();
    assertEquals(label(el), address.slice(-5));
    assertEquals(el.hasAttribute("aria-busy"), false);
    const errors: unknown[] = [];
    el.addEventListener(
      "plate-error",
      (event) => errors.push((event as CustomEvent).detail),
    );
    state.failure = new Error("offline");
    el.networkConfig = NetworkConfig.TestNet();
    await settle();
    assertEquals(errors, [state.failure]);
    assertEquals(label(el), `${address.slice(0, 6)}…${address.slice(-6)}`);
    el.remove();
    el.networkConfig = undefined;
    assertEquals(el.networkConfig, undefined);
  });
  it("ignores stale successes and failures after updates or disconnect", async () => {
    await using _dom = installDom();
    const Element = registerVanityPlate();
    const requests: ReturnType<typeof Promise.withResolvers<number>>[] = [];
    using _read = stub(
      NftClient.prototype,
      "read",
      (() => {
        const request = Promise.withResolvers<number>();
        requests.push(request);
        return request.promise.then(() => ({
          controller: address,
          character_count: 4,
          salt: undefined,
        }));
      }) as NftClient["read"],
    );
    const el = new Element();
    el.networkConfig = network;
    el.setAttribute("address", address);
    document.body.append(el);
    await settle();
    el.setAttribute("suffix-length", "2");
    await settle();
    requests[1].resolve(1);
    await settle();
    assertEquals(label(el), address.slice(-4));
    requests[0].resolve(0);
    await settle();
    assertEquals(label(el), address.slice(-4));
    let errors = 0;
    el.addEventListener("plate-error", () => errors++);
    el.networkConfig = NetworkConfig.TestNet();
    await settle();
    el.networkConfig = NetworkConfig.TestNet();
    await settle();
    requests[2].reject(new Error("stale"));
    await settle();
    el.remove();
    requests[3].reject(new Error("detached"));
    await settle();
    assertEquals(errors, 0);
    document.body.append(el);
    await settle();
    el.remove();
    requests[4].resolve(4);
    await settle();
    assertEquals(errors, 0);
  });
});

Deno.test("web elements share constructed artwork and fall back on older browsers without duplicating fonts", async () => {
  for (const mode of ["native", "absent", "legacy", "no-shadow"] as const) {
    await using _dom = installDom(mode);
    const Element = registerVanityPlate();
    const a = new Element(), b = new Element();
    for (const el of [a, b]) {
      el.setAttribute("address", address);
      document.body.append(el);
    }
    assertEquals(
      document.querySelectorAll("style[data-vanity-plate-fonts]").length,
      1,
    );
    if (mode === "native") {
      assertStrictEquals(
        a.shadowRoot!.adoptedStyleSheets[0],
        b.shadowRoot!.adoptedStyleSheets[0],
      );
      assertEquals(a.shadowRoot!.querySelectorAll("style").length, 0);
    } else assertEquals(a.shadowRoot!.querySelectorAll("style").length, 1);
    assert(!a.shadowRoot!.innerHTML.includes("@font-face"));
  }
});
