# Vanity Plates SDK

TypeScript and Deno tools for integrating Vanity Plates into your application.
Built on **Colibri 1.0.0**, with no dependency on the Vanity Plates backend.

This is the first private, source-based version (`0.1.0`). The provisional
package name is `@vanity-plates/sdk`; it has **not been published** to JSR or
npm. Use Deno **2.9.6**, the verified runtime.

```sh
git clone --branch feat/sdk-visual-parity https://github.com/Stellar-Vanity-Plates/sdk.git
cd sdk
deno task test
deno task preview
```

Open <http://127.0.0.1:4192/> for responsive plates, animations, SVG/PNG
downloads and local farming. Imports below use the repository aliases in
`deno.json`. An external Deno application can map these local sources until a
package is published. Do not add an unpublished JSR specifier.

## Entry points

| Source                        | Includes                                                             |
| ----------------------------- | -------------------------------------------------------------------- |
| `mod.ts`                      | G/C checksum validation, suffix validation, abbreviation, SDK errors |
| `src/farming/mod.ts`          | Local G keypair and C deployment-salt farming                        |
| `src/accounts/mod.ts`         | RPC ManageData reads, strict parsing, standard fallback              |
| `src/contracts/mod.ts`        | Five typed contract clients and all ABI record types                 |
| `src/rendering/mod.ts`        | Canonical HTML/CSS and browser-compatible SVG export                 |
| `src/rendering/png.ts`        | Local browser PNG export                                             |
| `src/rendering/png-server.ts` | Optional local Chromium PNG export for Deno/Node                     |
| `src/web/mod.ts`              | Framework-independent `<vanity-plate>` registration                  |
| `src/react/mod.tsx`           | Optional React `Plate` component with SSR support                    |

These are also declared as future package subpaths in `deno.json`.

## Local farming

```ts
import { farmAccount, farmContract } from "@/farming/mod.ts";
import deployment from "@examples/testnet.json" with { type: "json" };

const account = await farmAccount({
  suffix: "A",
  maxAttempts: 10_000,
  signal: AbortSignal.timeout(30_000),
});
// account?.address is public. account?.secret is its private S seed.

const contract = await farmContract({
  suffix: "A",
  networkPassphrase: deployment.networkPassphrase,
  deployer: deployment.contracts.deployer,
  maxAttempts: 10_000,
  onProgress: ({ checked }) => console.log(`${checked} candidates checked`),
});
// contract?.salt / contract?.saltHex is the salt required for deployment.
```

Searches return `undefined` when the attempt budget is exhausted. Cancellation
throws `VanityError` with code `VNTY_ABORTED`. Work yields between batches
(default 128); use a Web Worker for sustained frontend farming. Longer suffixes
cost much more work and a bounded search is not guaranteed to find a match.
Searches match address endings, not arbitrary positions.

`deriveContractAddress(passphrase, deployer, salt)` reproduces C addresses;
`verifyAccountFarmResult` and `verifyContractFarmResult` validate results. For
NFT plates, use the protocol **deployer C address**, not your wallet or NFT
contract. Changing the deployer or network changes the derived address.
`startSalt` and positive `stride` support partitioned C searches; salts
increment as unsigned big-endian 256-bit integers without wraparound.

Farming does not fund accounts, check availability, reserve, mint or deploy.
Keep seeds private and salts private until a reservation has been confirmed. The
SDK never logs or persists either. Signer buffers are destroyed after each
attempt; JavaScript strings cannot be reliably zeroized.

## Account configuration

```ts
import { NetworkConfig } from "@colibri/core";
import { loadAccountConfiguration } from "@/accounts/mod.ts";

const display = await loadAccountConfiguration(
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  { networkConfig: NetworkConfig.TestNet() },
);
console.log(display.status, display.label);
```

Colibri reads the account and `config.svp.gchar` ManageData entry in one Stellar
RPC batch. Configuration is decimal UTF-8, integer 1–55. `configured`,
`unconfigured`, `invalid` and `account-not-found` are distinct states. RPC
errors reject; they are never disguised as missing configuration.

