/** Framework-independent, animated web component. Safe to import during SSR. @module */
import { renderPlateSvg } from "../rendering/mod.ts";

/**
 * Registers `<vanity-plate>` in the current browser. Call after the DOM is available.
 * Attributes: address, suffix, suffix-length, animated. Styling: width on the host.
 * Invalid inputs display a fallback and dispatch a bubbling `plate-error` event.
 * No registration or DOM access occurs merely by importing this module.
 */
export function registerVanityPlate(
  tagName = "vanity-plate",
): CustomElementConstructor {
  const existing = customElements.get(tagName);
  if (existing) return existing;
  class VanityPlateElement extends HTMLElement {
    static observedAttributes = [
      "address",
      "suffix",
      "suffix-length",
      "animated",
    ];
    private readonly root = this.attachShadow({ mode: "open" });
    connectedCallback(): void {
      this.update();
    }
    attributeChangedCallback(): void {
      if (this.isConnected) this.update();
    }
    private update(): void {
      const address = this.getAttribute("address");
      this.root.innerHTML =
        "<style>:host{display:block;width:100%;contain:content}svg{display:block;width:100%;height:auto}p{font:14px system-ui;color:#566456;border:1px solid #d9ddcf;border-radius:8px;padding:20px}</style>";
      if (!address) {
        this.root.innerHTML += "<p>Choose a plate to display.</p>";
        return;
      }
      try {
        this.root.innerHTML += renderPlateSvg({
          address,
          suffix: this.getAttribute("suffix") ?? undefined,
          suffixLength: this.hasAttribute("suffix-length")
            ? Number(this.getAttribute("suffix-length"))
            : undefined,
        }, { animated: this.hasAttribute("animated"), idPrefix: "vnty" });
      } catch (error) {
        this.root.innerHTML +=
          "<p>Plate unavailable. Check its address and suffix.</p>";
        this.dispatchEvent(
          new CustomEvent("plate-error", {
            detail: error,
            bubbles: true,
            composed: true,
          }),
        );
      }
    }
  }
  customElements.define(tagName, VanityPlateElement);
  return VanityPlateElement;
}
