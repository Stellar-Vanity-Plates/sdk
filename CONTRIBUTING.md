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

Run `deno task check`, `deno task docs`, `deno task test` and
`deno task test:browser`. The last command needs local Chromium installed using
`deno run -A npm:playwright@1.61.0 install chromium`.

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
on the same browser/platform. They cover G/C, every finish, lettering and
rarity, long/short labels, unconfigured accounts, two widths and all rendering
adapters. Cross-engine antialiasing is not a reason to change the design:
compare each adapter with the reference using the same engine, dimensions and
motion state. Captures use the same fixed, clipped image frame so that
fractional outer shadows have identical clipping bounds. A failure records the
differing coordinates and attaches both images to CI; no pixel tolerance is
allowed.

Package 0.1.0 is still unpublished. Do not publish or choose project licensing
as a side effect of development. Third-party font licenses remain included.