`accountDisplay(address, suffixLength)` works offline. Invalid/missing metadata
uses first six characters, ellipsis, last six, while retaining the full address.
`parseSuffixLength` accepts RPC bytes or decimal text;
`decodeHorizonSuffixLength` accepts canonical Horizon Base64.
`encodeSuffixLength` prepares bytes without submitting a ManageData write.

## Contract clients

```ts
import { NetworkConfig } from "@colibri/core";
import { createProtocolClients } from "@/contracts/mod.ts";
import deployment from "@examples/testnet.json" with { type: "json" };

const network = NetworkConfig.CustomNet({
  networkPassphrase: deployment.networkPassphrase,
  rpcUrl: deployment.rpcUrl,
});
const clients = createProtocolClients(network, deployment.contracts);
const economics = await clients.treasury.read("get_config", {});
const reservation = await clients.nft.read("get_reservation", {
  contract_address: deployment.contracts.nft,
});
console.log(economics, reservation);
```

| Client              | Callable methods | Includes                                                           |
| ------------------- | ---------------: | ------------------------------------------------------------------ |
| `NftClient`         |               40 | Reservations, minting, claims, ownership, transfers, configuration |
| `DeployerClient`    |                6 | Address prediction, NFT redemption/deployment, configuration       |
| `MarketplaceClient` |               14 | Listings, purchases, seller sales, configuration                   |
| `TreasuryClient`    |               40 | Fees, VNTY accounting, redemption, vault/strategy integrations     |
| `RbacClient`        |               11 | Roles, administrator handover, upgrades                            |

Names match contract methods exactly. Arguments and decoded read results are
typed: `bigint` for 64/128/256-bit integers, `Uint8Array` for bytes, `Map` for
maps, and tagged objects for unions. Options decode to `undefined`. Generic
Soroban `Val` inputs (such as constructor arguments) require native Stellar SDK
`xdr.ScVal` values. Keep token amounts as integers.

Construction performs no request. The first `read`, `invoke` or `ready()` loads
and checks the deployed ABI against the bundled specification. Incompatible
functions/records throw `VNTY_INCOMPATIBLE_CONTRACT`; additional functions are
allowed. This checks interface compatibility, not deployment trust or contract
safety. Recreate clients after upgrades; a deployment can change after a read.

`read()` simulates without signing or submitting; simulated ledger changes do
not persist, and methods requiring authorization can still fail. `invoke()` uses
Colibri's simulate/sign/submit pipeline and returns its **transaction receipt**,
not the decoded simulation result:

```ts
import type { TransactionConfig } from "@colibri/core";
import type { NftClient } from "@/contracts/mod.ts";

export async function mintReservedPlate(
  nft: NftClient,
  salt: Uint8Array,
  config: TransactionConfig,
) {
  // Supply source, signers, fee strategy and timeout deliberately.
  // Call only after the reservation transaction has been confirmed.
  return await nft.invoke("mint", { salt }, { config });
}
```

See `examples/invoke.ts` for reservation with network/deployer checks. Keep
reservation and mint explicit so the caller can confirm payment and retain the
salt. Raw Colibri errors propagate. Advanced integrations can use
`client.contract` and its owned `readPipe`/`invokePipe`, or supply plugins when
constructing an individual client. No platform signer is bundled.

The public Testnet specs and Wasm hashes were captured on **2026-09-08** under
`src/contracts/specs/`. They are the inputs to `deno task generate`.
`examples/testnet.json` is a dated deployment fixture, not a permanent registry;
supply explicit addresses for another deployment.

## SVG and PNG

```ts
import { renderPlateSvg } from "@/rendering/mod.ts";
import { renderPlatePng } from "@/rendering/png.ts";

const plate = {
  address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
  suffix: "PLATES",
};
const svg = renderPlateSvg(plate, { width: 600 });
const png = await renderPlatePng(plate, { width: 1600 });
```

The renderer uses the webapp's canonical Clubhouse composition: font weights,
letter spacing, badge/stripe geometry, screws, metal rim, foil lettering and
identicon masks. The same G or C address and suffix produces the same plate in
HTML, web/React, SVG and PNG. Legacy patterns are still available in the trait
model but are not painted when the app suppresses them. No rarity footer is
added.

