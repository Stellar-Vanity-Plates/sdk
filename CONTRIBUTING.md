# Contributing

Use Deno 2.9.6. Internal library imports use `@/`; tests, examples and tooling
use their configured aliases. Relative imports, re-exports and static dynamic
imports are rejected by the same lint rule used in Colibri. Use named public
exports and thin `mod.ts` entrypoints. Keep account reads, farming, contract
clients, rendering and optional web/React/server adapters separate; architecture
tests enforce the dependency direction and prohibit cycles or test/tooling
imports in the library.

Public APIs need explicit types, JSDoc and an updated runnable example. Use
`VanityError` codes for SDK validation/rendering failures; preserve Colibri
errors at contract and RPC boundaries. Rendering/farming never submit
transactions.

## Quality gates

Run these before integration. CI runs architecture first so boundary mistakes
fail before the slower browser checks.

| Command                     | Verifies                                                        |
| --------------------------- | --------------------------------------------------------------- |
| `deno task check`           | Formatting, alias lint, public exports, examples and tool types |
| `deno task test`            | Architecture, offline behavior and tooling regressions          |
| `deno task docs`            | Public API docs and complete Markdown examples                  |
| `deno task check:consumers` | Every public subpath from an isolated source package            |
| `deno task test:browser`    | Exact webapp appearance and animations across adapters          |

The browser check needs local Chromium installed with
`deno run -A npm:playwright@1.61.0 install chromium`. For a focused run use
`test:architecture`, `test:unit`, `test:tooling` or `check:docs`.

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

Public `mod.ts` files only re-export their own area's named APIs. Runtime code
imports implementation modules directly, avoiding public barrels and cycles. The
root export remains core-only. Playwright stays in the optional server PNG
entrypoint; React stays in its adapter. Only reviewed public Colibri exports are
allowed. New areas or dependency identities require a deliberate policy update,
with a negative fixture demonstrating the boundary.

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
without repository test/tooling aliases. A preserved consumer exercises local
farming, metadata, contract construction, Colibri/native Spec identity,
rendering, React SSR and optional adapter imports. Compile-only assertions also
protect contract argument/result types and required transaction configuration.
Runtime checks deny network access and cannot launch a browser or submit
transactions.

This validates the unpublished Deno source package. It does not claim published
JSR artifacts, npm packaging or a Node runtime matrix. Add those consumers when
the corresponding distribution is introduced. ABI models and canonical styles
must still regenerate without a diff in CI.

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
approximate a plate in an adapter. `renderPlateHtml` owns the markup, with
extracted app CSS and embedded canonical fonts. SVG wraps that composition in
foreignObject; both PNG paths render that same composition in a browser. Keep
the model pure.

The independent app components and original styles under
`tests/reference/webapp/` are a frozen reference, excluded from publication.
`webapp.json` records the original commit and source hashes. Only import paths
are adapted in its TS files. Never edit those fixtures merely to make a failing
SDK test pass.

Before releasing a rendering change, fetch the webapp's staging ref, then run:

```sh
deno task check:webapp /path/to/webapp origin/staging
```

If sources changed, review the app changes, deliberately refresh the reference,
regenerate with `deno task generate:styles`, and rerun parity tests. The check
fails on any changed source; it never silently updates golden expectations. CI
compares against the pinned reference without requiring access to the private
webapp repository. The explicit source check catches changes after that
snapshot.

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

Package 0.1.0 is still unpublished. Do not publish or choose project licensing
as a side effect of development. Third-party font licenses remain included.
