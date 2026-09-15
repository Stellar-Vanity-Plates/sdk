/** Local search example. Does not print the private seed or deployment salt. */
import { farmAccount, farmContract } from "@/farming/index.ts";
import config from "@examples/testnet.json" with { type: "json" };
const account = await farmAccount({ suffix: "A", maxAttempts: 4096 });
console.log(
  account
    ? `Account found: ${account.address}. Its secret is available on the result object.`
    : "Account search budget exhausted.",
);
const contract = await farmContract({
  suffix: "A",
  maxAttempts: 4096,
  deployer: config.contracts.deployer,
  networkPassphrase: config.networkPassphrase,
});
console.log(
  contract
    ? `Contract found: ${contract.address}. Its salt is available on the result object.`
    : "Contract search budget exhausted.",
);
