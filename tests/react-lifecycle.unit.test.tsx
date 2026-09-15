import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertStrictEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { Component, type ReactNode } from "react";
// @deno-types="@types/react-test-renderer"
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { NetworkConfig, StrKey } from "@colibri/core";
import { Plate } from "@/react/index.tsx";
import { NftClient } from "@/contracts/index.ts";
import { settle as microtasks } from "@tests/fixtures/dom.ts";
async function settle() {
  await microtasks();
  await new Promise((r) => setTimeout(r, 0));
  await microtasks();
}
const address = StrKey.encodeContract(new Uint8Array(32));
const network = NetworkConfig.TestNet();
const html = (view: ReactTestRenderer) =>
  view.root.findByType("div").props.dangerouslySetInnerHTML.__html as string;

describe("React display lifecycle", () => {
  it("updates from abbreviation to metadata, returns offline, and ignores stale or unmounted results", async () => {
    const pending: ReturnType<typeof Promise.withResolvers<number>>[] = [];
    using _read = stub(
      NftClient.prototype,
      "read",
      ((method: string) => {
        if (method === "get_claim") {
          return Promise.resolve({
            contract_address: address,
            suffix: address.slice(-5),
          });
        }
        const request = Promise.withResolvers<number>();
        pending.push(request);
        return request.promise;
      }) as NftClient["read"],
    );
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(<Plate address={address} suffixLength={3} />);
      await settle();
    });
    try {
      assertEquals(view.root.findByType("div").props["aria-busy"], false);
      await act(async () => {
        view.update(<Plate address={address} networkConfig={network} />);
        await settle();
      });
      assertEquals(view.root.findByType("div").props["aria-busy"], true);
      assertEquals(
        html(view).includes(`${address.slice(0, 6)}…${address.slice(-6)}`),
        true,
      );
      await act(async () => {
        view.update(
          <Plate
            address={address}
            networkConfig={NetworkConfig.TestNet({
              rpcUrl: "https://two.test",
            })}
            suffixLength={2}
          />,
        );
        await settle();
      });
      await act(async () => {
        pending[1].resolve(1);
        await settle();
      });
      assertEquals(view.root.findByType("div").props["aria-busy"], false);
      const resolved = html(view);
      await act(async () => {
        pending[0].resolve(0);
        await settle();
      });
      assertEquals(html(view), resolved);
      await act(async () => {
        view.update(
          <Plate
            address={address}
            networkConfig={NetworkConfig.TestNet({
              rpcUrl: "https://three.test",
            })}
            suffixLength={4}
          />,
        );
        await settle();
      });
      await act(async () => {
        view.update(<Plate address={address} suffixLength={3} />);
        await settle();
      });
      const offline = html(view);
      await act(async () => {
        pending[2].reject(new Error("stale failure"));
        await settle();
      });
      assertEquals(html(view), offline);
      await act(async () => {
        view.update(
          <Plate
            address={address}
            networkConfig={NetworkConfig.TestNet({
              rpcUrl: "https://four.test",
            })}
          />,
        );
        await settle();
      });
      await act(async () => {
        view.unmount();
        pending[3].resolve(3);
        await settle();
      });
      assertEquals(view.toJSON(), null);
    } finally {
      await act(async () => {
        view.unmount();
        await settle();
      });
    }
  });
  it("delivers current lookup failures to the nearest error boundary", async () => {
    const cause = new Error("RPC offline");
    using _read = stub(
      NftClient.prototype,
      "read",
      () => Promise.reject(cause),
    );
    const caught: unknown[] = [];
    class Boundary
      extends Component<{ children: ReactNode }, { failed: boolean }> {
      override state = { failed: false };
      static getDerivedStateFromError() {
        return { failed: true };
      }
      override componentDidCatch(error: Error) {
        caught.push(error);
      }
      override render() {
        return this.state.failed
          ? <span>Unavailable</span>
          : this.props.children;
      }
    }
    // React logs handled boundary errors; assert the emitted diagnostic as well.
    using diagnostic = stub(console, "error");
    let view!: ReactTestRenderer;
    await act(async () => {
      view = create(
        <Boundary>
          <Plate address={address} networkConfig={network} />
        </Boundary>,
      );
      await settle();
    });
    try {
      assertStrictEquals(caught[0], cause);
      assertEquals(caught.length, 1);
      assertEquals(view.root.findByType("span").children, ["Unavailable"]);
      assertEquals(diagnostic.calls.length, 1);
    } finally {
      await act(async () => {
        view.unmount();
        await settle();
      });
    }
  });
});
