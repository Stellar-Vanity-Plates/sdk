# Contributing

Use Deno 2.9.6. Internal library imports use `@/`; tests, examples and tooling
use their configured aliases. Relative imports, re-exports and static dynamic
imports are rejected by the same lint rule used in Colibri. Use named public
exports and `index.ts`/`index.tsx` as the canonical directory entry points. Put
a module implementation directly in its index when a wrapper would only forward
to one file. Keep account reads, farming, contract clients, rendering and
optional web/React/server adapters separate; architecture tests enforce the
dependency direction and prohibit cycles or test/tooling imports in the library.

Public APIs need explicit types, JSDoc and an updated runnable example. Use
concrete SDK error classes for validation/rendering failures; preserve Colibri
errors at contract and RPC boundaries. Each SDK failure has a unique numbered
`VanityErrorCode` and a concrete subclass of the abstract `VanityError` base in
`src/errors.ts`. Register its constructor in `VANITY_ERRORS`; do not reuse a
code for another condition or construct the base directly. Keep messages and
recovery details in the class, retain rendering causes, and never attach seeds,
salts or unvalidated input to metadata. Rendering/farming never submit
transactions.

## Quality gates

Run these before submitting a change. CI runs architecture first so boundary
mistakes fail before the slower browser checks.

| Command                     | Verifies                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `deno task check`           | Formatting, alias lint, public exports, examples and tool types |
| `deno task test`            | Architecture, unit/integration behavior and tooling regressions |
| `deno task docs`            | Public API docs and complete Markdown examples                  |
| `deno task check:consumers` | Every public subpath from an isolated source package            |
| `deno task check:publish`   | JSR publication validation without uploading a version          |
| `deno task test:coverage`   | Unit + integration coverage at 100%; CRAP at most 15            |
| `deno task test:testnet`    | Optional unsigned reads against the public Testnet deployment   |
| `deno task test:browser`    | Exact webapp appearance and animations across adapters          |

The browser check needs local Chromium installed with
`deno run -A npm:playwright@1.61.0 install chromium`. For a focused run use
`test:architecture`, `test:unit`, `test:integration:rpc`, `test:tooling` or
`check:docs`.

### Tests, coverage and complexity

Follow Colibri's test conventions: new suites use `describe`/`it` from
`@std/testing/bdd`; name isolated tests `*.unit.test.ts` (or `.tsx`), runtime
integration tests `*.integration.test.ts`, and public Testnet tests
`*.testnet.integration.test.ts`. All tests restore stubs and release their
resources. Keep Deno sanitizers enabled for unit and HTTP integration tests; the
Chromium process boundary uses the existing explicit browser-suite settings.

Unit tests exercise all 111 generated contract methods through real Colibri
encoding/decoding with intercepted read/invoke pipelines, including transaction
configuration and receipts. They also cover validation, farming, account/NFT
lookup, React effects, web-element lifecycle and PNG failures/cleanup. React
uses its test renderer; web lifecycle tests use an isolated Happy DOM. HTTP
integration tests exercise actual loopback requests and XDR serialization with
deterministic ledger/simulation responses. Chromium tests independently check
rendering, network-driven UI and PNG exports against the webapp reference.

`deno task test:coverage` requires **100% lines, branches and functions** for
the published SDK. Its inventory includes generated bindings, optional adapters,
barrels and vendored rendering assets. Only modules containing no executable
statements have no coverage requirement. Tests, tooling, examples and the
independent reference application are outside the published implementation.
Missing source records, rounded-up percentages and coverage-suppression comments
fail the gate; adding a source file without importing/testing it also fails.

The CRAP gate uses the same `@alperlabs/crap4ts@0.2.1` analyzer as Colibri, with
a maximum score of **15 per function** and failure for missing attributable
coverage. CI checks CRAP on unit coverage first and checks both coverage and
CRAP after the integration suites. Reports are written to `coverage/lcov.info`
and `coverage/unit/html/index.html` and uploaded as CI artifacts. Each suite
clears its own profiles; the report merges only the three named current suite
folders.

Install Chromium before `test`, `test:integration` or `test:coverage`. None of
those commands need public-network RPC access or submit a Stellar transaction.
`test:testnet` is a separate opt-in read-only smoke test against the dated NFT
collection/UPBEAT fixture. It loads the live ABI and simulates reads; a Testnet
reset or deployment change can invalidate that fixture. Public Testnet is not
part of the deterministic CI coverage gate.

### Architecture

The checks adapt Colibri's dependency, entrypoint, test-inventory and consumer
practices to this single package. Deno's syntax parser inspects static imports,
side-effect imports, re-exports, literal dynamic imports and type imports;
comments and strings are not mistaken for dependencies. The parser is available
inside `deno test`, so run architecture through its test task.

`tools/quality/policy.ts` is the reviewed dependency policy:

| Area                         | Allowed internal dependencies                      |
| ---------------------------- | -------------------------------------------------- |
| Core validation and errors   | Core only                                          |
| Accounts, farming, contracts | Their own area and core                            |
| Canonical rendering          | Rendering, accounts and core                       |
| Browser/server PNG           | Canonical rendering, core and shared adapter types |
| Web/React                    | Their own adapter and canonical rendering          |

