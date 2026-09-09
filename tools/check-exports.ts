// Public check coverage comes from the package manifest, never a second entrypoint list.
import config from "@config" with { type: "json" };
const mode = Deno.args[0];
if (mode !== "check" && mode !== "docs") {
  throw new Error("Expected check or docs");
}
const entries = Array.from(new Set(Object.values(config.exports)));
const result = await new Deno.Command(Deno.execPath(), {
  args: [...(mode === "docs" ? ["doc", "--lint"] : ["check"]), ...entries],
  stdin: "null",
  stdout: "inherit",
  stderr: "inherit",
}).output();
Deno.exit(result.code);