Contract plates require a matching suffix. Account plates accept a suffix or
`suffixLength`, with the app's first-six/last-six fallback when unconfigured.
Width is bounded to 120–4096 pixels; output height is `round(width / 2.9)`. The
full address stays accessible and visible; appearance does not prove ownership.
Use unique `idPrefix` values for repeated inline SVGs.

**Export change from the first preview:** SVG now embeds the canonical HTML/CSS
using `foreignObject`, including all fonts and identicons. It is self-contained
and generated without a DOM or network, but requires a modern browser renderer.
It is not an outlined-vector SVG for resvg, Illustrator or SVG-only image
services. Use PNG for consumers that do not support HTML-backed SVG.

The `@/rendering/png.ts` entrypoint uses browser Canvas locally. Deno/Node
consumers use the separate server entrypoint, backed by local Chromium:

```sh
deno run -A npm:playwright@1.61.0 install chromium
deno task example:export
```

```ts
import { renderPlatePng } from "@/rendering/png-server.ts";
const png = await renderPlatePng({
  address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
  suffix: "PLATES",
}, { width: 1600 });
```

The server adapter needs process/filesystem permissions and local browser
communication. It blocks external page requests; it never contacts our backend.
Pass an existing Playwright `browser` for batch exports, or an `executablePath`
for a separately installed Chromium. Caller-owned browsers remain open;
temporary contexts always close. Calling the browser exporter without a DOM
fails explicitly. There is no silent fallback to a different-looking plate.

PNG is the resting frame. Browser fonts and image data are embedded, so a custom
CSP needs inline styles plus `data:` in `font-src` and `img-src`. No Wasm
execution is needed. React and headless Chromium stay outside
core/farming/browser bundles.

## Web and React

```ts
import { registerVanityPlate } from "@/web/mod.ts";
registerVanityPlate(); // Call in the browser; importing is SSR-safe.
```

```html
<vanity-plate
  address="CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES"
  suffix="PLATES"
  animated
></vanity-plate>
```

Set host width in CSS; the component keeps its aspect ratio. Attributes update
reactively. Invalid input displays a fallback and dispatches `plate-error`.
`animated` enables the app’s hover interactions (badge breathing, watermark
floating, stripe gleam and rarity foil shifts) and honors reduced motion. With
the attribute absent, the plate stays still even on hover. Embedded fonts are
registered once in the document because shadow roots cannot own font faces.

```tsx
import { Plate } from "@/react/mod.tsx";

export function AccountBadge({ address }: { address: string }) {
  return (
    <Plate
      address={address}
      suffixLength={4}
      animated
      style={{ maxWidth: 480 }}
    />
  );
}
```

React uses the same canonical HTML/CSS renderer with accessible labels. Invalid
React props throw; use your application's error boundary. React and server PNG
are optional entry points; core validation/farming imports exclude them and
bundled fonts. React 18 is the first verified adapter target. Deno SSR with
React requires `--allow-env=NODE_ENV`; no other environment access is needed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for aliases, module boundaries and the
mandatory webapp-source comparison before a rendering release.

## Verification and development

```sh
deno task check          # Format, lint, source and example types
deno task docs           # Public API documentation lint
deno task test           # Offline behavior, architecture and trait-parity tests
deno task test:browser   # Exact visual comparisons against the webapp reference
deno task generate       # Regenerate typed models from checked-in specs
deno task build:preview  # Browser bundle, including lazy PNG export
deno task test:live      # Explicit read-only Testnet checks for all five contracts
deno task example:export # Write output/plate.svg and output/plate.png
deno task example:farm   # Local searches without logging seeds or salts
```

Deno's experimental bundler reports upstream Stellar SDK side-effect metadata
warnings; the browser consumer is verified directly. Deno doc reports an
upstream React `global.d.ts` and Playwright `electron` resolution warnings;
TypeScript and an SSR consumer test verify the adapter separately.

First-version boundaries: no registry publication, Mainnet write test, wallet
UI, GPU/worker pool or NFT indexer. Treasury's vault integration methods are
included; use Colibri token/contract clients for direct VNTY token or
third-party vault calls. Fee-bearing writes are tested with execution
intercepted at the submission boundary and have not been submitted to a live
network in this implementation. Review these flows before release.

Project distribution terms remain to be selected before a public release.
Bundled assets retain their licenses; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
