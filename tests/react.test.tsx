import { assert, assertEquals, assertThrows } from "@std/assert";
// @deno-types="@types/react-dom/server"
import { renderToString } from "react-dom/server";
import { Plate } from "../src/react/mod.tsx";
import config from "../examples/testnet.json" with { type: "json" };
Deno.test("React SSR renders matching plates with unique accessible SVG IDs", () => {
  const props = {
    address: config.contracts.nft,
    suffix: "PLATES",
    animated: true,
  };
  const html = renderToString(
    <div>
      <Plate {...props} />
      <Plate {...props} />
    </div>,
  );
  const ids = Array.from(
    html.matchAll(/aria-labelledby="([^"]+)"/g),
    (m) => m[1],
  );
  assertEquals(ids.length, 2);
  assertEquals(new Set(ids).size, 2);
  assert(html.includes(config.contracts.nft));
  assert(!html.includes("NaN"));
  assertThrows(() => renderToString(<Plate address="invalid" />));
});
