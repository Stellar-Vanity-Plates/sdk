import { assertEquals } from "@std/assert";
import { webFonts } from "@/rendering/vendor/web-fonts.ts";
import provenance from "@/rendering/vendor/web-fonts-provenance.json" with {
  type: "json",
};

Deno.test("embedded canonical fonts retain every reviewed font asset hash", async () => {
  const embedded = Array.from(
    webFonts.matchAll(/url\(data:font\/woff2;base64,([^)]+)\)/g),
    (match) => match[1],
  );
  assertEquals(embedded.length, provenance.assets.length);
  for (const [index, data] of embedded.entries()) {
    const bytes = Uint8Array.from(
      atob(data),
      (character) => character.charCodeAt(0),
    );
    const digest = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (byte) => byte.toString(16).padStart(2, "0"),
    ).join("");
    assertEquals(digest, provenance.assets[index].sha256);
  }
});
