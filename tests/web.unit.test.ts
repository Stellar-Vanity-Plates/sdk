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
      ((method: string) =>
        state.failure ? Promise.reject(state.failure) : Promise.resolve(
          method === "get_latest_token_id"
            ? 1
            : { contract_address: address, suffix: address.slice(-5) },
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
      ((method: string) => {
        if (method === "get_claim") {
          return Promise.resolve({
            contract_address: address,
            suffix: address.slice(-4),
          });
        }
        const request = Promise.withResolvers<number>();
        requests.push(request);
        return request.promise;
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
