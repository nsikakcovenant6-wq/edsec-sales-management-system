import { beforeEach, describe, expect, it, vi } from "vitest";
const me = vi.fn();
vi.mock("@backend/src/http/runtime.js", () => ({ getV1RouteHandlers: () => ({ me }) }));
import { GET } from "./route";
describe("GET /api/v1/me route adapter", () => {
  beforeEach(() => me.mockReset());
  it("passes the original request, including bearer token, to the backend handler", async () => {
    const response = Response.json({data:{user_id:"u1",memberships:[]}});
    me.mockResolvedValue(response);
    const request = new Request("http://localhost/api/v1/me",{headers:{authorization:"Bearer mocked"}});
    expect(await GET(request)).toBe(response); expect(me).toHaveBeenCalledWith(request);
  });
});
