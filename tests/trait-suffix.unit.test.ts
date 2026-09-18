import { assertEquals } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import { StrKey } from "@colibri/core/strkey";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function encodedBits(address: string): bigint {
  return Array.from(address).reduce(
    (value, c) => (value << 5n) | BigInt(alphabet.indexOf(c)),
    0n,
  );
}
function rank(columns: bigint[]): number {
  const basis = new Map<number, bigint>();
  for (let value of columns) {
    while (value) {
      const pivot = value.toString(2).length;
      const prior = basis.get(pivot);
      if (prior === undefined) {
        basis.set(pivot, value);
        break;
      }
      value ^= prior;
    }
  }
  return basis.size;
}

describe("svp-1 suffix conditioning", () => {
  it("unused identity bits span every catalog suffix constraint, including CRC16", () => {
    // Exact linear rank for uniform payloads. This does not assert that real
    // Ed25519 point encodings are independent uniform 256-bit strings.
    for (
      const encode of [StrKey.encodeContract, StrKey.encodeEd25519PublicKey]
    ) {
      const baseline = encodedBits(encode(new Uint8Array(32)));
      const columns = Array.from({ length: 256 }, (_, i) => {
        const bytes = new Uint8Array(32);
        bytes[Math.floor(i / 8)] = 1 << (i % 8);
        return encodedBits(encode(bytes)) ^ baseline;
      });
      for (let length = 4; length <= 12; length++) {
        const mask = (1n << BigInt(length * 5)) - 1n;
        const suffixColumns = columns.map((value) => value & mask);
        assertEquals(rank(suffixColumns), length * 5);
        // All visual inputs are inside bytes 1–15. Fixing them leaves
        // equally many completions for every suffix when these ranks match.
        assertEquals(rank(suffixColumns.slice(15 * 8)), length * 5);
      }
    }
  });
});
