import { describe, it, expect } from "vitest";
import { escapeHtml, truncate, cleanTitle, filenameOf, shortId } from "../src/utils.js";

describe("escapeHtml", () => {
  it("escapes the characters Telegram's HTML parse mode treats specially", () => {
    expect(escapeHtml("<b>Tom & Jerry</b>")).toBe("&lt;b&gt;Tom &amp; Jerry&lt;/b&gt;");
  });

  it("returns an empty string for falsy input", () => {
    expect(escapeHtml("")).toBe("");
    expect(escapeHtml(undefined)).toBe("");
  });
});

describe("truncate", () => {
  it("leaves short strings untouched", () => {
    expect(truncate("Supergirl", 60)).toBe("Supergirl");
  });

  it("truncates long strings and appends an ellipsis", () => {
    const long = "A".repeat(100);
    const result = truncate(long, 10);
    expect(result).toHaveLength(10);
    expect(result.endsWith("\u2026")).toBe(true);
  });

  it("passes through falsy input unchanged", () => {
    expect(truncate("", 10)).toBe("");
    expect(truncate(null, 10)).toBe(null);
  });
});

describe("cleanTitle", () => {
  it("strips the source site's Persian prefix from a result title", () => {
    expect(cleanTitle("\u062F\u0627\u0646\u0644\u0648\u062F \u0632\u06CC\u0631\u0646\u0648\u06CC\u0633 \u0641\u0627\u0631\u0633\u06CC \u0641\u06CC\u0644\u0645 Supergirl")).toBe(
      "Supergirl"
    );
  });

  it("returns the original title when there is nothing to strip", () => {
    expect(cleanTitle("Supergirl")).toBe("Supergirl");
  });

  it("passes through falsy input unchanged", () => {
    expect(cleanTitle("")).toBe("");
    expect(cleanTitle(null)).toBe(null);
  });
});

describe("filenameOf", () => {
  it("extracts and decodes the last path segment of a URL", () => {
    expect(filenameOf("https://dl.example.com/dlsub/My%20Show-S01.zip")).toBe("My Show-S01.zip");
  });

  it("falls back to naive splitting for non-URL input", () => {
    expect(filenameOf("not-a-url/file.zip")).toBe("file.zip");
  });
});

describe("shortId", () => {
  it("generates lowercase hex ids of the requested length", () => {
    const id = shortId(12);
    expect(id).toHaveLength(12);
    expect(id).toMatch(/^[0-9a-f]+$/);
  });

  it("generates different ids on subsequent calls", () => {
    expect(shortId(16)).not.toBe(shortId(16));
  });
});
