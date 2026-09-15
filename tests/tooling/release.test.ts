import { describe, it } from "@std/testing/bdd";
import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import {
  releaseMetadata,
  releasePlan,
  versionExists,
} from "@tools/quality/release.ts";
const manifest = { name: "@vanity-plates/sdk", version: "0.1.0" };
const first = "a".repeat(40), next = "b".repeat(40);
describe("main-branch release planning", () => {
  it("publishes the first version and preserves an existing release on reruns/later merges", () => {
    assertEquals(releasePlan(manifest, { commit: first, published: false }), {
      ...manifest,
      tag: "sdk-0.1.0",
      prerelease: false,
      publish: true,
      commit: first,
    });
    for (const commit of [first, next]) {
      assertEquals(
        releasePlan(manifest, { commit, tagCommit: first, published: true }),
        {
          ...manifest,
          tag: "sdk-0.1.0",
          prerelease: false,
          publish: false,
          commit: first,
        },
      );
    }
    assertEquals(
      releaseMetadata({ ...manifest, version: "0.2.0-rc.1" }).prerelease,
      true,
    );
    assertEquals(
      releaseMetadata({ ...manifest, version: "0.2.0+build-1" }).prerelease,
      false,
    );
  });
  it("refuses to mislabel an already published version or publish over a contradictory tag", () => {
    assertThrows(
      () => releasePlan(manifest, { commit: next, published: true }),
      Error,
      "original publication commit",
    );
    assertThrows(
      () =>
        releasePlan(manifest, {
          commit: next,
          tagCommit: first,
          published: false,
        }),
      Error,
      "no matching version",
    );
    assertThrows(
      () => releasePlan(manifest, { commit: "bad", published: false }),
      Error,
      "commit hashes",
    );
    assertThrows(
      () =>
        releasePlan(manifest, {
          commit: first,
          tagCommit: "bad",
          published: true,
        }),
      Error,
      "commit hashes",
    );
    for (const version of ["latest", "0.1.0\npublish=true", "../main", "0.1"]) {
      assertThrows(() => releaseMetadata({ ...manifest, version }));
    }
    assertThrows(() => releaseMetadata({ ...manifest, name: "@another/sdk" }));
  });
  it("distinguishes missing registry versions from service failures", async () => {
    assertEquals(
      await versionExists(
        new Response(null, { status: 404 }),
        manifest.version,
      ),
      false,
    );
    assertEquals(
      await versionExists(
        Response.json({ version: "0.1.0" }),
        manifest.version,
      ),
      true,
    );
    for (const status of [401, 403, 429, 500]) {
      await assertRejects(
        () => versionExists(new Response(null, { status }), manifest.version),
        Error,
        `HTTP ${status}`,
      );
    }
    await assertRejects(
      () => versionExists(Response.json({}), manifest.version),
      Error,
      "Invalid JSR",
    );
    await assertRejects(
      () =>
        versionExists(Response.json({ version: "0.2.0" }), manifest.version),
      Error,
      "Invalid JSR",
    );
  });
});
