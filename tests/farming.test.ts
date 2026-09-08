import { assert, assertEquals, assertRejects, assertThrows } from "@std/assert";
import { NetworkConfig, StrKey } from "@colibri/core";
import { abbreviateAddress, normalizeSuffix, validatePlate } from "../mod.ts";
import {
  deriveContractAddress,
  farmAccount,
  farmContract,
  hexToSalt,
  verifyAccountFarmResult,
  verifyContractFarmResult,
} from "../src/farming/mod.ts";

const deployer = StrKey.encodeContract(new Uint8Array(32));
const passphrase = NetworkConfig.TestNet().networkPassphrase;

Deno.test("derivation validates inputs and separates Stellar networks", () => {
  const source = StrKey.encodeEd25519PublicKey(new Uint8Array(32));
  const derived = deriveContractAddress(passphrase, source, new Uint8Array(32));
  assert(StrKey.isValidContractId(derived));
  assert(
    derived !==
      deriveContractAddress(
        NetworkConfig.MainNet().networkPassphrase,
        source,
        new Uint8Array(32),
      ),
  );
  assertThrows(() =>
    deriveContractAddress(passphrase, source, new Uint8Array(31))
  );
});
Deno.test("C search returns the exact local salt and independently verifies it", async () => {
  const salt = new Uint8Array(32);
  const address = deriveContractAddress(passphrase, deployer, salt);
  const result = await farmContract({
    suffix: address.slice(-4),
    networkPassphrase: passphrase,
    deployer,
    startSalt: salt,
    maxAttempts: 1,
  });
  assert(result);
  assertEquals(result.address, address);
  assertEquals(result.checked, 1);
  assert(verifyContractFarmResult(result));
  assert(
    !verifyContractFarmResult({
      ...result,
      deployer: StrKey.encodeContract(new Uint8Array(32).fill(1)),
    }),
  );
  assertEquals(salt, new Uint8Array(32));
});
Deno.test("G search returns a matching private seed and never exposes it in progress", async () => {
  const keys: string[][] = [];
  const result = await farmAccount({
    suffix: "a",
    maxAttempts: 4096,
    onProgress: (value) => keys.push(Object.keys(value)),
  });
  assert(result);
  assert(verifyAccountFarmResult(result));
  assert(keys.every((key) => key.join() === "checked,elapsedMs"));
  assert(
    !verifyAccountFarmResult({
      ...result,
      address: StrKey.encodeEd25519PublicKey(new Uint8Array(32)),
    }),
  );
});
Deno.test("attempt budgets, cancellation and invalid search inputs", async () => {
  assertEquals(await farmAccount({ suffix: "A", maxAttempts: 0 }), undefined);
  await assertRejects(() => farmAccount({ suffix: "0" }));
  await assertRejects(() =>
    farmAccount({ suffix: "A", signal: AbortSignal.abort() })
  );
  await assertRejects(() =>
    farmAccount({ suffix: "A", maxAttempts: Infinity })
  );
  await assertRejects(() => farmAccount({ suffix: "A", batchSize: 0 }));
  await assertRejects(() =>
    farmContract({
      suffix: "A",
      deployer,
      networkPassphrase: passphrase,
      stride: 0n,
    })
  );
  assertThrows(() => hexToSalt("zz".repeat(32)));
});
Deno.test("address checks include checksum, kind and exact normalized suffix", () => {
  assertEquals(normalizeSuffix("hero"), "HERO");
  assert(validatePlate(deployer, deployer.slice(-4), "contract"));
  assert(!validatePlate(deployer, deployer.slice(-4), "account"));
  assert(!validatePlate(deployer.slice(0, -1) + "!", "!"));
  assertEquals(
    abbreviateAddress(deployer),
    `${deployer.slice(0, 6)}…${deployer.slice(-6)}`,
  );
});
