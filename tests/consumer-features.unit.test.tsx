import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { NetworkConfig, StrKey } from "@colibri/core";
import { Identicon } from "@colibri/identicon";
import {
  createPlateAppearance,
  renderResolvedPlateHtml,
} from "@/rendering/local/index.ts";
import { renderPlateHtml } from "@/rendering/html.ts";
import {
  plateArtworkCss,
  plateCss,
  plateFontCss,
  plateSharedCss,
  plateVariantCss,
} from "@/rendering/styles/index.ts";
import { PlateStyles } from "@/react/styles/index.tsx";
import { ResolvedPlate } from "@/react/local/index.tsx";
import { Plate } from "@/react/index.tsx";
import {
  bytesToHex,
  createContractFarmPartition,
  deriveContractAddress,
  farmContractBatch,
  hexToSalt,
  resumeContractFarm,
} from "@/farming/index.ts";
import {
  InvalidFarmPartitionError,
  InvalidSaltHexError,
  InvalidSaltLengthError,
  InvalidSaltStrideError,
} from "@/errors.ts";
// @deno-types="@types/react-dom/server"
import { renderToStaticMarkup } from "react-dom/server";
const account = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
const contract = StrKey.encodeContract(new Uint8Array(32).fill(123));
const input = { address: contract, suffixLength: 5 };
const networkPassphrase = NetworkConfig.TestNet().networkPassphrase;
const options = {
  deployer: contract,
  networkPassphrase,
  suffix: "ZZZZZZZZZZZZ",
  startSalt: new Uint8Array(32),
  maxAttempts: 2,
  batchSize: 1,
};

Deno.test("resolved renderers share exact palette/insignia and install fonts once for many plates", async () => {
  for (const address of [account, contract]) {
    const appearance = createPlateAppearance(address);
    assertEquals(
      appearance.identiconSvg,
      new Identicon(address).toSvg({
        size: 224,
        padding: 14,
        saturation: .8,
        value: .55,
      }),
    );
    const html = renderResolvedPlateHtml({ address });
    assert(html.includes(appearance.ink));
    assert(html.includes(appearance.bandHighlight));
    assert(html.includes(appearance.badge));
    assert(!html.includes("@font-face"));
  }
  const styles = renderToStaticMarkup(<PlateStyles nonce="test-nonce" />);
  assert(styles.includes('nonce="test-nonce"'));
  assert(styles.includes(plateSharedCss));
  assertEquals(
    plateSharedCss,
    plateFontCss + plateArtworkCss + plateVariantCss,
  );
  assert(plateCss.startsWith(plateFontCss));
  assert(plateVariantCss.includes('data-variant="picker"'));
  assert(renderToStaticMarkup(<PlateStyles />).includes("@font-face"));
  const render = renderToStaticMarkup(
    <>
      <PlateStyles />
      {Array.from(
        { length: 50 },
        (_, i) => <ResolvedPlate key={i} {...input} />,
      )}
    </>,
  );
  assertEquals((render.match(/<style/g) ?? []).length, 1);
  assertEquals(
    (render.match(/@font-face/g) ?? []).length,
    (styles.match(/@font-face/g) ?? []).length,
  );
  for (const variant of [undefined, "display", "compact", "picker"] as const) {
    const html = renderResolvedPlateHtml(input, {
      variant,
      inline: true,
      animated: true,
    });
    assert(html.startsWith('<span class="vnty-plate-root"'));
    assert(!html.includes("<div"));
    assert(html.includes('data-animated="true"'));
    assertEquals(
      await renderPlateHtml(input, {
        variant,
        inline: true,
        includeStyles: false,
        animated: true,
      }),
      html,
    );
    const styled = await renderPlateHtml(input, { variant, inline: true });
    assert(styled.includes(plateVariantCss));
    const react = renderToStaticMarkup(
      <ResolvedPlate {...input} variant={variant} inline animated />,
    );
    assert(react.includes(html));
  }
  assert(
    renderToStaticMarkup(<Plate {...input} inline variant="compact" />)
      .startsWith("<span"),
  );
  assert(!(await renderPlateHtml(input)).includes(plateVariantCss));
  assert(
    (await renderPlateHtml(input, { variant: "picker" })).includes(
      plateVariantCss,
    ),
  );
});

