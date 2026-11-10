export const DEFAULT_IMPORT_LIMITS = {
  maxRows: 5_000,
  maxColumns: 40,
  maxCellLength: 2_000,
} as const;

export type ImportField =
  | "name"
  | "description"
  | "sku"
  | "barcode"
  | "selling_price"
  | "cost_price"
  | "category_id"
  | "tracking_type";

export interface ImportRowError {
  row: number;
  field: string;
  code: string;
  message: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: Array<{ rowNumber: number; values: string[] }>;
}

export class ImportValidationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ImportValidationError";
  }
}

/** Parse RFC-4180-style CSV without evaluating formulas or coercing cell values. */
export function parseCsv(
  input: string,
  limits: { maxRows?: number; maxColumns?: number; maxCellLength?: number } = {},
): ParsedCsv {
  const maxRows = limits.maxRows ?? DEFAULT_IMPORT_LIMITS.maxRows;
  const maxColumns = limits.maxColumns ?? DEFAULT_IMPORT_LIMITS.maxColumns;
  const maxCellLength = limits.maxCellLength ?? DEFAULT_IMPORT_LIMITS.maxCellLength;
  const text = input.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let record: string[] = [];
  let cell = "";
  let quoted = false;
  let closedQuote = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
          closedQuote = true;
        }
      } else {
        cell += char;
      }
      if (cell.length > maxCellLength) throw new ImportValidationError("CELL_TOO_LONG", "A CSV cell exceeds the maximum allowed length");
      continue;
    }

    if (closedQuote && char !== "," && char !== "\n" && char !== "\r") {
      throw new ImportValidationError("MALFORMED_CSV", "Unexpected content after a closing quoted field");
    }
    if (char === '"' && cell.length === 0 && !closedQuote) {
      quoted = true;
    } else if (char === '"') {
      throw new ImportValidationError("MALFORMED_CSV", "A quote may only begin an empty CSV field");
    } else if (char === ",") {
      record.push(cell);
      cell = "";
      closedQuote = false;
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      record.push(cell);
      cell = "";
      closedQuote = false;
      if (record.some((value) => value.length > 0)) records.push(record);
      record = [];
      if (records.length > maxRows + 1) throw new ImportValidationError("TOO_MANY_ROWS", "The CSV file exceeds the maximum allowed row count");
    } else {
      cell += char;
      if (cell.length > maxCellLength) throw new ImportValidationError("CELL_TOO_LONG", "A CSV cell exceeds the maximum allowed length");
    }
  }

  if (quoted) throw new ImportValidationError("MALFORMED_CSV", "The CSV file contains an unclosed quoted field");
  if (cell.length > 0 || record.length > 0) {
    record.push(cell);
    if (record.some((value) => value.length > 0)) records.push(record);
  }
  if (records.length === 0) throw new ImportValidationError("EMPTY_FILE", "The CSV file is empty");
  if (records.length - 1 > maxRows) throw new ImportValidationError("TOO_MANY_ROWS", "The CSV file exceeds the maximum allowed row count");

  const headers = records[0]!.map((header) => normalizeHeader(header));
  if (headers.length > maxColumns) throw new ImportValidationError("TOO_MANY_COLUMNS", "The CSV file exceeds the maximum allowed column count");
  if (headers.some((header) => !header)) throw new ImportValidationError("EMPTY_HEADER", "Every CSV column must have a header");
  if (new Set(headers).size !== headers.length) throw new ImportValidationError("DUPLICATE_HEADER", "The CSV file contains duplicate column headers");

  const rows = records.slice(1).map((values, index) => {
    if (values.length > maxColumns) throw new ImportValidationError("TOO_MANY_COLUMNS", `Row ${index + 2} has too many columns`);
    return { rowNumber: index + 2, values: headers.map((_, column) => values[column] ?? "") };
  });
  assertNoFormulaCells(rows);
  return { headers, rows };
}

export function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_").replace(/[^a-z0-9_]/g, "");
}

/** Convert a decimal currency amount to integer minor units without floating-point arithmetic. */
export function decimalToMinorUnits(value: string, fractionDigits = 2): bigint {
  const normalized = value.trim();
  if (!Number.isInteger(fractionDigits) || fractionDigits < 0 || fractionDigits > 4) {
    throw new ImportValidationError("INVALID_CURRENCY_PRECISION", "Currency precision must be between zero and four digits");
  }
  const match = /^([0-9]+)(?:\.([0-9]+))?$/.exec(normalized);
  if (!match) throw new ImportValidationError("INVALID_PRICE", "Price must be a non-negative decimal amount");
  const fraction = match[2] ?? "";
  if (fraction.length > fractionDigits) throw new ImportValidationError("INVALID_PRICE_PRECISION", `Price supports at most ${fractionDigits} decimal places`);
  const scale = 10n ** BigInt(fractionDigits);
  return BigInt(match[1]!) * scale + BigInt((fraction + "0".repeat(fractionDigits)).slice(0, fractionDigits) || "0");
}

