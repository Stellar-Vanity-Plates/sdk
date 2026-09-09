/** Minimal browser boundary for local image export; native Playwright browsers implement it. */
export interface PngBrowser {
  /** Creates an isolated context at the requested output size and resting motion state. */
  newContext(options: {
    viewport: { width: number; height: number };
    deviceScaleFactor: number;
    reducedMotion: "reduce";
  }): Promise<PngBrowserContext>;
}
/** Isolated browser context owned and closed by the exporter. */
export interface PngBrowserContext {
  /** Intercepts page requests so rendering never needs network assets. */
  route(
    pattern: string,
    handler: (route: PngRoute) => Promise<void>,
  ): Promise<unknown>;
  /** Creates a temporary render page. */
  newPage(): Promise<PngPage>;
  /** Releases all context resources. */
  close(): Promise<void>;
}
/** Request cancellation boundary used by local export. */
export interface PngRoute {
  /** Rejects the intercepted request. */
  abort(): Promise<void>;
}
/** Browser page operations required to render a canonical plate. */
export interface PngPage {
  /** Loads the self-contained markup. */
  setContent(html: string): Promise<void>;
  /** Waits for the plate's embedded assets in the page. */
  evaluate(callback: () => Promise<void>): Promise<void>;
  /** Captures the resting frame on a transparent background. */
  screenshot(
    options: { omitBackground: boolean; animations: "disabled" },
  ): Promise<Uint8Array>;
}
