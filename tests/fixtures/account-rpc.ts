import { assertEquals } from "@std/assert";
import {
  buildAccountLedgerKey,
  buildDataLedgerKey,
  type RpcLedgerEntriesClient,
  StrKey,
} from "@colibri/core";
import { Keypair, xdr } from "@stellar/stellar-sdk";
import { ACCOUNT_SUFFIX_DATA_KEY } from "@/accounts/index.ts";
export function rpcFixture(
  data?: Uint8Array,
  hasAccount = true,
  address = StrKey.encodeEd25519PublicKey(new Uint8Array(32)) as `G${string}`,
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