Directory indexes expose their own area's APIs and may contain implementation.
Aggregate indexes are useful where they combine several modules; do not add a
second entry file that simply forwards to an index. Runtime imports follow the
same dependency direction and avoid cycles. The package root only re-exports
core APIs. Playwright stays in the optional server PNG entrypoint; React stays
in its adapter. Only reviewed public Colibri exports are allowed. New areas or
dependency identities require a deliberate policy update, with a negative
fixture demonstrating the boundary.

Checks inspect all runtime files, including unreachable modules. They reject
unresolved aliases, missing/unpublished entrypoints, runtime test/tool imports,
unknown layers, default exports, generic SDK-owned errors and publication globs
that could admit private files. Test files must register tests and may not leave
focused or skipped cases. The negative fixtures in `tests/architecture/` prove
that invalid examples fail with rule, path and line evidence.

### Examples and consumers

Complete TypeScript/TSX fences in the README and package guides must have a
`<!-- deno-check -->` marker immediately before them. Use
`<!-- deno-skip: specific reason -->` only for an intentional fragment. The
check compiles examples in temporary files and reports their original Markdown
lines; it never executes examples that could read a ledger or submit a
transaction. Local links between the package guides are also checked for missing
files.

The consumer check copies only `publish.include` into a temporary package tree.
It derives imports from the manifest's public exports and validates all subpaths
(including each complete generated contract API) without repository test/tooling
aliases. A preserved consumer exercises local farming, metadata, contract
construction, Colibri/native Spec identity, rendering, React SSR and optional
adapter imports. Compile-only assertions also protect contract argument/result
types and required transaction configuration. Runtime checks deny network access
and cannot launch a browser or submit transactions.

The isolated consumer uses a one-day minimum dependency age. It allows the
reviewed first-party packages `@colibri/core` and `@vanity-plates/sdk`
immediately, so release checks can exercise freshly published versions. Every
other dependency retains the one-day gate. These test-only exceptions do not
alter the published manifest or a downstream application's resolver policy.

The default command validates the unpublished Deno source package. After
publication, `deno task check:consumers:published` runs the same checks against
`jsr:@vanity-plates/sdk@<manifest-version>`, with no local SDK files or source
aliases available as a fallback. Neither command claims npm packaging or a Node
runtime matrix. Colibri binding files and canonical styles must still reproduce
in CI. `generate` calls the pinned published `@colibri/contract-bindings`
renderer using the Spec embedded in each `src/contracts/<name>/constants.ts`. It
writes only that contract's `index.ts`, `constants.ts` and `types.ts`,
preserving handwritten files beside them. It omits the redundant `colibri.ts`
file and convenience reexport blocks; contract implementations continue
importing directly from `@colibri/core`. Local aliases, a type-only Deployer
import and Deno formatting are adapted. `check:generated` performs read-only
byte comparisons and rejects the old layout or repeated Colibri modules. Do not
hand-edit binding output or maintain another ABI-to-TypeScript mapper.
Regeneration uses the embedded specs without fetching contract updates from the
network. The generator stays outside runtime imports.

`src/colibri.ts` is the sole SDK-wide convenience module, exported through
`@vanity-plates/sdk/colibri`. Keep it a named reexport of relevant public
Colibri APIs. SDK implementations import from Colibri directly; consumers can
use the shared SDK subpath without declaring Colibri as another direct
dependency.

## Saved SVG baselines

`tests/fixtures/svg/` holds 171 complete, self-contained SVGs and an explicit
manifest of public addresses, inputs, options and expected traits. The 140 named
combinations cover every supported G/C × insignia finish × lettering × rarity
combination. Another 31 cases cover unconfigured accounts, metadata, short/long
and normalized labels, width boundaries, animations and custom accessible IDs.
This is full coverage of the named visual combinations, not every possible
address, color, width or animation time.

`deno task test:svg` compares freshly generated SVG text with each saved file,
without normalization or removed fonts/styles. It also checks coverage,
filenames, and that addresses actually derive the traits claimed in the
manifest. The same checks run in `test:unit`, `test` and CI. Tests have
read-only access to fixtures and cannot update their expectations. Failure
messages identify the case and first changed character without dumping embedded
font data.

The browser suite also compares all 140 saved visual combinations against the
independent webapp components, retaining the existing live-renderer and adapter
comparisons. A baseline created from an incorrect renderer therefore still fails
webapp parity.

For an intentional design change:

1. Review the source change and the affected SVGs. Keep the webapp reference
   current using the existing process below.
2. Edit `tests/fixtures/svg/manifest.json` only when the test inputs or
   supported variants deliberately change. Do not delete cases to hide failures.
3. Run `deno task fixtures:svg:update --accept`. This is the only
   fixture-writing command; it replaces the SVGs from the manifest, never runs
   in CI, and does not remove orphaned files automatically.
4. Review the Git diff, then run `test:svg` and `test:browser` before
   integration.

Keep the embedded fonts and SVG markup intact. The fixture directory is large by
intent and is excluded from package publication. Its initial source provenance
is recorded in the manifest; subsequent revisions are tracked in Git.

