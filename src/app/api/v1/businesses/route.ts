import { getV1RouteHandlers } from "@backend/src/http/runtime";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) { return getV1RouteHandlers().createBusiness(request); }
