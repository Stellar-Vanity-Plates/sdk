import { PlateStyles } from "@/react/styles/index.tsx";
import { registerVanityPlate } from "@/web/index.ts";
import { renderPlateHtml, renderPlateSvg } from "@/rendering/index.ts";
import { renderPlatePng } from "@/rendering/png.ts";
registerVanityPlate();
Object.assign(globalThis, {
  sdkTest: { renderPlateHtml, renderPlateSvg, renderPlatePng },
});

import { createElement } from "react";
// @deno-types="@types/react-dom/client"
import { createRoot } from "react-dom/client";
import { Plate, type PlateProps } from "@/react/index.tsx";
import { NetworkConfig } from "@colibri/core";
let root: ReturnType<typeof createRoot> | undefined;
Object.assign(globalThis, {
  lookupTest: {
    react(props: PlateProps) {
      root ??= createRoot(document.querySelector("#react")!);
      root.render(
        createElement(
          "div",
          null,
          createElement(PlateStyles),
          createElement(Plate, props),
        ),
      );
    },
    unmount() {
      root?.unmount();
      root = undefined;
    },
    network(rpcUrl: string) {
      return NetworkConfig.TestNet({ rpcUrl });
    },
  },
});
