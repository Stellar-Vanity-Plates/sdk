# Vanity Plates SDK

TypeScript and Deno building blocks for Stellar Vanity Plates, powered by
Colibri 1.0. This first version is under development in the private repository.
The package name is provisional; no registry package has been published.

Use Deno 2.9.6. Start with `deno task check`, `deno task test`, and
`deno task docs`. The SDK does not connect to the Vanity Plates backend.

Farming happens locally and returns caller-owned key material or deployment
salts. Keep that material private. Searching does not create or fund an account,
reserve an NFT, or deploy a contract.
