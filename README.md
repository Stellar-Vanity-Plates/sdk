# Vanity Plates SDK

Display Stellar Vanity Plates in your application, render and export their
artwork, validate addresses, read display settings, find vanity addresses, and
call the plate contracts.

The SDK supports **G plates** for Stellar accounts and **C plates** for
contracts. It provides TypeScript APIs built on Colibri, independently of the
Vanity Plates backend. Farming runs locally. Display lookup uses your
RPC/network configuration; transaction signing remains explicit.

## What it ships

| Capability                                                          | Included APIs                                                               |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Add plates to your UI](#add-plates-to-your-ui)                     | A web component and a React component with SSR support                      |
| [Render and export plates](#render-and-export-plates)               | Shared plate model, HTML/CSS, SVG and PNG rendering                         |
| [Validate addresses and suffixes](#validate-addresses-and-suffixes) | G/C checksum validation, suffix normalization and abbreviation              |
| [Read account display settings](#read-account-display-settings)     | RPC metadata reads, suffix parsing and consistent fallback labels           |
| [Find vanity addresses](#find-vanity-addresses)                     | Account keypair farming, contract salt farming, derivation and verification |
| [Call the protocol](#call-the-protocol)                             | Typed NFT, Deployer, Marketplace, Treasury and RBAC clients                 |

Examples use the SDK's public imports. Install a released version with
`deno add jsr:@vanity-plates/sdk`. For unreleased changes, see
[using the source package](#using-the-source-package) to resolve these imports
from a local checkout in a Deno application.

## Add plates to your UI

Use the same input rules across the web component, React and image exports:

| Input                       | Display behavior                                                |
| --------------------------- | --------------------------------------------------------------- |
| `rpcUrl` or `networkConfig` | Look up the configured ending on chain.                         |
| Only `suffixLength`         | Show that many characters from the end of the address, locally. |
| Neither                     | Use the standard first-six/last-six abbreviation.               |

The count is optional and accepts integers from 1 to 55. Invalid counts also
abbreviate. Display APIs accept counts, never a custom word. When a network is
provided, on-chain metadata takes precedence over `suffixLength`; absent or
invalid metadata abbreviates. Lookup failures remain errors.

G addresses use `config.svp.gchar`. C addresses use the NFT collection's
`get_latest_token_id` and `get_claim`, retaining display information after NFT
redemption/deployment. This lookup identifies a recorded claim; it does not
prove current ownership. The SDK selects the collection by network passphrase
and accepts an `nftContractId` override. Testnet has a bundled collection;
**Mainnet is a placeholder for now** and needs an override for C-plate lookup.
Account lookups work on either network without an NFT collection.

Provide either `rpcUrl` or `networkConfig`, not both. With a URL, the SDK
discovers the network via RPC `getNetwork`; it does not infer the network from
the hostname.

### Web component

Register `<vanity-plate>` in any browser application. It ships reactive
attributes, accessible address labels, optional hover animations and reduced
motion support.

<!-- deno-check -->

```ts
import { registerVanityPlate } from "@vanity-plates/sdk/web";

registerVanityPlate(); // Call in the browser; importing is SSR-safe.
```

```html
<vanity-plate
  address="CDBTZHETZ3Q55ZRQERCW4SVR3KCGZSGQ3WWSTJ2GDO4JH3KKNYUPBEAT"
  rpc-url="https://soroban-testnet.stellar.org"
  animated
></vanity-plate>
```

Set the host width in CSS; the component preserves the plate's aspect ratio. Set
`suffix-length="6"` for an offline count, or omit both for abbreviation.
`nft-contract-id` overrides the collection. A Colibri configuration can also be
assigned to the element's `networkConfig` property. Pending lookups abbreviate
and set `aria-busy`; failures dispatch `plate-error` while preserving the
fallback. Without `animated`, the plate stays still even on hover. Use
`variant="compact"` or `variant="picker"` and the `inline` attribute for the
same presentation modes as React. Unknown variant attributes use display.

### React

Use the `Plate` component with the same plate inputs and appearance. The React
adapter supports server rendering, accessible labels and the web renderer's
animations.

<!-- deno-check -->

```tsx
import { Plate, type PlateProps } from "@vanity-plates/sdk/react";
import { PlateStyles } from "@vanity-plates/sdk/react/styles";

// Mount once at the document root, including for SSR.
export const AppPlateStyles = () => <PlateStyles />;

export function AccountBadge(
  props: PlateProps,
) {
  return (
    <Plate
      {...props}
      animated
      style={{ maxWidth: 480 }}
    />
  );
}
```

`AccountBadge` above is an application example wrapping `Plate`, not another SDK
component. Pass `rpcUrl` or `networkConfig` to load settings automatically,
`suffixLength` for a local count, or just `address` for abbreviation. SSR and
pending lookups abbreviate; offline counts render immediately. Invalid addresses
and lookup failures reach your application's React error boundary. React 18 is
the verified adapter target. Deno SSR requires `--allow-env=NODE_ENV`. React and
headless Chromium are optional entry points and stay outside core validation and
farming imports.

### Resolved React, compact plates and inline labels

For local or already fetched data, use `ResolvedPlate` from `/react/local`. This
entry point excludes network clients and font assets. It renders synchronously,
including on the server, without cache warming or an asynchronous loading phase.
Both React components accept `variant="display"` (the default),
`variant="compact"` and `variant="picker"`; compact scales the screws for small
plates, and picker simplifies the heading while retaining the full address.
`inline` uses phrasing elements so a plate can sit inside a paragraph. Rarity,
lettering, colors and insignia remain derived from the address in every variant.

<!-- deno-check -->

```tsx
import { ResolvedPlate } from "@vanity-plates/sdk/react/local";

export function PlateMention({ address }: { address: string }) {
  return (
    <p>
      Owned by{" "}
      <ResolvedPlate
        address={address}
        suffixLength={6}
        variant="compact"
        inline
        animated
      />
    </p>
  );
}
```

Mount `PlateStyles` once for the entire document, or emit the strings from
`/rendering/styles` into a CSS file at build time and load it once. This avoids
shipping fonts in both JavaScript and a generated stylesheet. `PlateStyles`
accepts a CSP `nonce`; a nonce on this tag does not authorize the artwork's
inline style attributes. The web component shares fonts once per document and
uses one constructed stylesheet across its shadow roots, with a legacy-browser
fallback that still excludes duplicate fonts.

## Render and export plates

Create the same Clubhouse plate appearance used by the Vanity Plates web app.
The rendering module ships a shared `createPlateModel`, HTML/CSS through
`renderPlateHtml` and `plateCss`, and self-contained SVG through
`renderPlateSvg`. Separate PNG adapters serve browsers and servers.

<!-- deno-check -->

```ts
import { renderPlateSvg } from "@vanity-plates/sdk/rendering";
import { renderPlatePng } from "@vanity-plates/sdk/png";

const plate = {
  address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
  suffixLength: 6,
};
const svg = await renderPlateSvg(plate, { width: 600 });
const png = await renderPlatePng(plate, { width: 1600 }); // Run in a browser.
```

Rendering derives the plate's fonts, identicon, colors, badge and finish from
the same inputs across HTML, SVG, PNG, web components and React. HTML, SVG and
both PNG exporters are asynchronous and accept the network/count/fallback rules
above. `resolvePlateInput` returns count-only data for reuse; `createPlateModel`
builds a model synchronously from that resolved or local data.

SVG generation works without a DOM; only configured metadata lookup uses the
network. The SVG embeds HTML/CSS using `foreignObject`, so displaying it
requires a modern browser renderer. Use PNG for image consumers that do not
support HTML-backed SVG. Browser PNG uses local Canvas;
[server PNG](#server-png) uses local Chromium. PNG captures the resting frame of
the plate.

### Synchronous HTML and reusable appearance data

`/rendering/local` is entirely offline and excludes fonts, React and ledger
clients. `renderResolvedPlateHtml` returns markup only; it never adds a style
tag. Install shared CSS separately. `createPlateAppearance` exposes the exact
ink, band, highlight, badge colors and SVG identicon used by that renderer, so
trait selectors and swatches need no independent palette logic.

<!-- deno-check -->

```ts
import {
  createPlateAppearance,
  renderResolvedPlateHtml,
} from "@vanity-plates/sdk/rendering/local";
import { plateSharedCss } from "@vanity-plates/sdk/rendering/styles";

const input = {
  address: "CDBTZHETZ3Q55ZRQERCW4SVR3KCGZSGQ3WWSTJ2GDO4JH3KKNYUPBEAT",
  suffixLength: 6,
};
const html = renderResolvedPlateHtml(input, {
  variant: "compact",
  animated: true,
});
const palette = createPlateAppearance(input.address);
// Run at build time; write this once to your application's CSS bundle.
const css = plateSharedCss;
```

`plateFontCss` and `plateArtworkCss` are also available separately. Default
HTML/SVG/PNG exports remain self-contained. Use
`renderPlateHtml(input, { includeStyles: false })` with host-provided CSS when
network resolution is desired without repeated embedded assets.

## Validate addresses and suffixes

Check G/C address checksums, normalize user-entered suffixes and build standard
abbreviations without a network request. The root module ships `isPlateAddress`,
`plateKind`, `normalizeSuffix`, `validatePlate`, `abbreviateAddress` and typed
concrete error classes with numbered codes.

<!-- deno-check -->

```ts
import {
  abbreviateAddress,
  normalizeSuffix,
  validatePlate,
} from "@vanity-plates/sdk";

const address = "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES";
const suffix = normalizeSuffix("plates");
console.log(validatePlate(address, suffix, "contract")); // true
console.log(abbreviateAddress(address)); // CC45XY…PLATES
```

Suffixes use 1–55 Stellar Base32 characters: letters A–Z and digits 2–7.
Validation checks the address and its ending; it does not establish ownership.

## Read account display settings

Turn an account's on-chain suffix configuration into a display label.
`loadAccountConfiguration` reads the account and its `config.svp.gchar`
ManageData entry through Stellar RPC, returning the full address, label, suffix
length and configuration status. Pass `rpcUrl`, `networkConfig`, or an injected
`rpc` client to this lower-level account API.

<!-- deno-check -->

```ts
import { loadAccountConfiguration } from "@vanity-plates/sdk/accounts";
import { NetworkConfig } from "@vanity-plates/sdk/colibri";

const display = await loadAccountConfiguration(
  "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
  { networkConfig: NetworkConfig.TestNet() },
);
console.log(display.status, display.label);
```

The module distinguishes `configured`, `unconfigured`, `invalid` and
`account-not-found`. Missing or invalid metadata produces the standard
first-six/last-six abbreviation; RPC errors propagate to the caller.

For offline use, `accountDisplay` builds the same presentation model from a
known suffix length. `parseSuffixLength`, `decodeHorizonSuffixLength` and
`encodeSuffixLength` handle RPC bytes, Horizon Base64 and decimal UTF-8
metadata. Valid lengths are integers from 1 to 55. Encoding prepares data
without submitting a ManageData write.

## Find vanity addresses

Search locally for an address ending in your chosen suffix. `farmAccount`
returns a G address and its private seed; `farmContract` returns a deterministic
C address and the salt needed to deploy it. Both searches support attempt
limits, cancellation and progress callbacks.

<!-- deno-check -->

```ts
import { farmAccount, farmContract } from "@vanity-plates/sdk/farming";

const account = await farmAccount({
  suffix: "A",
  maxAttempts: 10_000,
  signal: AbortSignal.timeout(30_000),
});
if (account) console.log(account.address); // Keep account.secret private.

export async function findContract(
  deployer: string,
  networkPassphrase: string,
) {
  return await farmContract({
    suffix: "A",
    deployer,
    networkPassphrase,
    maxAttempts: 10_000,
    onProgress: ({ checked }) => console.log(`${checked} candidates checked`),
  });
}
```

The farming module also ships `deriveContractAddress`, `verifyAccountFarmResult`
and `verifyContractFarmResult` to reproduce and check results. For NFT plates,
use the protocol's **deployer C address**; the network and deployer are part of
the derived address.

A search returns `undefined` if its budget is exhausted; cancellation throws
`FarmAbortedError` (`VNTY_007`). Longer suffixes require more work. Farming does
not fund, reserve, mint or deploy. Keep private seeds secure and salts private
until the reservation is confirmed. The SDK never logs or persists either.

### Resumable contract searches

`farmContractBatch` reports `found`, `paused` (attempt budget), `exhausted` (end
of the salt partition) or `aborted`. Its checkpoint contains the first unchecked
salt and preserves the deployer, network, normalized ending and stride.
`resumeContractFarm` consumes it without repeating checked candidates.
Cancellation returns a checkpoint; the original `farmContract` still throws on
cancellation for compatibility. Counts describe the current batch, so sum
`checked` values when tracking a whole search. A found result also carries a
continuation when more candidates remain.

<!-- deno-check -->

```ts
import {
  createContractFarmPartition,
  farmContractBatch,
  resumeContractFarm,
} from "@vanity-plates/sdk/farming";

export async function findInWorker(
  deployer: string,
  networkPassphrase: string,
  commonStart: Uint8Array,
  workerIndex: number,
  workerCount: number,
) {
  const partition = createContractFarmPartition(
    commonStart,
    workerIndex,
    workerCount,
  );
  const batch = await farmContractBatch({
    deployer,
    networkPassphrase,
    suffix: "PLATES",
    ...partition,
    maxAttempts: 1000,
  });
  if (batch.status === "paused" && batch.checkpoint) {
    return await resumeContractFarm(batch.checkpoint, { maxAttempts: 1000 });
  }
  return batch;
}
```

All workers must use the same start salt and worker count. The SDK rejects
invalid indices and overflow instead of wrapping. Checkpoints are JSON-safe, but
contain **private salt material**: persist locally, keep them out of logs, and
do not send them to a backend. The SDK does not persist checkpoints or create a
worker pool. Account keypair searches generate independent random candidates and
do not have deterministic salt checkpoints.

## Call the protocol

Read protocol state and submit explicitly signed operations with typed contract
clients. Each client ships method arguments, decoded result types and access to
its Colibri-generated bindings, including custom-type factories, errors and
events.

| Client              | Operations                                                            |
| ------------------- | --------------------------------------------------------------------- |
| `NftClient`         | Reservations, minting, claims, ownership, transfers and configuration |
| `DeployerClient`    | Address prediction, NFT redemption and deployment                     |
| `MarketplaceClient` | Listings, purchases and seller sales                                  |
| `TreasuryClient`    | Fees, VNTY accounting, redemption and vault/strategy integrations     |
| `RbacClient`        | Roles, administrator handover and upgrades                            |

Create one client for the contract you need, or use `createProtocolClients` to
configure all five together. This example reads an NFT owner on Testnet using
the contract address supplied by your application:

<!-- deno-check -->

```ts
import { NftClient } from "@vanity-plates/sdk/contracts";
import { NetworkConfig } from "@vanity-plates/sdk/colibri";

export async function readPlateOwner(contractId: string, tokenId: number) {
  const nft = new NftClient({
    networkConfig: NetworkConfig.TestNet(),
    contractId,
  });
  return await nft.read("owner_of", { token_id: tokenId });
}
```

`read()` simulates without signing or submitting. `invoke()` uses Colibri's
simulate/sign/submit pipeline and requires explicit source, signers, fee and
timeout configuration. The first call checks the deployed ABI against the
bundled specification. See [contract integration](#contract-integration) for
writes, generated helpers and compatibility behavior.

The SDK's `/colibri` export supplies shared `NetworkConfig`, `LocalSigner`,
`SorobanType`, `ColibriError` and relevant transaction/signer types. Consumers
can use these original Colibri implementations without declaring another direct
Colibri dependency.

## Integration details

### SDK errors

Each SDK failure has its own class, numbered code and recovery guidance. Import
these classes, `VanityErrorCode` and the `VANITY_ERRORS` constructor registry
from `@vanity-plates/sdk`. Catch a specific class for a particular recovery, or
use the abstract `VanityError` base to recognize any SDK-owned failure.

<!-- deno-check -->

```ts
import { InvalidPlateWidthError, VanityErrorCode } from "@vanity-plates/sdk";
import { renderPlateSvg } from "@vanity-plates/sdk/rendering";

try {
  await renderPlateSvg({
    address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
    suffixLength: 6,
  }, { width: 100 });
} catch (error) {
  if (error instanceof InvalidPlateWidthError) {
    console.log(error.code === VanityErrorCode.INVALID_PLATE_WIDTH); // VNTY_015
    console.log(error.details); // Guidance for choosing a supported width.
  } else {
    throw error;
  }
}
```

| Code       | Error class                           | Condition                                                     |
| ---------- | ------------------------------------- | ------------------------------------------------------------- |
| `VNTY_001` | `InvalidPlateAddressError`            | Expected a checksum-valid Stellar G or C address.             |
| `VNTY_002` | `InvalidSuffixError`                  | Invalid vanity suffix.                                        |
| `VNTY_003` | `InvalidAccountAddressError`          | Account display requires a valid G address.                   |
| `VNTY_004` | `InvalidSuffixLengthError`            | The displayed suffix length must be an integer from 1 to 55.  |
| `VNTY_005` | `InvalidAttemptLimitError`            | The attempt limit must be a nonnegative safe integer.         |
| `VNTY_006` | `InvalidBatchSizeError`               | The batch size must be an integer from 1 to 4096.             |
| `VNTY_007` | `FarmAbortedError`                    | The address search was cancelled.                             |
| `VNTY_008` | `MissingNetworkPassphraseError`       | Contract derivation requires a nonempty network passphrase.   |
| `VNTY_009` | `InvalidDeployerAddressError`         | Contract derivation requires a valid deployer address.        |
| `VNTY_010` | `InvalidSaltLengthError`              | A deployment salt must be a 32-byte Uint8Array.               |
| `VNTY_011` | `InvalidSaltStrideError`              | Stride must be between 1 and 2^256 - 1.                       |
| `VNTY_012` | `InvalidSaltHexError`                 | A salt must contain exactly 64 hexadecimal characters.        |
| `VNTY_015` | `InvalidPlateWidthError`              | Plate width must be an integer from 120 to 4096.              |
| `VNTY_016` | `InvalidSvgIdPrefixError`             | Invalid SVG ID prefix.                                        |
| `VNTY_017` | `BrowserDomUnavailableError`          | A browser DOM is required for browser PNG export.             |
| `VNTY_018` | `CanvasContextUnavailableError`       | A 2D canvas context is unavailable.                           |
| `VNTY_019` | `PngEncodingError`                    | The canvas could not encode a PNG.                            |
| `VNTY_020` | `BrowserPngRenderError`               | The browser could not render the canonical plate PNG.         |
| `VNTY_021` | `ServerPngRenderError`                | Local Chromium could not export the plate.                    |
| `VNTY_022` | `IncompatibleContractSpecError`       | The deployed contract interface is incompatible with the SDK. |
| `VNTY_023` | `InvalidProtocolContractAddressError` | Protocol clients require a valid C address.                   |
| `VNTY_024` | `InvalidTreasuryShareAssetError`      | The treasury share asset must be a valid C address.           |
| `VNTY_025` | `InvalidTreasuryFeeAssetError`        | The treasury fee asset must be a valid C address.             |
| `VNTY_026` | `InvalidTreasuryVaultError`           | The treasury vault must be a valid C address.                 |
| `VNTY_027` | `ServerPngCleanupError`               | Local Chromium export resources could not be closed.          |
| `VNTY_028` | `MissingNftCollectionError`           | No collection configured for this network.                    |
| `VNTY_029` | `ConflictingNetworkSourceError`       | Both RPC URL and network configuration supplied.              |
| `VNTY_030` | `InvalidRpcUrlError`                  | RPC URL is not absolute HTTP(S).                              |
| `VNTY_031` | `RpcNetworkDiscoveryError`            | RPC network discovery failed.                                 |
| `VNTY_032` | `InvalidFarmPartitionError`           | Invalid or overflowing worker partition.                      |

Codes identify distinct conditions and are not reassigned. The registry maps
each code to its concrete constructor, for example
`VANITY_ERRORS[VanityErrorCode.INVALID_PLATE_WIDTH] === InvalidPlateWidthError`.
This replaces the initial source version's broad `VNTY_INVALID_*`,
`VNTY_ABORTED`, `VNTY_INCOMPATIBLE_CONTRACT` and `VNTY_RENDER_FAILED` codes;
update existing catch branches to the specific classes or numbered enum values.
The generic `new VanityError(code, message)` constructor is no longer public.

Errors retain Colibri identity and provide `source`, `message`, `details` and
`toJSON()`. Rendering failures preserve their underlying `cause` and
`meta.cause`; server export also retains cleanup failures in
`meta.cleanupCauses`. Specific canvas and encoding errors pass through
unchanged. Validation errors do not capture supplied seeds, salts or other raw
inputs. RPC and contract errors originating in Colibri keep their original
identity and codes; the generated contract ABI error maps remain unchanged.

### Contract integration

Facade methods use the exact wire names, such as `owner_of`. Arguments and
results are typed: `bigint` for 64/128/256-bit integers, `Uint8Array` for bytes,
`Map` for maps and tagged objects for unions. Options decode to `undefined` and
void results to `null`. Keep token amounts as integers. Arguments also accept
Colibri wrappers; decoded results are ordinary JavaScript values. Generic
Soroban `Val` inputs accept native Stellar SDK `xdr.ScVal` or Colibri validated
values.

Construction makes no request. The first `read`, `invoke` or `ready()` loads and
checks the deployed ABI. Incompatible functions or records throw
`IncompatibleContractSpecError` (`VNTY_022`); additional functions are allowed.
This verifies interface compatibility. Recreate clients after upgrades because a
deployment can change after a read.

Reads do not persist simulated changes, and methods requiring authorization can
still fail. Writes return Colibri's transaction receipt. Keep reservation and
mint explicit so your application can confirm payment and retain the salt:

<!-- deno-check -->

```ts
import type { NftClient } from "@vanity-plates/sdk/contracts";
import type { TransactionConfig } from "@vanity-plates/sdk/colibri";

export async function mintReservedPlate(
  nft: NftClient,
  salt: Uint8Array,
  config: TransactionConfig,
) {
  // Call after confirming the reservation; supply source, signers, fee and timeout.
  return await nft.invoke("mint", { salt }, { config });
}
```

The repository's `examples/invoke.ts` demonstrates reservation with network and
deployer checks. Colibri errors propagate unchanged. Advanced integrations can
use `client.contract`, its `readPipe`/`invokePipe`, or constructor plugins.

#### Generated method helpers, types and events

Each facade owns a Colibri-generated client. Complete contract APIs are exposed
through `/contracts/nft`, `/contracts/deployer`, `/contracts/marketplace`,
`/contracts/treasury` and `/contracts/rbac`. Each subpath exports its own
`ContractMethods`, input/output types, factories, errors and events. The direct
`Nft`, `Deployer`, `Marketplace`, `Treasury` and `Rbac` classes are also
available for Colibri-style construction.

Generated helpers use camelCase, such as `ownerOf`. Every callable method has
both `read` and `invoke`, because the spec does not encode mutability.
Deployer's contract `deploy` method is named `deployMethod` to avoid Core's
deployment API. Direct generated calls use the embedded spec; call the facade's
`ready()` first when you need its live compatibility check.

<!-- deno-check -->

```ts
import type { NftClient } from "@vanity-plates/sdk/contracts";
import type { TransactionConfig } from "@vanity-plates/sdk/colibri";

export async function mintWithGeneratedHelper(
  nft: NftClient,
  salt: Uint8Array,
  config: TransactionConfig,
) {
  await nft.ready();
  const result = await nft.contract.mint.invoke({
    methodArgs: { salt },
    config,
  });
  return { hash: result.hash, minted: result.value };
}
```

Generated invocations add a decoded `value` to the receipt. A successful
submission followed by a decode failure throws `CONTR_021`, retaining the
successful receipt at `error.meta.data.result`. Inspect that receipt before
retrying. Declared errors are installed on the generated client's pipelines;
declared events expose helpers such as
`nft.contract.events.ClaimWordChanged.toEventFilter()`.

#### Guarded payments and current treasury methods

The captured interfaces include NFT `reserve_with_limit`,
`reserve_for_with_limit`, `reserve_catalog_with_limit`, Marketplace
`buy_with_limit`, and Treasury `collect_fee_with_limit` and
`get_fee_shares_quote`. Their generated camelCase helpers and typed
`VntyPaymentLimit` factories are available from each contract subpath. Limits
carry an exclusive `deadline`, expected `fee_amount`, exact `fee_credit` and
`max_shares`, all in the appropriate atomic units. No convenience method selects
or signs these values on the caller's behalf.

Treasury also exposes `migrate_defindex_vault` and `VaultMigrationReceipt`;
Treasury and Marketplace include `migrate_testnet_settlement`. These are
contract capabilities with their existing authorization requirements, not
automatic SDK migrations. Error maps were refreshed with the same interfaces.
Older deployments can fail `ready()` if they lack the required ABI; use an SDK
release matched to your deployment rather than bypassing compatibility checks.

### Server PNG

Import the server adapter to render through local Chromium. It supports an
existing Playwright `browser` for batches, or an `executablePath` for a separate
Chromium installation.

<!-- deno-check -->

```ts
import { renderPlatePng } from "@vanity-plates/sdk/png/server";

const png = await renderPlatePng({
  address: "CC45XY6XSNTTBRJGJOKK27NE5DUWUTGFQSWHXC2QPND5Z7J3M3PLATES",
  suffixLength: 6,
}, { width: 1600 });
```

Install Chromium with `deno run -A npm:playwright@1.61.0 install chromium`. The
adapter needs process/filesystem permissions and local browser communication. It
blocks external page requests. Caller-owned browsers remain open; temporary
contexts close after export. The browser-only exporter fails explicitly without
a DOM, so choose the adapter for your environment.

### Rendering dimensions and browser policy

Exports support widths from 120 to 4096 pixels, with a 32px transparent margin
on each side for the shadow. The plate keeps a 2.9 aspect ratio; total image
height is `ceil((width - 64) / 2.9) + 64`. Web/React plates fill their container
and allow the shadow to extend naturally. Use unique `idPrefix` values for
repeated inline SVGs.

Fonts and image data are embedded. A custom CSP needs inline styles and `data:`
in `font-src` and `img-src`; no Wasm execution is needed. The web component
registers embedded fonts once in the document. Legacy pattern traits remain
available in the model but are not painted where the app suppresses them.

### Longer farming searches

Searches match address endings and yield between batches of 128 candidates by
default. Use a Web Worker for sustained frontend farming. Contract searches
support `startSalt` and positive `stride` for partitioning; salts increment as
unsigned big-endian 256-bit integers without wrapping. Signer buffers are
destroyed after each attempt, while JavaScript strings cannot be reliably
zeroized.

## Public entry points

All features belong to one SDK. Import the subpath for the capability you need:

| Import                                | Exports                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------- |
| `@vanity-plates/sdk`                  | Validation, suffix utilities and SDK errors                                       |
| `@vanity-plates/sdk/farming`          | Local G keypair and C deployment-salt farming                                     |
| `@vanity-plates/sdk/accounts`         | Account metadata and display helpers                                              |
| `@vanity-plates/sdk/contracts`        | Five protocol clients and ABI record types                                        |
| `@vanity-plates/sdk/contracts/<name>` | Complete generated API for `nft`, `deployer`, `marketplace`, `treasury` or `rbac` |
| `@vanity-plates/sdk/colibri`          | Shared Colibri configuration, signing, values and types                           |
| `@vanity-plates/sdk/rendering`        | Plate model, HTML/CSS and SVG                                                     |
| `@vanity-plates/sdk/png`              | Browser PNG export                                                                |
| `@vanity-plates/sdk/png/server`       | Local Chromium PNG export                                                         |
| `@vanity-plates/sdk/web`              | `<vanity-plate>` registration                                                     |
| `@vanity-plates/sdk/react`            | React `Plate` with optional network lookup, plus `ResolvedPlate`                  |
| `@vanity-plates/sdk/react/local`      | Synchronous `ResolvedPlate`, without RPC or assets                                |
| `@vanity-plates/sdk/react/styles`     | Shared `PlateStyles` for SSR and browser documents                                |
| `@vanity-plates/sdk/rendering/local`  | Synchronous HTML, model and appearance data                                       |
| `@vanity-plates/sdk/rendering/styles` | Build-time font, artwork and variant CSS strings                                  |

## Repository and development

### Using the source package

This branch prepares `@vanity-plates/sdk` **0.2.0**, following the published
0.1.0 release. Publication happens after the reviewed PR is merged and CI
passes. Deno **2.9.6** is the verified runtime; the current dependencies are
Colibri Core **1.1.1** and Identicon **1.1.0**.

For a Deno application with a checkout at `./sdk`, add it as a workspace member
in the application's `deno.json`:

```json
{
  "workspace": ["./sdk"]
}
```

The public imports shown above resolve to that local package. They also work
inside the SDK checkout. Configure your application's React/JSX support when
using the React adapter. This checkout validates isolated source-package
consumers. The release workflow checks the actual JSR artifact after
publication. A Node runtime matrix is not claimed by these Deno/browser checks.

### Preview and examples

From the SDK checkout:

```sh
deno task preview        # Build and serve the interactive browser demo
deno task example:farm   # Local searches without logging seeds or salts
deno task example:export # Write output/plate.svg and output/plate.png
```

Open <http://127.0.0.1:4192/> for responsive plates, animations, image downloads
and local farming. `examples/read-protocol.ts` demonstrates reads across all
five contracts; `examples/invoke.ts` shows explicit transaction configuration.

### Bindings and deployment fixtures

Bindings are produced by `@colibri/contract-bindings@0.1.0`. Each contract has a
dedicated `src/contracts/<name>/` directory containing its public `index.ts`,
`constants.ts` and `types.ts`. The single `src/colibri.ts` module supplies the
SDK's shared Colibri exports.

`deno task generate` regenerates the three binding files from the captured
`tests/fixtures/contract-specs/<name>.json`; `check:generated` verifies all
fifteen files without writing. The specs were captured from public Testnet
contracts on **2026-09-15**; public contract IDs and hashes are recorded in
`tests/fixtures/protocol-specs.json`. Regeneration does not refresh them from
the network. `examples/testnet.json` is a dated deployment fixture; supply
explicit addresses for your deployment.

### Checks and contributing

```sh
deno task check           # Format, lint, public API and example types
deno task docs            # Public API docs and checked Markdown examples
deno task test            # Unit/integration tests, architecture and tooling
deno task check:consumers # Public imports from isolated publishable sources
deno task check:generated # Reproduce bindings without writing
deno task check:bundles   # Raw/gzip budgets for public consumer imports
deno task test:coverage   # 100% lines/branches/functions; CRAP <= 15
deno task test:testnet    # Optional read-only public Testnet smoke tests
```

Install Chromium with `deno run -A npm:playwright@1.61.0 install chromium`
before running the integration or coverage suites. The coverage gate includes
all shipped runtime code, including generated clients and optional adapters.

See [CONTRIBUTING.md](CONTRIBUTING.md) for test conventions, module boundaries,
binding generation, SVG baselines and the mandatory webapp-source comparison
before a rendering release. Documentation examples are type-checked without
executing ledger reads or transactions.

Known tooling warnings concern upstream Stellar SDK side-effect metadata and
React `global.d.ts`/Playwright `electron` documentation resolution. TypeScript,
browser and SSR consumer checks cover these integrations separately.

### Current scope and distribution

The SDK does not include a wallet UI, NFT indexer or GPU/worker pool. Treasury's
vault integration methods are included; direct VNTY token and third-party vault
calls use Colibri token/contract clients. Fee-bearing writes have been tested
with submission intercepted, without submitting them to a live network in this
implementation. Validate the signed Testnet flows used by your application
before enabling them in staging.

The SDK is distributed under the [MIT license](LICENSE). Bundled assets retain
their own licenses; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

### Display input migration

The unpublished display API now uses `suffixLength` instead of `suffix`. Update
web attributes from `suffix="PLATES"` to `suffix-length="6"` for local
rendering, or supply an RPC/network configuration for lookup. Await
`renderPlateHtml` and `renderPlateSvg`, as with PNG exports. Farming, suffix
validation and generated contract ABI fields still use actual suffix strings.
`VNTY_013` and `VNTY_014` are retired; their obsolete suffix-based error classes
were removed and those numbers are not reused.

Lookup configuration errors are `MissingNftCollectionError` (`VNTY_028`),
`ConflictingNetworkSourceError` (`VNTY_029`), `InvalidRpcUrlError` (`VNTY_030`)
and `RpcNetworkDiscoveryError` (`VNTY_031`). Ledger and contract errors retain
their original Colibri classes. No lookup signs or submits a transaction.

### Migrating from 0.1.0 to 0.2.0

- React `Plate` no longer embeds CSS/fonts per instance. Mount `PlateStyles`
  **once**, or install the shared CSS at build time. Existing HTML/SVG/PNG
  exporters still embed their assets by default.
- For previously resolved or local inputs, use `/react/local` or
  `/rendering/local`. These avoid network dependencies and render immediately.
- Default artwork and all 171 SVG fixtures are preserved. Compact/picker/inline
  are explicit presentation choices, not changes to address-derived traits.
- Contract bindings now target the September 15 captured interfaces. Recheck
  your deployed ABI and regenerated error maps before upgrading consumers.
- `farmContract` retains its return and cancellation behavior. Opt into the
  batch/checkpoint API to retain progress on budget exhaustion or cancellation.

Bundle reports measure complete minified browser JavaScript, separately in raw
and gzip bytes, under pinned Deno 2.9.6. They exclude external source maps and
shared CSS. Network-aware React and farming still need Colibri's full contract
or signing graph; use resolved entry points for display-only pages, and let your
bundler split optional network/farming code. A smaller entry bundle is not proof
that the total application payload became smaller.
