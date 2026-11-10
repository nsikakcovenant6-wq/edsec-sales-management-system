import { getV1RouteHandlers } from "@backend/src/http/runtime.js";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{businessId:string;branchId:string}> };
export async function PATCH(request:Request, context:Context) { const {businessId,branchId}=await context.params; return getV1RouteHandlers().updateBranch(request,businessId,branchId); }