Deno.test("contract batches resume the first unchecked candidate and keep identity/partition", async () => {
  const first = await farmContractBatch(options);
  assertEquals(first.status, "paused");
  assertEquals(first.checked, 2);
  assertEquals(first.checkpoint!.nextSaltHex, "0".repeat(63) + "2");
  const saved = JSON.parse(JSON.stringify(first.checkpoint));
  const next = await resumeContractFarm(saved, { maxAttempts: 3 });
  assertEquals(next.checked, 3);
  assertEquals(next.checkpoint!.nextSaltHex, "0".repeat(63) + "5");
  assertEquals(next.checkpoint!.deployer, contract);
  assertEquals(next.checkpoint!.networkPassphrase, networkPassphrase);
  assertEquals(next.checkpoint!.suffix, options.suffix);
  assertEquals(saved, first.checkpoint);
  const matchAddress = deriveContractAddress(
    networkPassphrase,
    contract,
    hexToSalt(saved.nextSaltHex),
  );
  const match = await resumeContractFarm({
    ...saved,
    suffix: matchAddress.slice(-5),
  }, { maxAttempts: 1 });
  assertEquals(match.status, "found");
  assertEquals(match.match!.address, matchAddress);
  assertEquals(match.checkpoint!.nextSaltHex, "0".repeat(63) + "3");
  const controller = new AbortController();
  const cancelled = await farmContractBatch({
    ...options,
    maxAttempts: 8,
    signal: controller.signal,
    onProgress: ({ checked }) => {
      if (checked === 1) controller.abort();
    },
  });
  assertEquals(cancelled.status, "aborted");
  assertEquals(cancelled.checked, 1);
  assertEquals(cancelled.checkpoint!.nextSaltHex, "0".repeat(63) + "1");
  const preCancelled = await farmContractBatch({
    ...options,
    signal: AbortSignal.abort(),
  });
  assertEquals(preCancelled.status, "aborted");
  assertEquals(preCancelled.checked, 0);
  const zero = await farmContractBatch({ ...options, maxAttempts: 0 });
  assertEquals(zero.status, "paused");
  assertEquals(zero.checked, 0);
  const last = await farmContractBatch({
    ...options,
    startSalt: new Uint8Array(32).fill(255),
  });
  assertEquals(last.status, "exhausted");
  assertEquals(last.checked, 1);
  assertEquals(last.checkpoint, undefined);
  await assertRejects(
    () => resumeContractFarm({ ...saved, strideHex: "0".repeat(64) }),
    InvalidSaltStrideError,
  );
  await assertRejects(
    () => resumeContractFarm({ ...saved, strideHex: "bad" }),
    InvalidSaltHexError,
  );
  await assertRejects(
    () => resumeContractFarm({ ...saved, nextSaltHex: "bad" }),
    InvalidSaltHexError,
  );
  const immediate = deriveContractAddress(
    networkPassphrase,
    contract,
    options.startSalt,
  );
  const defaultResume = await resumeContractFarm({
    ...saved,
    nextSaltHex: bytesToHex(options.startSalt),
    suffix: immediate.slice(-1),
  });
  assertEquals(defaultResume.status, "found");
});
Deno.test("worker partitions are disjoint, immutable and bounded by the salt space", async () => {
  const salt = new Uint8Array(32);
  const candidates = new Set<string>();
  for (let worker = 0; worker < 3; worker++) {
    const partition = createContractFarmPartition(salt, worker, 3);
    assertEquals(partition.stride, 3n);
    const batch = await farmContractBatch({
      ...options,
      ...partition,
      maxAttempts: 1,
    });
    candidates.add(bytesToHex(partition.startSalt!));
    candidates.add(batch.checkpoint!.nextSaltHex);
  }
  assertEquals(candidates.size, 6);
  assertEquals(salt, new Uint8Array(32));
  for (
    const [index, count] of [[-1, 3], [3, 3], [0, 0], [.5, 3], [0, Infinity], [
      NaN,
      2,
    ]]
  ) {
    assertThrows(
      () => createContractFarmPartition(salt, index, count),
      InvalidFarmPartitionError,
    );
  }
  assertThrows(
    () => createContractFarmPartition(new Uint8Array(32).fill(255), 1, 2),
    InvalidFarmPartitionError,
  );
  assertThrows(
    () => createContractFarmPartition(new Uint8Array(31), 0, 1),
    InvalidSaltLengthError,
  );
  assertThrows(
    () => createContractFarmPartition(null as unknown as Uint8Array, 0, 1),
    InvalidSaltLengthError,
  );
});
