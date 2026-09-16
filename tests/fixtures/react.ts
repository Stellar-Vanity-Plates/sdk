/** React 19 requires tests to declare that updates are wrapped in act. */
export function reactActEnvironment(): Disposable {
  const previous = Object.getOwnPropertyDescriptor(
    globalThis,
    "IS_REACT_ACT_ENVIRONMENT",
  );
  Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", {
    configurable: true,
    value: true,
  });
  return {
    [Symbol.dispose]() {
      if (previous) {
        Object.defineProperty(
          globalThis,
          "IS_REACT_ACT_ENVIRONMENT",
          previous,
        );
      } else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    },
  };
}
