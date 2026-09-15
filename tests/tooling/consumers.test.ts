import { assertEquals, assertFalse } from "@std/assert";
import { describe, it } from "@std/testing/bdd";
import config from "@config" with { type: "json" };
import { consumerConfiguration } from "@tools/quality/consumers.ts";

describe("isolated consumer resolution", () => {
  it("checks every published subpath through JSR without local package fallbacks", () => {
    const consumer = consumerConfiguration(config);
    assertFalse("scopes" in consumer);
    for (const subpath of Object.keys(config.exports)) {
      const suffix = subpath === "." ? "" : subpath.slice(1);
      assertEquals(
        consumer.imports[`@consumer/sdk${suffix}`],
        `jsr:@vanity-plates/sdk@${config.version}${suffix}`,
      );
    }
    for (
      const forbidden of [
        "@/",
        "@sdk",
        "@config",
        "@tests/",
        "@tools/",
        "@colibri/core",
      ]
    ) {
      assertFalse(forbidden in consumer.imports);
    }
    assertFalse(
      Object.values(consumer.imports).some((target) =>
        target.startsWith("file:") || target.startsWith(".")
      ),
    );
  });

  it("keeps source aliases inside the copied artifact for unpublished checks", () => {
    const artifact = "file:///isolated/package/";
    const consumer = consumerConfiguration(config, artifact);
    assertEquals(consumer.imports["@consumer/sdk"], artifact + "index.ts");
    assertEquals(consumer.scopes?.[artifact]["@/"], artifact + "src/");
    assertEquals(
      consumer.scopes?.[artifact]["@colibri/core"],
      config.imports["@colibri/core"],
    );
    assertFalse("@/" in consumer.imports);
    assertFalse("@colibri/core" in consumer.imports);
  });
});
