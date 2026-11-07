import { describe, expect, it } from "vitest";
import { readBackendEnv } from "../src/config/env.js";

describe("backend environment validation", () => {
  it("requires all server-only credentials", () => {
    expect(() => readBackendEnv({})).toThrow("SUPABASE_URL");
  });

  it("rejects non-HTTPS Supabase URLs outside localhost", () => {
    expect(() => readBackendEnv({
      SUPABASE_URL: "http://supabase.example.com",
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    })).toThrow("HTTPS");
  });

  it("accepts configured HTTPS project settings", () => {
    const env = readBackendEnv({
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "server-secret",
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
    });
    expect(env.supabaseUrl).toBe("https://example.supabase.co");
  });
});
