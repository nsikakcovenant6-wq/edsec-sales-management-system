import { getV1RouteHandlers } from "@backend/dist/http/runtime";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
type Context = { params: Promise<{businessId:string}> };
export async function PUT(request:Request, context:Context) { const {businessId}=await context.params; return getV1RouteHandlers().replaceCategories(request,businessId); }