## Canonical appearance

The webapp's current Clubhouse G/C plates define the design. Do not redesign or
approximate a plate in an adapter. `renderResolvedPlateHtml` owns the markup,
with extracted app CSS and embedded canonical fonts. SVG wraps that composition
in foreignObject; both PNG paths render that same composition in a browser. Keep
the model pure.

The independent app components and original styles under
`tests/reference/webapp/` are a frozen reference, excluded from publication.
`webapp.json` records the original commit and source hashes. Only import paths
are adapted in its TS files. Never edit those fixtures merely to make a failing
SDK test pass.

Before releasing a rendering change, fetch the webapp's staging ref, then run:

```sh
deno task check:webapp /path/to/webapp origin/staging --consumer
```

Staging now consumes SDK 0.1.0 for its real-address artwork. The `--consumer`
check pins those adapter, trait and stylesheet-build inputs in
`tests/reference/webapp-consumer.json`. A hash change requires reviewing the
consumer integration; it cannot regenerate visual expectations. Without that
flag, the command retains the original independent-source comparison against
`webapp.json` (supply its original commit as the ref).

Keep the frozen pre-SDK components for independent pixel comparisons. Replacing
them with today's SDK-backed wrappers would make the test compare the SDK to
itself. A deliberate future artwork change requires a separately reviewed,
independent design reference and a complete parity run. Neither command updates
fixtures automatically; both fail on missing or changed inputs.

Visual tests require zero differing pixels against the original app components,
using the same browser, platform and rendering path. They cover G/C, every
finish, lettering and rarity, long/short labels, unconfigured accounts, two
widths and all adapters. Compare DOM with DOM, SVG with independently wrapped
original app markup, and Canvas with that same reference SVG drawn through
Canvas. Browser rasterization can differ slightly between those paths even when
the artwork is identical; this is not a reason to change the design or permit
pixel tolerance.

Captures include a 32px transparent margin to verify the complete outer shadow.
The independent SVG fixture uses all original styles and components, without
calling SDK rendering helpers. A failure records differing coordinates and
attaches both images to CI.

## Releases

The SDK uses the [MIT license](LICENSE). Third-party font licenses and notices
remain included in the package.

The `SDK checks` workflow runs on branch pushes, pull requests targeting `main`
and manual dispatch. Every run checks architecture, types, lint, docs, JSR
publication validity, unit and integration behavior, isolated consumers,
generated sources, 100% implementation coverage, CRAP at most 15 and the browser
preview build. Coverage reports and failing visual comparisons are retained as
workflow artifacts. Public Testnet smoke tests remain opt-in.

A push to `main` in `Stellar-Vanity-Plates/sdk` publishes only after that run's
`verify` job succeeds. Main runs are serialized without cancelling an active
publication. Pull requests, feature branches and manual dispatch only run
checks. To release:

1. Set `version` in `deno.json` to the intended unpublished version and review
   the public API and release changes. The next candidate is `0.2.0`; include
   migration notes for React style installation.
2. Run `deno task check:publish` locally and merge the reviewed change to `main`
   after CI passes. JSR must link `@vanity-plates/sdk` to this GitHub
   repository.
3. CI publishes using GitHub OIDC and provenance, then creates `sdk-<version>`
   at the tested commit and a GitHub release with generated notes. No JSR token
   secret is needed. Prerelease versions create prerelease GitHub releases.
4. CI runs `check:consumers:published` against the actual published version.
   Inspect the workflow result before using the release in staging.

Merges that retain an already published version skip publication and retain its
existing tag. Reruns can create a missing GitHub release or repeat the published
consumer check. A JSR version without a matching tag fails: recover the original
publication commit from the successful publish run/provenance and restore its
exact tag before retrying. A tag without a published version also fails for
manual review. Never move a version tag to a later commit or republish a
version.

The workflow gates publication. Required checks for merging are configured
separately in GitHub branch protection or repository rulesets.

## Consumer performance

`deno task check:bundles` imports symbols through the targets of the public
export map, builds complete single-file minified browser bundles with Deno
2.9.6, and checks both raw and gzip level-9 limits. The resulting
`output/bundle-sizes.json` excludes external source maps. Budgets live in
`tools/quality/bundles.ts`; do not raise them without measuring and documenting
why a public capability requires the increase. Shared asset size is reported
separately and is not included in the resolved-renderer number.

Keep `/rendering/local` free of font assets, RPC clients and browser
registration side effects. TanStack Query is allowed only in the React layer.
Address-based `Plate` rendering must reuse `usePlate`, which owns neither
transport nor a handwritten cache. Test synchronous cache hits, in-flight
deduplication, explicit-data precedence, network/collection isolation,
refresh/failure behavior and per-request SSR. New examples must install CSS
once. Public contract snapshots live in
`tests/fixtures/contract-specs/<name>.json`, with dated provenance in
`tests/fixtures/protocol-specs.json`. Regeneration reads these snapshots without
fetching a moving deployment or importing the old generated bindings as its own
source of truth. Raw snapshots and provenance are development fixtures; only the
generated runtime specifications are published.
