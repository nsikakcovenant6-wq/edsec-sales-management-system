import { getV1RouteHandlers } from "@backend/src/http/runtime.js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{businessId:string}> };
export async function GET(request:Request, context:Context) { const {businessId}=await context.params; return getV1RouteHandlers().getOnboarding(request,businessId); }
export async function PATCH(request:Request, context:Context) { const {businessId}=await context.params; return getV1RouteHandlers().patchOnboarding(request,businessId); }
