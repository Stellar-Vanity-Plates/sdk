import { Window } from "happy-dom";
/** Installs an isolated DOM only for the lifetime of a unit test. */
export function installDom(
  styles: "native" | "absent" | "legacy" | "no-shadow" = "native",
) {
  const window = new Window({ url: "https://sdk.example.test" });
  const keys = [
    "document",
    "HTMLElement",
    "customElements",
    "CustomEvent",
    "Image",
    "CSSStyleSheet",
    "ShadowRoot",
  ] as const;
  const descriptors = keys.map((key) =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const
  );
  for (const key of keys) {
    Object.defineProperty(globalThis, key, {
      configurable: true,
      value: window[key],
    });
  }
  if (styles === "absent") Reflect.deleteProperty(globalThis, "CSSStyleSheet");
  if (styles === "legacy") {
    Object.defineProperty(globalThis, "CSSStyleSheet", {
      configurable: true,
      value: class {},
    });
  }
  if (styles === "no-shadow") {
    Object.defineProperty(globalThis, "ShadowRoot", {
      configurable: true,
      value: class {},
    });
  }
  return {
    window,
    async [Symbol.asyncDispose]() {
      await window.happyDOM.close();
      for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else Reflect.deleteProperty(globalThis, key);
      }
    },
  };
}
/** Allows the lookup promise chain to finish without wall-clock sleeps. */
export async function settle() {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}
