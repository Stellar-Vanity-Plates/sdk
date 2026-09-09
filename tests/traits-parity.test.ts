import { assertEquals } from "@std/assert";
import { StrKey } from "@colibri/core";
import { createPlateModel } from "@/rendering/mod.ts";
import { deriveAccountPlateAppearance } from "@reference/src/browser/account-plates/plate-appearance.ts";
import { derivePlateFinish } from "@reference/src/browser/contract-plates/plate-finishes.ts";
import { derivePlateInsignia } from "@reference/src/browser/ui/PlateInsignia.tsx";

Deno.test("appearance matches independent webapp resolvers across 4096 deterministic G/C payloads", () => {
  let state = 833;
  for (let sample = 0; sample < 2048; sample++) {
    const bytes = Uint8Array.from({ length: 32 }, () => {
      state ^= state << 13;
      state ^= state >>> 17;
      state ^= state << 5;
      return state & 255;
    });
    for (const account of [false, true]) {
      const address = account
        ? StrKey.encodeEd25519PublicKey(bytes)
        : StrKey.encodeContract(bytes);
      const actual = createPlateModel({ address, suffix: address.slice(-5) });
      const appearance = deriveAccountPlateAppearance(address);
      const finish = derivePlateFinish(address);
      assertEquals(actual.finish, derivePlateInsignia(address)!.finish.id);
      assertEquals(
        actual.rarity,
        account ? appearance!.rarity.id : finish.traits.rarity,
      );
      assertEquals(
        actual.rarityRun,
        account ? appearance!.rarity.run : finish.traits.rarityRunLength,
      );
      assertEquals(
        actual.raritySignature,
        account ? appearance!.rarity.signature : finish.traits.raritySignature,
      );
      const lettering = account
        ? ({ stamped: "rally", script: "coach", mono: "mono" } as const)[
          appearance!.lettering.id
        ]
        : finish.lettering.id === "registration"
        ? "mono"
        : finish.lettering.id;
      assertEquals(actual.lettering, lettering);
      if (!account) {
        assertEquals(actual.pattern, finish.traits.pattern);
        assertEquals(actual.patternScale, finish.traits.patternScale);
      }
    }
  }
});
