/** Release metadata is read from the same manifest JSR publishes. */
export function releaseMetadata(manifest: { name: string; version: string }) {
  if (manifest.name !== "@vanity-plates/sdk") {
    throw new Error(`Unexpected release package: ${manifest.name}`);
  }
  // Keep tags and GitHub outputs single-line; JSR dry-run validates full SemVer.
  if (
    !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(
      manifest.version,
    )
  ) {
    throw new Error(`Invalid release version: ${manifest.version}`);
  }
  return {
    name: manifest.name,
    version: manifest.version,
    tag: `sdk-${manifest.version}`,
    prerelease: manifest.version.split("+")[0].includes("-"),
  };
}

/** Never infer a publication's source commit when a version exists without its tag. */
export function releasePlan(
  manifest: { name: string; version: string },
  state: {
    commit: string;
    tagCommit?: string;
    published: boolean;
  },
) {
  const release = releaseMetadata(manifest);
  if (
    !/^[a-f0-9]{40}$/.test(state.commit) ||
    state.tagCommit !== undefined && !/^[a-f0-9]{40}$/.test(state.tagCommit)
  ) {
    throw new Error("Release commits must be full Git commit hashes.");
  }
  if (state.published && !state.tagCommit) {
    throw new Error(
      `${release.name}@${release.version} is already published but ${release.tag} is missing. Recover the original publication commit and its tag before retrying; do not tag the current commit by assumption.`,
    );
  }
  if (state.tagCommit && !state.published) {
    throw new Error(
      `${release.tag} exists but JSR has no matching version. Resolve the release state before publishing.`,
    );
  }
  return {
    ...release,
    publish: !state.published,
    commit: state.tagCommit ?? state.commit,
  };
}

/** A registry outage or permission error must never look like an unpublished version. */
export async function versionExists(
  response: Response,
  expectedVersion: string,
): Promise<boolean> {
  if (response.status === 404) {
    await response.body?.cancel();
    return false;
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`JSR version lookup failed: HTTP ${response.status}`);
  }
  const body = await response.json();
  if (!body || body.version !== expectedVersion) {
    throw new Error("Invalid JSR version response.");
  }
  return true;
}
