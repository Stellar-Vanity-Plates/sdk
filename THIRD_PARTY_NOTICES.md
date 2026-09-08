# Third-party assets

`src/rendering/vendor/` contains unmodified binary assets encoded as Base64 for
portable rendering.

| Asset                          | Source                              | License file in vendor/          |
| ------------------------------ | ----------------------------------- | -------------------------------- |
| DM Mono Medium                 | Google Fonts, `ofl/dmmono`          | `mono-LICENSE.txt`, SIL OFL 1.1  |
| Barlow Condensed Medium        | Google Fonts, `ofl/barlowcondensed` | `rally-LICENSE.txt`, SIL OFL 1.1 |
| Yellowtail Regular             | Google Fonts, `apache/yellowtail`   | `coach-LICENSE.txt`, Apache 2.0  |
| Alfa Slab One Regular          | Google Fonts, `ofl/alfaslabone`     | `slab-LICENSE.txt`, SIL OFL 1.1  |
| resvg-js 2.6.2 `index_bg.wasm` | npm `@resvg/resvg-wasm@2.6.2`       | `resvg-LICENSE.txt`, MPL 2.0     |

Font URLs and SHA-256 hashes are in `src/rendering/vendor/provenance.json`. Font
copyright notices are preserved in the license files.

The unmodified resvg Wasm's corresponding source and build instructions are at
<https://github.com/yisibl/resvg-js/tree/v2.6.2>. MPL 2.0 and upstream notices
govern that component independently of this SDK. Colibri, OpenType.js, React and
Stellar SDK dependencies retain their own notices and licenses.
