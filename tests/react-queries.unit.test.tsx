import { reactActEnvironment } from "@tests/fixtures/react.ts";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import { stub } from "@std/testing/mock";
import { createElement } from "react";
// @deno-types="@types/react-test-renderer"
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClientProvider } from "@tanstack/react-query";
import { NetworkConfig, StrKey } from "@colibri/core";
import { NftClient } from "@/contracts/nft-client.ts";
import {
  createPlateQueryClient,
  Plate,
  plateQueryKey,
  usePlate,
  type UsePlateOptions,
  type UsePlateResult,
  VanityProvider,
} from "@/react/index.tsx";
import { defaultPlateQueryClient } from "@/react/query.ts";
import { settle } from "@tests/fixtures/dom.ts";
const address = StrKey.encodeContract(new Uint8Array(32));
const other = StrKey.encodeContract(new Uint8Array(32).fill(9));
const network = NetworkConfig.TestNet();
const input = { address, networkConfig: network };
const label = address.slice(-5);
async function flush() {
  await settle();
  await new Promise((r) => setTimeout(r, 0));
  await settle();
}
function words(view: ReactTestRenderer): string[] {
  return view.root.findAllByType("div").filter((n) =>
    n.props.dangerouslySetInnerHTML
  )
    .map((n) => n.props.dangerouslySetInnerHTML.__html);
}
function claim(count = 5) {
  return { contract_address: address, suffix: address.slice(-count) };
}

Deno.test("React queries share one in-flight lookup, synchronously reuse it, and isolate explicit overrides", async () => {
  using _actEnvironment = reactActEnvironment();
  const pending = Promise.withResolvers<number>();
  let count = 0;
  using _read = stub(
    NftClient.prototype,
    "read",
    ((method: string) => {
      count++;
      return method === "get_latest_token_id"
        ? pending.promise
        : Promise.resolve(claim());
    }) as NftClient["read"],
  );
  const client = createPlateQueryClient();
  let view!: ReactTestRenderer;
  const screen = (extra = false) => (
    <VanityProvider network={network} queryClient={client}>
      <Plate address={address} />
      <Plate address={address} inline />
      {extra && <Plate address={address} />}
      <Plate data={{ address, suffixLength: 2 }} rpcUrl="bad-url-ignored" />
    </VanityProvider>
  );
  await act(async () => {
    view = create(screen());
    await flush();
  });
  await act(flush);
  try {
    assertEquals(count, 1);
    assertEquals(client.getQueryData(plateQueryKey(input)), undefined);
    await act(async () => {
      pending.resolve(4);
      await flush();
    });
    assertEquals(count, 2);
    assertEquals(client.getQueryData(plateQueryKey(input)), {
      address,
      suffixLength: 5,
    });
    act(() => view.update(screen(true)));
    assert(
      words(view)[1].includes(label),
      "New instance renders cached data synchronously",
    );
    assertEquals(
      view.root.findAll((n) => n.props["aria-busy"] === true).length,
      0,
    );
    assertEquals(count, 2);
    assertEquals(client.getQueryData(plateQueryKey(input)), {
      address,
      suffixLength: 5,
    });
    await act(async () => {
      await client.invalidateQueries({ queryKey: plateQueryKey(input) });
      await flush();
    });
    assertEquals(count, 4, "One refresh shared across all subscribers");
  } finally {
    act(() => view.unmount());
    client.clear();
  }
});

Deno.test("usePlate exposes pending, successful absent metadata, refresh and errors without losing cached data", async () => {
  using _actEnvironment = reactActEnvironment();
  let failure: Error | undefined;
  let empty = false;
  let count = 0;
  using _read = stub(
    NftClient.prototype,
    "read",
    ((method: string) => {
      count++;
      if (failure) return Promise.reject(failure);
      return Promise.resolve(
        method === "get_latest_token_id" ? 1 : claim(empty ? 0 : 5),
      );
    }) as NftClient["read"],
  );
  const client = createPlateQueryClient();
  let state!: UsePlateResult;
  function Probe(props: UsePlateOptions) {
    state = usePlate(props);
    return null;
  }
  let view!: ReactTestRenderer;
  act(() => {
    view = create(
      <QueryClientProvider client={client}>
        <Probe {...input} />
      </QueryClientProvider>,
    );
  });
  try {
    assertEquals(state.status, "pending");
    await act(flush);
    assertEquals(state.status, "success");
    assertEquals(state.data?.suffixLength, 5);
    empty = true;
    await act(async () => {
      await state.refetch();
      await flush();
    });
    assertEquals(state.data, { address, suffixLength: undefined });
    assertEquals(state.status, "success");
    const before = count;
    act(() =>
      view.update(
        <QueryClientProvider client={client}>
          <Probe {...input} />
        </QueryClientProvider>,
      )
    );
    assertEquals(count, before, "Missing owner metadata is still a cache hit");
    failure = new Error("RPC unavailable");
    await act(async () => {
      assertStrictEquals(await assertRejects(() => state.refetch()), failure);
      await flush();
    });
    assertEquals(state.status, "error");
    assertStrictEquals(state.error, failure);
    assertEquals(state.data, { address, suffixLength: undefined });
    // Explicit data ignores even an existing failure, without replacing the network record.
    act(() =>
      view.update(
        <QueryClientProvider client={client}>
          <Probe data={{ address, suffixLength: 3 }} />
        </QueryClientProvider>,
      )
    );
    assertEquals(state.status, "success");
    assertEquals(state.error, null);
    assertEquals(state.isFetching, false);
    assertEquals(await state.refetch(), { address, suffixLength: 3 });
    act(() =>
      view.update(
        <QueryClientProvider client={client}>
          <Probe data={{ address }} />
        </QueryClientProvider>,
      )
    );
    assertEquals(state.data, { address, suffixLength: undefined });
    assertEquals(await state.refetch(), { address, suffixLength: undefined });
  } finally {
    act(() => view.unmount());
    client.clear();
  }
});

