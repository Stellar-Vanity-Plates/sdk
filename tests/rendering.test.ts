import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { StrKey } from "@colibri/core";
import { createPlateModel, renderPlateSvg } from "@/rendering/mod.ts";
import { renderPlatePng } from "@/rendering/png.ts";
import { registerVanityPlate } from "@/web/mod.ts";
import config from "@examples/testnet.json" with { type: "json" };
const plate = { address: config.contracts.nft, suffix: "PLATES" };
Deno.test("plate traits preserve the application byte rules for both address types", () => {
  for (const kind of ["account", "contract"] as const) {
    for (
      const [run, rarity] of [[1, "standard"], [2, "registered"], [3, "foil"], [
        4,
        "aurora",
      ], [7, "pole"]] as const
    ) {
      const bytes = new Uint8Array(32).fill(3),
        offset = kind === "account" ? 14 : 5;
      for (let i = 0; i < 7; i++) bytes[offset + i] = i < run ? 7 : 8;
      bytes[kind === "account" ? 12 : 15] = 2;
      const address = kind === "account"
        ? StrKey.encodeEd25519PublicKey(bytes)
        : StrKey.encodeContract(bytes);
      const model = createPlateModel({ address, suffix: address.slice(-3) });
      assertEquals(model.rarity, rarity);
      assertEquals(model.rarityRun, run);
      assertEquals(model.finish, "sideband");
    }
  }
});
Deno.test("SVG is deterministic, accessible, bounded and contains no external assets or malformed paths", () => {
  const svg = renderPlateSvg(plate);
  assertEquals(svg, renderPlateSvg(plate));
  assert(svg.includes(plate.address));
  assert(!/NaN|Infinity|<script|<image|<text|href=/.test(svg));
  assertThrows(() => renderPlateSvg({ ...plate, suffix: "<script>" }));
  assertThrows(() =>
    renderPlateSvg(plate, { idPrefix: 'x" onload="alert(1)' })
  );
  assertThrows(() => renderPlateSvg(plate, { width: 100000 }));
  assertThrows(() => createPlateModel({ address: plate.address }));
  assertEquals(
    createPlateModel({
      address: StrKey.encodeEd25519PublicKey(new Uint8Array(32)),
    }).configured,
    false,
  );
  const address = StrKey.encodeContract(new Uint8Array(32));
  assert(
    renderPlateSvg({ address, suffix: address.slice(-4) }, { animated: true })
      .includes("prefers-reduced-motion"),
  );
  assert(
    renderPlateSvg({ address, suffix: address.slice(-4) }).includes(
      'data-animated="false"',
    ),
  );
  assertEquals(typeof registerVanityPlate, "function"); // SSR import does not access HTMLElement.
});
Deno.test("browser PNG fails explicitly without a DOM", async () => {
  await assertRejects(
    () => renderPlatePng(plate),
    Error,
    "browser DOM is required",
  );
});
