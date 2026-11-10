import { getV1RouteHandlers } from "@backend/src/http/runtime.js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{businessId:string}> };
export async function GET(request:Request, context:Context) { const {businessId}=await context.params; return getV1RouteHandlers().listBranches(request,businessId); }
export async function POST(request:Request, context:Context) { const {businessId}=await context.params; return getV1RouteHandlers().createBranch(request,businessId); }
