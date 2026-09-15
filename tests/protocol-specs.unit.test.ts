import { assertEquals } from "@std/assert";
import {
  DeployerSpec,
  MarketplaceSpec,
  NftSpec,
  RbacSpec,
  TreasurySpec,
} from "@/contracts/index.ts";
import provenance from "@tests/fixtures/protocol-specs.json" with {
  type: "json",
};
Deno.test("all generated bindings reproduce their dated public ABI snapshots", async () => {
  const specs = {
    nft: NftSpec,
    deployer: DeployerSpec,
    marketplace: MarketplaceSpec,
    treasury: TreasurySpec,
    rbac: RbacSpec,
  };
  for (const item of provenance.contracts) {
    const text = await Deno.readTextFile(
      `tests/fixtures/contract-specs/${item.name}.json`,
    );
    const digest = Array.from(
      new Uint8Array(
        await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
      ),
      (b) => b.toString(16).padStart(2, "0"),
    ).join("");
    assertEquals(digest, item.specSha256, item.name);
    const spec = specs[item.name as keyof typeof specs];
    assertEquals(
      spec.entries.map((entry) => entry.toXdr("base64")),
      JSON.parse(text),
    );
    assertEquals(
      spec.funcs().map((fn) => String(fn.name)).filter((name) =>
        name !== "__constructor"
      ),
      item.methods,
    );
  }
});
