import { Window } from "happy-dom";
/** Installs an isolated DOM only for the lifetime of a unit test. */
export function installDom() {
  const window = new Window({ url: "https://sdk.example.test" });
  const keys = [
    "document",
    "HTMLElement",
    "customElements",
    "CustomEvent",
    "Image",
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
