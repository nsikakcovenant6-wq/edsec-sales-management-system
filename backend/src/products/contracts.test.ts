import { describe, expect, it } from "vitest";
import {
  parseTemplateCopyRequest,
  parseTemplateListQuery,
  templateTrackingType,
} from "./contracts.js";

describe("product template API contracts", () => {
  it("parses bounded catalogue filters and defaults the page size", () => {
    expect(parseTemplateListQuery(new URL("https://api.example.test/templates?q=tea&limit=50"))).toEqual({
      q: "tea", limit: 50,
    });
    expect(() => parseTemplateListQuery(new URL("https://api.example.test/templates?limit=101")))
      .toThrowError("between 1 and 100");
  });

  it("validates template copy overrides without accepting floating-point money", () => {
    expect(parseTemplateCopyRequest({
      name: " Green Tea ", sku: "TEA-1", selling_price_minor: "12500",
      attributes: { unit: "box" },
    })).toEqual({
      name: "Green Tea", sku: "TEA-1", selling_price_minor: "12500",
      attributes: { unit: "box" },
    });
    expect(() => parseTemplateCopyRequest({ selling_price_minor: 12.5 }))
      .toThrowError("integer string");
    expect(() => parseTemplateCopyRequest({ name: " " })).toThrowError("1–180");
  });

  it("normalizes supported tracking types and rejects unknown values", () => {
    expect(templateTrackingType("QUANTITY")).toBe("quantity");
    expect(() => templateTrackingType("unknown")).toThrowError("unsupported");
  });
});