export function parseImportRow(
  headers: string[],
  values: string[],
  rowNumber: number,
): { value: { name: string; description?: string; sku?: string; barcode?: string; sellingPriceMinor: bigint; costPriceMinor?: bigint }; errors: ImportRowError[] } {
  const row = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
  const errors: ImportRowError[] = [];
  const name = String(row.name ?? "").trim();
  if (!name) errors.push({ row: rowNumber, field: "name", code: "REQUIRED", message: "Product name is required" });
  if (name.length > 180) errors.push({ row: rowNumber, field: "name", code: "TOO_LONG", message: "Product name cannot exceed 180 characters" });

  let sellingPriceMinor = 0n;
  try {
    if (!String(row.selling_price ?? "").trim()) throw new ImportValidationError("REQUIRED", "Selling price is required");
    sellingPriceMinor = decimalToMinorUnits(String(row.selling_price));
  } catch (error) {
    const issue = error instanceof ImportValidationError ? error : new ImportValidationError("INVALID_PRICE", "Selling price is invalid");
    errors.push({ row: rowNumber, field: "selling_price", code: issue.code, message: issue.message });
  }

  let costPriceMinor: bigint | undefined;
  if (String(row.cost_price ?? "").trim()) {
    try { costPriceMinor = decimalToMinorUnits(String(row.cost_price)); }
    catch (error) {
      const issue = error instanceof ImportValidationError ? error : new ImportValidationError("INVALID_PRICE", "Cost price is invalid");
      errors.push({ row: rowNumber, field: "cost_price", code: issue.code, message: issue.message });
    }
  }

  const sku = String(row.sku ?? "").trim() || undefined;
  const barcode = String(row.barcode ?? "").trim() || undefined;
  if (sku && sku.length > 80) errors.push({ row: rowNumber, field: "sku", code: "TOO_LONG", message: "SKU cannot exceed 80 characters" });
  if (barcode && barcode.length > 120) errors.push({ row: rowNumber, field: "barcode", code: "TOO_LONG", message: "Barcode cannot exceed 120 characters" });

  return {
    value: {
      name,
      ...(String(row.description ?? "").trim() ? { description: String(row.description).trim() } : {}),
      ...(sku ? { sku } : {}),
      ...(barcode ? { barcode } : {}),
      sellingPriceMinor,
      ...(costPriceMinor !== undefined ? { costPriceMinor } : {}),
    },
    errors,
  };
}


const IMPORT_FIELDS = new Set<ImportField>([
  "name", "description", "sku", "barcode", "selling_price", "cost_price",
  "category_id", "tracking_type",
]);

/** Validate an explicit source-header to canonical-field mapping. */
export function validateColumnMapping(
  headers: string[],
  mapping: Record<string, string>,
): Record<string, ImportField> {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  const result: Record<string, ImportField> = {};
  const usedFields = new Set<string>();
  for (const [source, target] of Object.entries(mapping)) {
    const header = normalizeHeader(source);
    if (!normalizedHeaders.has(header)) {
      throw new ImportValidationError("UNKNOWN_SOURCE_COLUMN", `Mapped source column "${source}" does not exist`);
    }
    if (!IMPORT_FIELDS.has(target as ImportField)) {
      throw new ImportValidationError("UNKNOWN_IMPORT_FIELD", `Mapped target field "${target}" is not supported`);
    }
    if (usedFields.has(target)) {
      throw new ImportValidationError("DUPLICATE_FIELD_MAPPING", `More than one source column maps to "${target}"`);
    }
    usedFields.add(target);
    result[header] = target as ImportField;
  }
  if (!usedFields.has("name") || !usedFields.has("selling_price")) {
    throw new ImportValidationError("REQUIRED_FIELD_MAPPING", "Product name and selling price columns must be mapped");
  }
  return result;
}

/** Reject spreadsheet formula cells. Values are never evaluated by this importer. */
export function assertNoFormulaCells(rows: Array<{ rowNumber: number; values: string[] }>): void {
  for (const row of rows) {
    for (let column = 0; column < row.values.length; column += 1) {
      const value = row.values[column] ?? "";
      if (/^[\\t\\r ]*[=+@]/.test(value) || /^[\\t\\r ]*-\\s*[A-Za-z(]/.test(value)) {
        throw new ImportValidationError(
          "FORMULA_NOT_ALLOWED",
          `Formula-like content is not allowed (row ${row.rowNumber}, column ${column + 1})`,
        );
      }
    }
  }
}
