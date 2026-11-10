import { describe, expect, it } from "vitest";
import {
  decimalToMinorUnits,
  ImportValidationError,
  parseCsv,
  parseImportRow,\n  validateColumnMapping,\n  assertNoFormulaCells,
} from "./import-validation.js";

describe("parseCsv", () => {
  it("handles BOM, quoted commas, escaped quotes and embedded newlines", () => {
    const parsed = parseCsv('\uFEFFname,selling_price,description\r\n"Tea, green",12.50,"loose ""leaf""\npack"');
    expect(parsed.headers).toEqual(["name", "selling_price", "description"]);
    expect(parsed.rows[0]?.values).toEqual(["Tea, green", "12.50", 'loose "leaf"\npack']);
  });

  it("rejects malformed quotes and duplicate normalized headers", () => {
    expect(() => parseCsv('name,price\n"Tea,10')).toThrowError(ImportValidationError);
    expect(() => parseCsv("Product Name,product-name\nTea,1")).toThrowError("duplicate column");
  });

  it("enforces row, column and cell limits", () => {
    expect(() => parseCsv("name\na\nb", { maxRows: 1 })).toThrowError("row count");
    expect(() => parseCsv("name,price\na,1", { maxColumns: 1 })).toThrowError("column count");
    expect(() => parseCsv("name\n12345", { maxCellLength: 4 })).toThrowError("cell exceeds");
  });
});

describe("decimalToMinorUnits", () => {
  it("converts decimal strings exactly without floating point", () => {
    expect(decimalToMinorUnits("1200.50")).toBe(120050n);
    expect(decimalToMinorUnits("0.1")).toBe(10n);
    expect(decimalToMinorUnits("1200", 0)).toBe(1200n);
  });

  it("rejects negative, malformed and over-precision values", () => {
    expect(() => decimalToMinorUnits("-1.00")).toThrowError("non-negative");
    expect(() => decimalToMinorUnits("1.005")).toThrowError("decimal places");
    expect(() => decimalToMinorUnits("1,000")).toThrowError("non-negative");
  });
});

describe("parseImportRow", () => {
  it("validates required name and price and maps optional fields", () => {
    const result = parseImportRow(
      ["name", "selling_price", "sku", "barcode", "description"],
      ["Notebook", "250.00", "NOTE-1", "123456", "Exercise book"],
      2,
    );
    expect(result.errors).toEqual([]);
    expect(result.value).toMatchObject({
      name: "Notebook",
      sku: "NOTE-1",
      barcode: "123456",
      description: "Exercise book",
      sellingPriceMinor: 25000n,
    });
  });

  it("returns row-addressed validation errors", () => {
    const result = parseImportRow(["name", "selling_price"], ["", "bad"], 8);
    expect(result.errors.map((issue) => [issue.row, issue.field])).toEqual([
      [8, "name"],
      [8, "selling_price"],
    ]);
  });
});


describe("import mapping and formula safety", () => {
  it("requires name and selling price and rejects duplicate targets", () => {
    expect(validateColumnMapping(["Product", "Price"], {
      Product: "name", Price: "selling_price",
    })).toEqual({ product: "name", price: "selling_price" });
    expect(() => validateColumnMapping(["Product", "Price"], {
      Product: "name", Price: "name",
    })).toThrowError("more than one source column");
    expect(() => validateColumnMapping(["Product"], {
      Product: "name",
    })).toThrowError("name and selling price");
  });

  it("rejects formula-like cells without evaluating them", () => {
    expect(() => assertNoFormulaCells([{ rowNumber: 3, values: ["=SUM(A1:A2)"] }]))
      .toThrowError("Formula-like content");
    expect(() => assertNoFormulaCells([{ rowNumber: 4, values: ["Notebook", "-12.50"] }]))
      .not.toThrow();
  });

  it("rejects malformed quote placement rather than silently accepting it", () => {
    expect(() => parseCsv('name,price\\nTea,12"50')).toThrowError(ImportValidationError);
    expect(() => parseCsv('name,price\\n"Tea"x,12')).toThrowError(ImportValidationError);
  });
});
