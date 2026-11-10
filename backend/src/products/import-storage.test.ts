import { describe, expect, it } from "vitest";
import {
  assertTenantImportObjectPath,
  validateSignedImportUploadRequest,
} from "./import-storage.js";

describe("private product import upload policy", () => {
  it("accepts only bounded CSV and XLSX upload metadata", () => {
    expect(validateSignedImportUploadRequest({
      file_name: "products.csv", content_type: "text/csv", size_bytes: 1024,
    })).toEqual({ file_name: "products.csv", content_type: "text/csv", size_bytes: 1024 });
    expect(() => validateSignedImportUploadRequest({
      file_name: "products.xlsx", content_type: "text/csv", size_bytes: 1024,
    })).toThrowError("matching MIME types");
    expect(() => validateSignedImportUploadRequest({
      file_name: "products.csv", content_type: "text/csv", size_bytes: 10 * 1024 * 1024 + 1,
    })).toThrowError("10 MiB");
    expect(() => validateSignedImportUploadRequest({
      file_name: "../products.csv", content_type: "text/csv", size_bytes: 1024,
    })).toThrowError("plain file name");
  });

  it("confines uploaded object paths to a single file under the business namespace", () => {
    expect(() => assertTenantImportObjectPath("business-1/imports/file.csv", "business-1")).not.toThrow();
    expect(() => assertTenantImportObjectPath("business-2/imports/file.csv", "business-1")).toThrowError("outside");
    expect(() => assertTenantImportObjectPath("business-1/imports/../other.csv", "business-1")).toThrowError("outside");
    expect(() => assertTenantImportObjectPath("business-1/imports/nested/file.csv", "business-1")).toThrowError("one file");
  });
});
