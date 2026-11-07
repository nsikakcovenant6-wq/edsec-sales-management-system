import { describe, expect, it } from "vitest";
import { getNavigationTitle, navigationItems } from "./nav";

describe("workspace navigation", () => {
  it("provides unique local destinations", () => {
    const paths = navigationItems.map((item) => item.href);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("resolves nested local paths to their section title", () => {
    expect(getNavigationTitle("/products/import")).toBe("Products");
  });

  it("falls back for an unknown path", () => {
    expect(getNavigationTitle("/not-a-module")).toBe("Workspace");
  });
});