Deno.test("provider defaults, component overrides and stable cache keys isolate network, address and collection", async () => {
  using _actEnvironment = reactActEnvironment();
  const client = createPlateQueryClient();
  const alternate = NetworkConfig.MainNet({ rpcUrl: "https://alternate.test" });
  const a = plateQueryKey(input);
  assertEquals(
    a,
    plateQueryKey({
      ...input,
      networkConfig: NetworkConfig.TestNet(),
      suffixLength: 9,
    }),
  );
  const keys = [
    a,
    plateQueryKey({ ...input, address: other }),
    plateQueryKey({ ...input, networkConfig: alternate }),
    plateQueryKey({ ...input, nftContractId: other }),
    plateQueryKey({ address, rpcUrl: network.rpcUrl }),
    plateQueryKey({ address }),
    plateQueryKey({ address, suffixLength: 3 }),
  ];
  assertEquals(
    new Set(keys.map((key) => JSON.stringify(key))).size,
    keys.length,
  );
  const calls: unknown[] = [];
  using _read = stub(
    NftClient.prototype,
    "read",
    (function (this: NftClient, method: string) {
      calls.push(this.contract.getContractId());
      return Promise.resolve(method === "get_latest_token_id" ? 1 : claim());
    }) as NftClient["read"],
  );
  let view!: ReactTestRenderer;
  await act(async () => {
    view = create(
      <VanityProvider
        network={network}
        nftContractId={address}
        queryClient={client}
      >
        <Plate address={address} />
        <Plate {...input} nftContractId={other} />
        <Plate address={address} networkConfig={alternate} />
      </VanityProvider>,
    );
    await flush();
  });
  try {
    assertEquals(calls.length, 6);
    assertEquals(calls.filter((x) => x === other).length, 2);
    assertEquals(
      client.getQueryData(plateQueryKey({ ...input, nftContractId: address })),
      { address, suffixLength: 5 },
    );
    assertEquals(
      client.getQueryData(
        plateQueryKey({
          address,
          networkConfig: alternate,
          nftContractId: address,
        }),
      ),
      { address, suffixLength: 5 },
    );
  } finally {
    act(() => view.unmount());
    client.clear();
  }
});

Deno.test("browser defaults are shared and provider-owned caches stay separate", async () => {
  using _actEnvironment = reactActEnvironment();
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  const client = defaultPlateQueryClient();
  let view!: ReactTestRenderer;
  let calls = 0;
  using _read = stub(
    NftClient.prototype,
    "read",
    ((method: string) => {
      calls++;
      return Promise.resolve(method === "get_latest_token_id" ? 1 : claim());
    }) as NftClient["read"],
  );
  try {
    assertStrictEquals(defaultPlateQueryClient(), client);
    assertEquals(client.getDefaultOptions().queries?.gcTime, 300_000);
    await act(async () => {
      view = create(createElement(Plate, input));
      await flush();
    });
    assertEquals(calls, 2);
    let second!: ReactTestRenderer;
    act(() => {
      second = create(createElement(Plate, input));
    });
    assert(words(second)[0].includes(label));
    act(() => second.unmount());
    await act(async () => {
      view.update(
        <VanityProvider network={network}>
          <Plate address={address} />
        </VanityProvider>,
      );
      await flush();
    });
    assertEquals(calls, 4, "A provider creates an isolated scope by default");
    act(() => view.unmount());
  } finally {
    if (view) act(() => view.unmount());
    client.clear();
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

Deno.test("stale metadata remains synchronous while one shared background refresh runs", async () => {
  using _actEnvironment = reactActEnvironment();
  const client = createPlateQueryClient();
  client.setQueryData(plateQueryKey(input), { address, suffixLength: 5 }, {
    updatedAt: Date.now() - 31_000,
  });
  const pending = Promise.withResolvers<number>();
  let calls = 0;
  using _read = stub(
    NftClient.prototype,
    "read",
    ((method: string) => {
      calls++;
      return method === "get_latest_token_id"
        ? pending.promise
        : Promise.resolve(claim(6));
    }) as NftClient["read"],
  );
  let state!: UsePlateResult;
  function Probe() {
    state = usePlate({ address });
    return null;
  }
  let view!: ReactTestRenderer;
  act(() => {
    view = create(
      <VanityProvider network={network} queryClient={client}>
        <Probe />
        <Plate address={address} />
      </VanityProvider>,
    );
  });
  try {
    assertEquals(state.data, { address, suffixLength: 5 });
    assertEquals(state.isPending, false);
    assertEquals(state.isFetching, true);
    assert(words(view)[0].includes(label));
    await act(flush);
    assertEquals(calls, 1);
    await act(async () => {
      pending.resolve(1);
      await flush();
    });
    assertEquals(state.data, { address, suffixLength: 6 });
    assertEquals(state.isFetching, false);
    assertEquals(calls, 2);
  } finally {
    act(() => view.unmount());
    client.clear();
  }
});
