# Independent reference revision: svp-1

The original capture commit and file hashes remain in `webapp.json`. Its
`recipeRevision` records the deliberate September 18, 2026 revision approved
before Mainnet. These files are an independent implementation of the public
recipe, not a snapshot of the currently deployed webapp.

Changes: common Colibri hue (byte 2), fixed ink 80%/23%, font byte 7 low two
bits, finish byte 8 low two bits, rarity low five bits of bytes 9–15. Both use
Registration, Rally condensed, Coach script and Garage slab. G adds only the
slab CSS treatment using the already bundled Alfa Slab One font. Existing plate
geometry, identicon pixels and rarity effects remain.

The independent reference continues using its own StrKey decoding and trait
functions; it must not import SDK trait helpers. The legacy texture/paint
selectors inside the captured reference do not participate in canonical plate
rendering and are not part of svp-1. Their historical code is preserved.

The SDK source has its own implementation and tests require exact pixel parity
across 160 combinations plus edge cases. Regenerated SVG expectations contain
all 195 cases. Future edits to this reference require an intentional design
change, documented inputs, updated provenance and complete parity validation.
