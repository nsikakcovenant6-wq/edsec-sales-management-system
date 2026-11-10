import { getV1RouteHandlers } from "@backend/dist/http/runtime";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET(request: Request) { return getV1RouteHandlers().me(request); }
