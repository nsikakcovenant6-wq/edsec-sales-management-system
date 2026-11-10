import { ImportValidationError } from "./import-validation.js";

export interface ProductTemplateImageDto {
  id: string;
  object_path: string;
  source_url: string | null;
  licence_name: string;
  licence_url: string | null;
  attribution: string | null;
}
export interface ProductTemplateDto {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  sku: string | null;
  barcode: string | null;
  tracking_type: "quantity" | "serial" | "batch" | "weighted";
  currency_code: string;
  suggested_selling_price_minor: string | null;
  attributes: Record<string, unknown>;
  images: ProductTemplateImageDto[];
}
export interface ProductTemplateListDto {
  items: ProductTemplateDto[];
  next_cursor: string | null;
}
export interface TemplateCopyRequest {
  name?: string;
  sku?: string | null;
  barcode?: string | null;
  category_id?: string | null;
  selling_price_minor?: string;
  attributes?: Record<string, unknown>;
}
export interface TemplateCopyResponse {
  product: {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    category_id: string | null;
    tracking_type: "quantity" | "serial" | "batch" | "weighted";
    selling_price_minor: string;
    currency_code: string;
    opening_stock: "0";
    inventory_balances: Array<{ branch_id: string; quantity_on_hand: "0"; quantity_reserved: "0" }>;
  };
  source_template_id: string;
  created: boolean;
}

const TRACKING_TYPES = new Set(["quantity", "serial", "batch", "weighted"]);

export function parseTemplateListQuery(url: URL): {
  categoryId?: string; q?: string; cursor?: string; limit: number;
} {
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? 25 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new ImportValidationError("INVALID_LIMIT", "limit must be an integer between 1 and 100");
  }
  const categoryId = url.searchParams.get("category_id") ?? undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;
  const cursor = url.searchParams.get("cursor") ?? undefined;
  if (q && q.length > 120) throw new ImportValidationError("INVALID_QUERY", "q cannot exceed 120 characters");
  if (cursor && cursor.length > 128) throw new ImportValidationError("INVALID_CURSOR", "cursor is invalid");
  return { ...(categoryId ? { categoryId } : {}), ...(q ? { q } : {}), ...(cursor ? { cursor } : {}), limit };
}

export function parseTemplateCopyRequest(value: unknown): TemplateCopyRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ImportValidationError("VALIDATION_ERROR", "Template copy body must be an object");
  }
  const input = value as Record<string, unknown>;
  const result: TemplateCopyRequest = {};
  if (input.name !== undefined) {
    if (typeof input.name !== "string" || input.name.trim().length < 1 || input.name.trim().length > 180) {
      throw new ImportValidationError("INVALID_NAME", "name must contain 1–180 characters");
    }
    result.name = input.name.trim();
  }
  for (const key of ["sku", "barcode", "category_id"] as const) {
    const item = input[key];
    if (item !== undefined && item !== null && typeof item !== "string") {
      throw new ImportValidationError("INVALID_FIELD", `${key} must be a string or null`);
    }
    if (key === "sku" && typeof item === "string" && item.length > 80) throw new ImportValidationError("INVALID_SKU", "sku cannot exceed 80 characters");
    if (key === "barcode" && typeof item === "string" && item.length > 120) throw new ImportValidationError("INVALID_BARCODE", "barcode cannot exceed 120 characters");
    if (item !== undefined) result[key] = item as string | null;
  }
  if (input.selling_price_minor !== undefined) {
    if (typeof input.selling_price_minor !== "string" || !/^(0|[1-9][0-9]*)$/.test(input.selling_price_minor)) {
      throw new ImportValidationError("INVALID_PRICE", "selling_price_minor must be a non-negative integer string");
    }
    result.selling_price_minor = input.selling_price_minor;
  }
  if (input.attributes !== undefined) {
    if (!input.attributes || typeof input.attributes !== "object" || Array.isArray(input.attributes)) {
      throw new ImportValidationError("INVALID_ATTRIBUTES", "attributes must be a JSON object");
    }
    result.attributes = input.attributes as Record<string, unknown>;
  }
  return result;
}

export function templateTrackingType(value: string): ProductTemplateDto["tracking_type"] {
  const normalized = value.toLowerCase();
  if (!TRACKING_TYPES.has(normalized)) throw new ImportValidationError("INVALID_TRACKING_TYPE", "Template tracking type is unsupported");
  return normalized as ProductTemplateDto["tracking_type"];
}
