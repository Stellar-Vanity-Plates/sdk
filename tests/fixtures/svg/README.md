# SVG generation baselines

The SVG files here are saved outputs, not generated during tests. Each includes
its complete fonts, styles, accessible label and artwork. Open a file in a
modern browser to inspect it; these use the SDK's documented HTML-backed SVG
format.

`manifest.json` pins 171 count-only display inputs and expected traits.
Historical fixture IDs are retained (including the former lowercase suffix
cases); their inputs now use equivalent character counts and all SVG bytes are
unchanged:

- 60 G plate combinations: 4 finishes × 3 lettering styles × 5 rarities.
- 80 C plate combinations: 4 finishes × 4 lettering styles × 5 rarities.
- 31 display/export edge cases, including all 12 unconfigured G finish/lettering
  combinations, metadata fallbacks, label lengths, widths, animations and IDs.

No private keys, seed material, unpublished deployment salts or live account
lookups are involved. Addresses are deterministic synthetic public inputs.

Run `deno task test:svg` from the repository root for an exact regeneration
check. The browser suite also verifies all 140 visual combinations against the
independent webapp reference. For an intentional change, follow the review
workflow in `CONTRIBUTING.md` and explicitly run
`deno task fixtures:svg:update --accept`. Tests and CI never rewrite the
baselines. New/missing/orphaned files fail validation.

The initial baseline comes from SDK commit37a024a and the canonical webapp
reference at9487645. Later accepted revisions are recorded in Git. All fixtures
are excluded from the published package.
