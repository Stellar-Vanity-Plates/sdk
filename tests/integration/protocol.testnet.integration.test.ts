import config from "@examples/testnet.json" with { type: "json" };
import { describe, it } from "@std/testing/bdd";
import { assert, assertEquals } from "@std/assert";
import { NetworkConfig } from "@colibri/core";
import { createProtocolClients, NftClient } from "@/contracts/index.ts";
import { NFT_CONTRACT_DEFAULTS, resolvePlateInput } from "@/rendering/index.ts";
// Optional public-network suite: only ABI retrieval and unsigned simulation, no funding or submission.
const networkConfig = NetworkConfig.TestNet();
const contractId = NFT_CONTRACT_DEFAULTS[networkConfig.networkPassphrase]!;
const address = "CDBTZHETZ3Q55ZRQERCW4SVR3KCGZSGQ3WWSTJ2GDO4JH3KKNYUPBEAT";
describe("deployed Testnet NFT protocol", () => {
  it("validates the live ABI and reads the retained UPBEAT claim", async () => {
    const client = new NftClient({ networkConfig, contractId });
    await client.ready();
    const plate = await client.getPlate(address);
    assertEquals(plate.character_count, 6);
    assertEquals(plate.salt?.length, 32);
    assert((await client.read("name", {})).length > 0);
  });
  it("resolves the chain configuration over an explicit local count", async () => {
    assertEquals(
      (await resolvePlateInput({ address, networkConfig, suffixLength: 2 }))
        .suffixLength,
      6,
    );
  });
});

Deno.test("all five captured protocol interfaces match the deployed public network", async () => {
  const clients = createProtocolClients(networkConfig, config.contracts);
  for (const client of Object.values(clients)) await client.ready();
  assert(Object.keys(clients).length === 5);
});
