import { assert, assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { LocalSigner, StrKey } from "@colibri/core";
import { generateIdenticon } from "@colibri/identicon";
import { createPlateModel } from "@/rendering/model.ts";
import { createPlateAppearance } from "@/rendering/appearance.ts";
import {
  PLATE_FINISHES,
  PLATE_LETTERINGS,
  PLATE_RARITIES,
  PLATE_TRAIT_RECIPE,
} from "@/rendering/recipe.ts";

const encoders = [StrKey.encodeEd25519PublicKey, StrKey.encodeContract];
const model = (bytes: Uint8Array) =>
  createPlateModel({ address: StrKey.encodeContract(bytes) });
function traits(address: string, suffixLength?: number) {
  const {
    address: _address,
    kind: _kind,
    label: _label,
    configured: _configured,
    ...value
  } = createPlateModel({ address, suffixLength });
  return value;
}

describe("svp-1 shared identity recipe", () => {
  it("pins public names, selector positions and recipe identity", () => {
    assertEquals(PLATE_TRAIT_RECIPE, {
      version: "svp-1",
      hueByte: 2,
      letteringByte: 7,
      letteringMask: 3,
      finishByte: 8,
      finishMask: 3,
      rarityFirstByte: 9,
      rarityByteCount: 7,
      rarityMask: 31,
    });
    assertEquals(PLATE_LETTERINGS.map((x) => x.id), [
      "mono",
      "rally",
      "coach",
      "slab",
    ]);
    assertEquals(PLATE_FINISHES.map((x) => x.id), [
      "badge",
      "watermark",
      "sideband",
      "pattern",
    ]);
    assertEquals(PLATE_RARITIES.map((x) => x.run), [1, 2, 3, 4, 7]);
  });
  it("G and C payload twins have identical traits, palette and Colibri icons", () => {
    for (let sample = 0; sample < 256; sample++) {
      const bytes = Uint8Array.from(
        { length: 32 },
        (_, i) => (sample + i * 37) & 255,
      );
      const [g, c] = encoders.map((encode) => encode(bytes));
      assertEquals(traits(g), traits(c));
      assertEquals(createPlateAppearance(g), createPlateAppearance(c));
      assertEquals(traits(g).hue, generateIdenticon(g).hue * 360);
      for (const count of [undefined, 1, 4, 12, 55, 0, 56]) {
        assertEquals(traits(g, count), traits(g));
      }
    }
  });
  it("each full selector byte gives every font and finish exactly 64 slots", () => {
    const fonts = new Map<string, number>(),
      finishes = new Map<string, number>();
    const bytes = new Uint8Array(32);
    for (let value = 0; value < 256; value++) {
      bytes[6] = value;
      bytes[7] = value;
      const m = model(bytes);
      fonts.set(m.lettering, (fonts.get(m.lettering) ?? 0) + 1);
      finishes.set(m.finish, (finishes.get(m.finish) ?? 0) + 1);
      assertEquals(m.rarity, "pole");
    }
    assertEquals([...fonts.values()], [64, 64, 64, 64]);
    assertEquals([...finishes.values()], [64, 64, 64, 64]);
  });
  it("all run boundaries and anchor values use seven separately masked bytes", () => {
    const expected = [
      "standard",
      "registered",
      "foil",
      "aurora",
      "aurora",
      "aurora",
      "pole",
    ];
    for (let anchor = 0; anchor < 32; anchor++) {
      for (let run = 1; run <= 7; run++) {
        const bytes = new Uint8Array(32);
        for (let i = 0; i < 7; i++) {
          bytes[8 + i] = ((i * 32) & 224) |
            (i < run ? anchor : (anchor + 1) % 32);
        }
        for (const encode of encoders) {
          const m = createPlateModel({ address: encode(bytes) });
          assertEquals(m.rarity, expected[run - 1]);
          assertEquals(m.rarityRun, run);
          assertEquals(m.raritySignature.length, 7);
        }
      }
    }
  });
  it("ignores reserved bits and all payload bytes outside the selected traits", () => {
    const baseline = Uint8Array.from({ length: 32 }, (_, i) => i * 7);
    const original = model(baseline);
    // Bits outside hue, lettering, finish and the seven rarity symbols cannot affect these traits.
    for (let i = 0; i < 32; i++) {
      for (let bit = 0; bit < 8; bit++) {
        if (
          i === 1 || ((i === 6 || i === 7) && bit < 2) ||
          (i >= 8 && i <= 14 && bit < 5)
        ) continue;
        const bytes = baseline.slice();
        bytes[i] ^= 1 << bit;
        assertEquals(
          traits(StrKey.encodeContract(bytes)),
          traits(original.address),
        );
      }
    }
    // Independently vary all three other selectors while preserving each rarity boundary.
    for (let run = 1; run <= 7; run++) {
      for (let i = 0; i < 7; i++) baseline[8 + i] = i < run ? 7 : 8;
      const rarity = model(baseline).rarity;
      for (let value = 0; value < 256; value++) {
        const bytes = baseline.slice();
        bytes[1] = value;
        bytes[6] = value;
        bytes[7] = 255 - value;
        assertEquals(model(bytes).rarity, rarity);
      }
    }
  });
  it("checks deterministic real Ed25519 keys rather than only arbitrary G payloads", () => {
    const counts = Array.from({ length: 4 }, () => [0, 0, 0, 0]);
    // Public test seeds only. No secrets or signer instances are retained or emitted.
    for (let i = 0; i < 4096; i++) {
      const seed = new Uint8Array(32);
      new DataView(seed.buffer).setUint32(0, i);
      const signer = LocalSigner.fromSecret(
        StrKey.encodeEd25519SecretSeed(seed),
      );
      try {
        const address = signer.publicKey(),
          bytes = StrKey.decodeEd25519PublicKey(address);
        const m = createPlateModel({ address });
        assertEquals(traits(address), traits(StrKey.encodeContract(bytes)));
        counts[PLATE_LETTERINGS.findIndex((x) => x.id === m.lettering)][
          PLATE_FINISHES.findIndex((x) => x.id === m.finish)
        ]++;
      } finally {
        signer.destroy();
        seed.fill(0);
      }
    }
    // Broad deterministic smoke bound, not a proof of independence or rare-tier odds.
    for (const count of counts.flat()) {
      assert(
        count > 160 && count < 350,
        `Unexpected font/finish count ${count}`,
      );
    }
  });
});
