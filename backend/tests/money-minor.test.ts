import { describe, expect, it } from "vitest";
import { parseMoneyMinor, parseQuantity, parseSignedMoneyMinor, parseSignedQuantity } from "../src/money/minor.js";

describe("minor-unit money parsing", () => {
  it("accepts unsigned integer strings", () => {
    expect(parseMoneyMinor("125000")).toBe(125000n);
    expect(parseMoneyMinor("0")).toBe(0n);
  });

  it("rejects negative, fractional and floating-point money", () => {
    expect(() => parseMoneyMinor("-2500")).toThrow();
    expect(() => parseMoneyMinor("12.50")).toThrow();
    expect(() => parseMoneyMinor("1e3")).toThrow();
  });

  it("allows signed deltas only through the signed parser", () => {
    expect(parseSignedMoneyMinor("-2500")).toBe(-2500n);
  });
});

describe("quantity precision", () => {
  it("accepts up to four decimal places", () => {
    expect(parseQuantity("1.5")).toBe("1.5");
    expect(parseQuantity("0.0001")).toBe("0.0001");
    expect(parseSignedQuantity("-1.2500")).toBe("-1.2500");
  });

  it("rejects precision beyond Decimal(18,4)", () => {
    expect(() => parseQuantity("1.00001")).toThrow();
    expect(() => parseQuantity("-1")).toThrow();
  });
});
