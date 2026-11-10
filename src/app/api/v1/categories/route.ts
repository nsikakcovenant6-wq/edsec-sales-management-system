import { getV1RouteHandlers } from "@backend/src/http/runtime.js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function GET() { return getV1RouteHandlers().listCategories(); }
