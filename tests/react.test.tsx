import { assert, assertEquals, assertThrows } from "@std/assert";
// @deno-types="@types/react-dom/server"
import { renderToString } from "react-dom/server";
import { Plate } from "@/react/mod.tsx";
import config from "@examples/testnet.json" with { type: "json" };
Deno.test("React SSR renders matching accessible plates without global element IDs", () => {
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
  assertEquals(Array.from(html.matchAll(/role="img"/g)).length, 2);
  assertEquals(Array.from(html.matchAll(/id="/g)).length, 0);
  assert(html.includes(config.contracts.nft));
  assert(!html.includes("NaN"));
  assertThrows(() => renderToString(<Plate address="invalid" />));
});
