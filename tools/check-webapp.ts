// Compare the pinned rendering inputs with a caller-supplied, fetched webapp ref.
import manifest from "@tests/reference/webapp.json" with { type: "json" };
const [checkout, ref = "origin/staging"] = Deno.args;
if (!checkout) {
  throw new Error(
    "Usage: deno task check:webapp /path/to/webapp [fetched-ref]",
  );
}
const changed: string[] = [];
for (const [path, expected] of Object.entries(manifest.files)) {
  const result = await new Deno.Command("git", {
    args: ["-C", checkout, "show", `${ref}:${path}`],
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) throw new Error(`Could not read ${ref}:${path}`);
  const digest = Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", result.stdout)),
    (byte) => byte.toString(16).padStart(2, "0"),
  ).join("");
  if (digest !== expected) changed.push(path);
}
if (changed.length) {
  throw new Error(
    `Webapp rendering inputs changed; review and sync before release:\n${
      changed.join("\n")
    }`,
  );
}
console.log(
  `All ${
    Object.keys(manifest.files).length
  } canonical rendering inputs match ${ref}.`,
);
