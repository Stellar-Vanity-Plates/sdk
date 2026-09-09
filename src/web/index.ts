/** Framework-independent, animated web component. Safe to import during SSR. @module */
import { renderPlateHtml } from "@/rendering/html.ts";
import { webFonts } from "@/rendering/vendor/web-fonts.ts";

/**
 * Registers `<vanity-plate>` in the current browser. Call after the DOM is available.
 * Attributes: address, suffix, suffix-length, animated. Styling: width on the host.
 * Invalid inputs display a fallback and dispatch a bubbling `plate-error` event.
 * No registration or DOM access occurs merely by importing this module.
 */
export function registerVanityPlate(
  tagName = "vanity-plate",
): CustomElementConstructor {
  // Browsers do not register @font-face rules inside a shadow root.
  if (!document.querySelector("style[data-vanity-plate-fonts]")) {
    const fonts = document.createElement("style");
    fonts.dataset.vanityPlateFonts = "";
    fonts.textContent = webFonts;
    document.head.append(fonts);
  }
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
        "<style>:host{display:block;width:100%}.vnty-plate-root{width:100%;}p{font:14px system-ui;color:#566456;border:1px solid #d9ddcf;border-radius:8px;padding:20px}</style>";
      if (!address) {
        this.root.innerHTML += "<p>Choose a plate to display.</p>";
        return;
      }
      try {
        this.root.innerHTML += renderPlateHtml({
          address,
          suffix: this.getAttribute("suffix") ?? undefined,
          suffixLength: this.hasAttribute("suffix-length")
            ? Number(this.getAttribute("suffix-length"))
            : undefined,
        }, { animated: this.hasAttribute("animated") });
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
