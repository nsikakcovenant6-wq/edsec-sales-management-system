import { describe, expect, it } from "vitest";
import { ApiError, toApiError } from "./client";
describe("API error handling", () => {
  it("preserves backend error codes, request IDs and field details", () => {
    const error = toApiError({ error: { code: "FEATURE_NOT_AVAILABLE", message: "Upgrade required", request_id: "req-1", fields: { branch: "locked" } } }, 403);
    expect(error).toBeInstanceOf(ApiError); expect(error.code).toBe("FEATURE_NOT_AVAILABLE"); expect(error.status).toBe(403); expect(error.requestId).toBe("req-1"); expect(error.fields).toEqual({ branch: "locked" });
  });
  it("normalizes unknown error payloads", () => { const error = toApiError({ html: true }, 502); expect(error.code).toBe("API_ERROR"); });
});
