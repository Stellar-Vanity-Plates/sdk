/** Framework-independent plate component. Safe to import during SSR. @module */
import { type PlateInput, resolvePlateInput } from "@/rendering/resolve.ts";
import { renderResolvedPlateHtml } from "@/rendering/markup.ts";
import type { ResolvedPlateInput } from "@/rendering/model.ts";
import {
  plateArtworkCss,
  plateFontCss,
  plateVariantCss,
} from "@/rendering/styles/index.ts";

/** Registered element, accepting a Colibri network configuration as a property. */
export interface VanityPlateElement extends HTMLElement {
  /** Alternative to the rpc-url attribute. Assign a new configuration to refresh. */
  networkConfig: PlateInput["networkConfig"];
}
/** Constructor returned by registerVanityPlate. */
export type VanityPlateConstructor = new () => VanityPlateElement;

/**
 * Registers <vanity-plate>. Attributes: address, suffix-length, rpc-url,
 * nft-contract-id, animated, variant, inline. Alternatively assign the networkConfig property.
 * Network metadata takes precedence over the local count. Missing metadata abbreviates.
 * Pending lookups abbreviate; failures dispatch plate-error and retain that fallback.
 * No registration or DOM access occurs merely by importing this module.
 */
export function registerVanityPlate(
  tagName = "vanity-plate",
): VanityPlateConstructor {
  if (!document.querySelector("style[data-vanity-plate-fonts]")) {
    const fonts = document.createElement("style");
    fonts.dataset.vanityPlateFonts = "";
    fonts.textContent = plateFontCss;
    document.head.append(fonts);
  }
  const existing = customElements.get(tagName);
  if (existing) return existing as VanityPlateConstructor;
  const css =
    `${plateArtworkCss}${plateVariantCss}:host{display:block;width:100%}.vnty-plate-root{width:100%}:host([inline]){display:inline-block;width:10em;vertical-align:middle}`;
  const sheet = typeof CSSStyleSheet !== "undefined" &&
      "replaceSync" in CSSStyleSheet.prototype &&
      "adoptedStyleSheets" in ShadowRoot.prototype
    ? new CSSStyleSheet()
    : undefined;
  sheet?.replaceSync(css);
  class PlateElement extends HTMLElement implements VanityPlateElement {
    static observedAttributes = [
      "address",
      "suffix-length",
      "rpc-url",
      "nft-contract-id",
      "animated",
      "variant",
      "inline",
    ];
    private readonly root = this.attachShadow({ mode: "open" });
    private revision = 0;
    private config: PlateInput["networkConfig"];
    get networkConfig(): PlateInput["networkConfig"] {
      return this.config;
    }
    set networkConfig(value: PlateInput["networkConfig"]) {
      this.config = value;
      if (this.isConnected) void this.update();
    }
    connectedCallback(): void {
      // Preserve a property assigned before customElements.define upgraded the element.
      if (Object.hasOwn(this, "networkConfig")) {
        const value = this.networkConfig;
        delete (this as Partial<VanityPlateElement>).networkConfig;
        this.config = value;
      }
      void this.update();
    }
    disconnectedCallback(): void {
      this.revision++;
    }
    attributeChangedCallback(): void {
      if (this.isConnected) void this.update();
    }
    private paint(input: ResolvedPlateInput): void {
      if (sheet) this.root.adoptedStyleSheets = [sheet];
      const value = this.getAttribute("variant");
      const variant = value === "compact" || value === "picker"
        ? value
        : "display";
      this.root.innerHTML = (sheet ? "" : `<style>${css}</style>`) +
        renderResolvedPlateHtml(input, {
          animated: this.hasAttribute("animated"),
          inline: this.hasAttribute("inline"),
          variant,
        });
    }
    private async update(): Promise<void> {
      const revision = ++this.revision;
      this.removeAttribute("aria-busy");
      const address = this.getAttribute("address");
      if (!address) {
        this.root.innerHTML = "<p>Choose a plate to display.</p>";
        return;
      }
      const input: PlateInput = {
        address,
        suffixLength: this.hasAttribute("suffix-length")
          ? Number(this.getAttribute("suffix-length"))
          : undefined,
        rpcUrl: this.getAttribute("rpc-url") ?? undefined,
        networkConfig: this.config,
        nftContractId: this.getAttribute("nft-contract-id") ?? undefined,
      };
      const online = input.rpcUrl !== undefined ||
        input.networkConfig !== undefined;
      let painted = false;
      try {
        this.paint(online ? { address } : input);
        painted = true;
        if (!online) return;
        this.setAttribute("aria-busy", "true");
        const resolved = await resolvePlateInput(input);
        if (revision !== this.revision || !this.isConnected) return;
        this.paint(resolved);
      } catch (error) {
        if (revision !== this.revision || !this.isConnected) return;
        if (!painted) {
          this.root.innerHTML = "<p>Plate unavailable. Check its address.</p>";
        }
        this.dispatchEvent(
          new CustomEvent("plate-error", {
            detail: error,
            bubbles: true,
            composed: true,
          }),
        );
      } finally {
        if (revision === this.revision) this.removeAttribute("aria-busy");
      }
    }
  }
  customElements.define(tagName, PlateElement);
  return PlateElement;
}
