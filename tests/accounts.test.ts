import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  buildAccountLedgerKey,
  buildDataLedgerKey,
  type RpcLedgerEntriesClient,
  StrKey,
} from "@colibri/core";
import { Keypair, xdr } from "@stellar/stellar-sdk";
import {
  ACCOUNT_SUFFIX_DATA_KEY,
  accountDisplay,
  decodeHorizonSuffixLength,
  encodeSuffixLength,
  loadAccountConfiguration,
  parseSuffixLength,
} from "../src/accounts/mod.ts";
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
function rpcFixture(
  data?: Uint8Array,
  hasAccount = true,
): RpcLedgerEntriesClient {
  return {
    getLedgerEntries: (...keys) =>
      Promise.resolve({
        latestLedger: 123,
        entries: keys.flatMap<{ key: xdr.LedgerKey; val: xdr.LedgerEntryData }>(
          (key) => {
            if (
              key.toXdr("base64") ===
                buildAccountLedgerKey({ accountId: address }).toXdr("base64")
            ) {
              return hasAccount
                ? [{
                  key,
                  val: xdr.LedgerEntryData.account(
                    new xdr.AccountEntry({
                      accountId: Keypair.fromPublicKey(address).xdrAccountId(),
                      balance: xdr.Int64.fromString("1000"),
                      seqNum: xdr.Int64.fromString("1"),
                      numSubEntries: 0,
                      inflationDest: null,
                      flags: 0,
                      homeDomain: "",
                      thresholds: new Uint8Array(4),
                      signers: [],
                      ext: xdr.AccountEntryExt.v0(),
                    }),
                  ),
                }]
                : [];
            }
            assertEquals(
              key.toXdr("base64"),
              buildDataLedgerKey({
                accountId: address,
                dataName: ACCOUNT_SUFFIX_DATA_KEY,
              }).toXdr("base64"),
            );
            return data
              ? [{
                key,
                val: xdr.LedgerEntryData.data(
                  new xdr.DataEntry({
                    accountId: Keypair.fromPublicKey(address).xdrAccountId(),
                    dataName: ACCOUNT_SUFFIX_DATA_KEY,
                    dataValue: data,
                    ext: xdr.DataEntryExt.v0(),
                  }),
                ),
              }]
              : [];
          },
        ),
      }),
  };
}
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
