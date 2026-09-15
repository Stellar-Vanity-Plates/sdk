import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import { StrKey } from "@colibri/core";
import { rpcFixture } from "@tests/fixtures/account-rpc.ts";
import {
  accountDisplay,
  decodeHorizonSuffixLength,
  encodeSuffixLength,
  loadAccountConfiguration,
  parseSuffixLength,
} from "@/accounts/index.ts";
const address = StrKey.encodeEd25519PublicKey(
  new Uint8Array(32),
) as `G${string}`;
Deno.test("metadata accepts only canonical decimal values and uses a consistent fallback", () => {
  for (const value of ["0", "56", "03", "3 ", "-1", "NaN", "", "1.5"]) {
    assertEquals(parseSuffixLength(value), undefined);
  }
  assertEquals(parseSuffixLength(new Uint8Array([255])), undefined);
  assertEquals(parseSuffixLength(encodeSuffixLength(55)), 55);
  assertEquals(decodeHorizonSuffixLength("Mw=="), 3);
  assertEquals(decodeHorizonSuffixLength("Mw"), undefined);
  assertEquals(accountDisplay(address, 3).label, address.slice(-3));
  assertEquals(accountDisplay(address, NaN), accountDisplay(address));
  assertThrows(() => encodeSuffixLength(2.5));
});
Deno.test("real Colibri ledger decoding distinguishes every account configuration state", async () => {
  assertEquals(
    (await loadAccountConfiguration(address, {
      rpc: rpcFixture(encodeSuffixLength(4)),
    })).status,
    "configured",
  );
  assertEquals(
    (await loadAccountConfiguration(address, { rpc: rpcFixture() })).status,
    "unconfigured",
  );
  assertEquals(
    (await loadAccountConfiguration(address, {
      rpc: rpcFixture(new Uint8Array([255])),
    })).status,
    "invalid",
  );
  assertEquals(
    (await loadAccountConfiguration(address, {
      rpc: rpcFixture(undefined, false),
    })).status,
    "account-not-found",
  );
  await assertRejects(() =>
    loadAccountConfiguration(address, {
      rpc: { getLedgerEntries: () => Promise.reject(new Error("offline")) },
    })
  );
});
