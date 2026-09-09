import { checkDocumentation } from "@tools/quality/documentation.ts";
const result = await checkDocumentation(Deno.cwd());
if (result.code) console.error(result.diagnostics);
else {console.log(
    `${result.checked} complete documentation examples type-check; local links and fence markers are valid. No examples were executed.`,
  );}
Deno.exit(result.code);
