import {
  releaseMetadata,
  releasePlan,
  versionExists,
} from "@tools/quality/release.ts";
const manifest = JSON.parse(await Deno.readTextFile("deno.json")) as {
  name: string;
  version: string;
};
const release = releaseMetadata(manifest);
async function git(...args: string[]) {
  const result = await new Deno.Command("git", {
    args,
    stdout: "piped",
    stderr: "piped",
  }).output();
  if (!result.success) {
    throw new Error(
      `git ${args.join(" ")} failed: ${
        new TextDecoder().decode(result.stderr)
      }`,
    );
  }
  return new TextDecoder().decode(result.stdout).trim();
}
const commit = await git("rev-parse", "HEAD");
const tags = await git("tag", "--list", release.tag);
const tagCommit = tags
  ? await git("rev-parse", `refs/tags/${release.tag}^{commit}`)
  : undefined;
const published = await versionExists(
  await fetch(
    `https://jsr.io/api/scopes/vanity-plates/packages/sdk/versions/${release.version}`,
    { signal: AbortSignal.timeout(30_000) },
  ),
  release.version,
);
const plan = releasePlan(manifest, { commit, tagCommit, published });
console.log(JSON.stringify(plan, null, 2));
const output = Deno.env.get("GITHUB_OUTPUT");
if (output) {
  await Deno.writeTextFile(
    output,
    `publish=${plan.publish}\ntag=${plan.tag}\nprerelease=${plan.prerelease}\n`,
    { append: true },
  );
}
