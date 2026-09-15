import { assert, assertEquals, assertThrows } from "@std/assert";
// @deno-types="@types/react-dom/server"
import { renderToString } from "react-dom/server";
import { Plate } from "@/react/index.tsx";
import config from "@examples/testnet.json" with { type: "json" };
Deno.test("React SSR renders matching accessible plates without global element IDs", () => {
  const props = {
    address: config.contracts.nft,
    suffixLength: 6,
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

Deno.test("React SSR with RPC props abbreviates without fetching, even when a local count is present", () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => {
    throw new Error("SSR must not fetch");
  };
  try {
    const address = config.contracts.nft;
    const html = renderToString(
      <Plate
        address={address}
        suffixLength={3}
        rpcUrl="https://rpc.example.test"
      />,
    );
    assert(html.includes(`${address.slice(0, 6)}…${address.slice(-6)}`));
    assert(html.includes('aria-busy="true"'));
  } finally {
    globalThis.fetch = previous;
  }
});
