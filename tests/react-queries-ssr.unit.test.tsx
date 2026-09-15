import { assert, assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
// @deno-types="@types/react-dom/server"
import { renderToString } from "react-dom/server";
import { dehydrate, hydrate } from "@tanstack/react-query";
import { NetworkConfig, StrKey } from "@colibri/core";
import { NftClient } from "@/contracts/nft-client.ts";
import {
  createPlateQueryClient,
  Plate,
  plateQueryOptions,
  VanityProvider,
} from "@/react/index.tsx";
import { defaultPlateQueryClient } from "@/react/query.ts";
const address = StrKey.encodeContract(new Uint8Array(32));
const network = NetworkConfig.TestNet();
const input = { address, networkConfig: network };
const label = address.slice(-5);
function claim() {
  return { contract_address: address, suffix: label };
}

Deno.test("SSR reuses prefetched/hydrated cache without fetching and owns isolated request caches", async () => {
  const client = createPlateQueryClient();
  using _read = stub(
    NftClient.prototype,
    "read",
    ((method: string) =>
      Promise.resolve(
        method === "get_latest_token_id" ? 1 : claim(),
      )) as NftClient["read"],
  );
  await client.prefetchQuery(plateQueryOptions(input));
  const restored = createPlateQueryClient();
  hydrate(restored, dehydrate(client));
  using fetch = stub(globalThis, "fetch", () => {
    throw new Error("SSR must not fetch");
  });
  try {
    const html = renderToString(
      <VanityProvider network={network} queryClient={restored}>
        <Plate address={address} />
      </VanityProvider>,
    );
    assert(html.includes(label));
    assert(html.includes('aria-busy="false"'));
    const cold = renderToString(
      <VanityProvider network={network}>
        <Plate address={address} />
      </VanityProvider>,
    );
    assert(cold.includes('aria-busy="true"'));
    assert(cold.includes(`${address.slice(0, 6)}…${address.slice(-6)}`));
    assertEquals(fetch.calls.length, 0);
    assert(defaultPlateQueryClient() !== defaultPlateQueryClient());
    assertEquals(
      await client.fetchQuery(plateQueryOptions({ address, suffixLength: 2 })),
      { address, suffixLength: 2 },
    );
  } finally {
    client.clear();
    restored.clear();
  }
});
