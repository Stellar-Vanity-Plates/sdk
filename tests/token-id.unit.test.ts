import { assertEquals, assertThrows } from "@std/assert";
import { StrKey } from "@colibri/core/strkey";
import { addressToTokenId, tokenIdToAddress } from "@/token-id.ts";
import {
  InvalidProtocolContractAddressError,
  InvalidTokenIdError,
} from "@/errors.ts";
Deno.test("contract IDs preserve all 256 bits, leading zeroes and byte order", () => {
  for (const id of [0n, 1n, 255n, 256n, 1n << 200n, (1n << 256n) - 1n]) {
    assertEquals(addressToTokenId(tokenIdToAddress(id)), id);
  }
  const bytes = new Uint8Array(32);
  bytes[0] = 1;
  bytes[31] = 2;
  const address = StrKey.encodeContract(bytes);
  assertEquals(addressToTokenId(address), (1n << 248n) + 2n);
  assertEquals(tokenIdToAddress((1n << 248n) + 2n), address);
});
Deno.test("token conversion rejects non-contract addresses and lossy or overflowing IDs", () => {
  for (
    const input of ["", StrKey.encodeEd25519PublicKey(new Uint8Array(32)), 12]
  ) {
    assertThrows(
      () => addressToTokenId(input as string),
      InvalidProtocolContractAddressError,
    );
  }
  for (const input of [-1n, 1n << 256n, 1, "1", null]) {
    assertThrows(() => tokenIdToAddress(input as bigint), InvalidTokenIdError);
  }
});

Deno.test("NFT facade addresses are converted locally and plate reads remain one call", async () => {
  const { NftClient } = await import("@/contracts/nft-client.ts");
  const { NetworkConfig } = await import("@colibri/core");
  const address = tokenIdToAddress(1n << 200n);
  const client = new NftClient({
    networkConfig: NetworkConfig.TestNet(),
    contractId: address,
  });
  const calls: unknown[] = [];
  const plate = { controller: address, character_count: 56, salt: null };
  client.read = ((method: string, args: unknown) => {
    calls.push([method, args]);
    return Promise.resolve(method === "get_plate" ? plate : address);
  }) as typeof client.read;
  assertEquals(await client.getPlate(address), plate);
  assertEquals(await client.ownerOf(address), address);
  assertEquals(calls, [["get_plate", { contract_address: address }], [
    "owner_of",
    { token_id: 1n << 200n },
  ]]);
});
