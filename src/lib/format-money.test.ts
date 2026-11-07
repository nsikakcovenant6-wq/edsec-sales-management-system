import { describe, expect, it } from "vitest";
import { formatMoney } from "./format-money";

describe("formatMoney", () => {
  it("formats minor units without floating-point conversion", () => {
    expect(formatMoney(123456n, "USD", 2, "en-US")).toBe("$1,234.56");
  });

  it("preserves small negative amounts", () => {
    expect(formatMoney(-5n, "USD", 2, "en-US")).toBe("-$0.05");
  });

  it("supports currencies configured with zero fraction digits", () => {
    expect(formatMoney(1234n, "JPY", 0, "en-US")).toBe("¥1,234");
  });

  it("supports large integer minor-unit amounts", () => {
    expect(formatMoney("900719925474099312345", "USD", 2, "en-US")).toBe("$9,007,199,254,740,993,123.45");
  });
});
