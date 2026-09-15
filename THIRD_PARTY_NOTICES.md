# Third-party assets

The canonical webapp fonts are embedded unmodified in
`src/rendering/vendor/web-fonts.ts`. Family, weight/style, source URL and
SHA-256 provenance are captured in `web-fonts-provenance.json`.

| Family           | Weights/styles          | License file in vendor/         |
| ---------------- | ----------------------- | ------------------------------- |
| DM Mono          | 400 and 500             | mono-LICENSE.txt (SIL OFL 1.1)  |
| Barlow Condensed | 500, 600 and 600 italic | rally-LICENSE.txt (SIL OFL 1.1) |
| Yellowtail       | 400                     | coach-LICENSE.txt (Apache 2.0)  |
| Alfa Slab One    | 400                     | slab-LICENSE.txt (SIL OFL 1.1)  |

Font copyright notices are preserved in those files. The fonts use the same
families and weights as the webapp's Google Fonts stylesheet. Runtime rendering
makes no font requests.

The no-relative-imports lint rule follows Colibri's MIT-licensed rule from
`fazzatti/colibri` at ff21cb807ce9afc918d4d2e9dea7e5a70f55dcbc. Colibri, React,
TanStack Query, Playwright and Stellar SDK dependencies retain their own
licenses. The webapp rendering fixtures belong to the same Vanity Plates project
and are excluded from package publication.
