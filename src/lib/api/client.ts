import { getSupabaseBrowserClient } from "@/lib/supabase/client";
export type ApiErrorPayload = { code: string; message: string; request_id?: string; fields?: Record<string, string> };
export class ApiError extends Error {
 readonly code:string;readonly requestId?:string;readonly fields?:Record<string,string>;
 constructor(payload:ApiErrorPayload,readonly status:number){super(payload.message||"The request could not be completed");this.name="ApiError";this.code=payload.code||"API_ERROR";this.requestId=payload.request_id;this.fields=payload.fields;}
}
export type ApiEnvelope<T>={data:T;meta?:{request_id?:string}};
export type Category={id:string;name:string;slug:string;parent_id:string|null;feature_flags:string[]};
export type FeatureEntitlement={key:string;enabled:boolean;limit:number|null;usage:number};
export type OnboardingState={current_step:string;completed_steps:string[];skipped_steps:string[];status:string};
export type Membership={business_id:string;business_name:string;role:string;permissions:string[];permission_scopes:Record<string,string>;branch_ids:string[];default_branch_id:string|null;subscription_status:string;features:FeatureEntitlement[];onboarding:OnboardingState};
export type MeResponse={user_id:string;email:string;full_name:string|null;memberships:Membership[]};
export type Business={id:string;name:string;email:string|null;phone:string|null;address:string|null;currency_code:string;timezone:string;vat_enabled:boolean;vat_rate_bps:number;tax_mode:"inclusive"|"exclusive";default_branch_id:string|null;category_ids:string[]};
export type Branch={id:string;name:string;code:string;address:string|null;is_active:boolean;is_default:boolean};
export type BranchPage={items:Branch[];next_cursor:string|null};
export type BusinessCreate={name:string;email?:string|null;phone?:string|null;address?:string|null;currency_code?:string;timezone?:string;vat_enabled?:boolean;vat_rate_bps?:number};
export type BusinessPatch=Partial<BusinessCreate>&{tax_mode?:"inclusive"|"exclusive"};
export type BranchWrite={name?:string;code?:string;address?:string|null;is_active?:boolean;is_default?:boolean};
export type OnboardingPatch={current_step?:string;completed_steps?:string[];skipped_steps?:string[]};
export type ProductTemplateImage={id:string;object_path:string;source_url:string|null;licence_name:string;licence_url:string|null;attribution:string|null};
export type ProductTemplate={id:string;category_id:string|null;category_name:string|null;name:string;description:string|null;sku:string|null;barcode:string|null;tracking_type:string;currency_code:string;suggested_selling_price_minor:string|null;attributes:Record<string,unknown>;images:ProductTemplateImage[]};
export type ProductTemplatePage={items:ProductTemplate[];next_cursor:string|null};
export type TemplateCopyInput={name?:string;sku?:string|null;barcode?:string|null;category_id?:string|null;selling_price_minor?:string;attributes?:Record<string,unknown>};
export type TemplateCopyResult={product:{id:string;name:string;sku:string|null;barcode:string|null;selling_price_minor:string;currency_code:string;status:string};opening_stock:string;inventory_balances_created:number};
export type ProductImportField="name"|"description"|"sku"|"barcode"|"selling_price"|"cost_price"|"category_id"|"tracking_type";
export type ProductImportRowError={row:number;field:string;code:string;message:string};
export type ProductImportStatus="queued"|"validating"|"processing"|"completed"|"partial_success"|"failed";
export type ProductImportJob={id:string;status:ProductImportStatus;total_rows:number;processed_rows:number;created_rows:number;failed_rows:number;errors:ProductImportRowError[];next_cursor:string|null;message?:string};
export type ProductImportStartInput={object_path:string;file_name:string;column_mapping:Partial<Record<ProductImportField,string>>;currency_code:string};
export type ProductImportStartResult={import_id:string;status:ProductImportStatus;total_rows:number};
export function toApiError(payload:unknown,status:number):ApiError {
 if(payload&&typeof payload==="object"&&"error" in payload){const error=(payload as {error?:Partial<ApiErrorPayload>}).error??{};return new ApiError({code:error.code??"API_ERROR",message:error.message??"The request could not be completed",request_id:error.request_id,fields:error.fields},status);}
 return new ApiError({code:"API_ERROR",message:"The request could not be completed"},status);
}
export async function apiRequest<T>(path:string,init:RequestInit={},authenticated=true):Promise<T>{
 const headers=new Headers(init.headers);if(init.body&&!(init.body instanceof FormData)&&!headers.has("content-type"))headers.set("content-type","application/json");
 if(authenticated){const {data,error}=await getSupabaseBrowserClient().auth.getSession();if(error)throw new ApiError({code:"SESSION_ERROR",message:error.message},401);const token=data.session?.access_token;if(!token)throw new ApiError({code:"UNAUTHENTICATED",message:"Please sign in to continue."},401);headers.set("authorization",`Bearer ${token}`);}
 const response=await fetch(`/api/v1${path}`,{...init,headers,cache:"no-store"});let payload:unknown;try{payload=await response.json();}catch{throw new ApiError({code:"INVALID_RESPONSE",message:"The server returned an unreadable response."},response.status);}
 if(!response.ok||(payload&&typeof payload==="object"&&"error" in payload))throw toApiError(payload,response.status);
 if(!payload||typeof payload!=="object"||!("data" in payload))throw new ApiError({code:"INVALID_RESPONSE",message:"The server response did not contain data."},response.status);
 return (payload as ApiEnvelope<T>).data;
}
const json=(value:unknown)=>JSON.stringify(value);
export const api={
 me:()=>apiRequest<MeResponse>("/me"),categories:()=>apiRequest<Category[]>("/categories",{},false),
 createBusiness:(input:BusinessCreate)=>apiRequest<{business:Business;default_branch:Branch}>("/businesses",{method:"POST",body:json(input)}),
 getBusiness:(id:string)=>apiRequest<Business>(`/businesses/${encodeURIComponent(id)}`),
 patchBusiness:(id:string,input:BusinessPatch)=>apiRequest<Business>(`/businesses/${encodeURIComponent(id)}`,{method:"PATCH",body:json(input)}),
 replaceCategories:(id:string,categoryIds:string[])=>apiRequest<{business_id:string;category_ids:string[]}>(`/businesses/${encodeURIComponent(id)}/categories`,{method:"PUT",body:json({category_ids:categoryIds})}),
 getOnboarding:(id:string)=>apiRequest<OnboardingState>(`/businesses/${encodeURIComponent(id)}/onboarding`),
 patchOnboarding:(id:string,input:OnboardingPatch)=>apiRequest<OnboardingState>(`/businesses/${encodeURIComponent(id)}/onboarding`,{method:"PATCH",body:json(input)}),
 listBranches:(id:string)=>apiRequest<BranchPage>(`/businesses/${encodeURIComponent(id)}/branches`),
 createBranch:(id:string,input:Required<Pick<BranchWrite,"name"|"code">>&BranchWrite)=>apiRequest<Branch>(`/businesses/${encodeURIComponent(id)}/branches`,{method:"POST",body:json(input)}),
 updateBranch:(businessId:string,branchId:string,input:BranchWrite)=>apiRequest<Branch>(`/businesses/${encodeURIComponent(businessId)}/branches/${encodeURIComponent(branchId)}`,{method:"PATCH",body:json(input)}),
 productTemplates:(businessId:string,filters:{category_id?:string;q?:string;cursor?:string;limit?:number}={})=>{const query=new URLSearchParams();if(filters.category_id)query.set("category_id",filters.category_id);if(filters.q)query.set("q",filters.q);if(filters.cursor)query.set("cursor",filters.cursor);if(filters.limit)query.set("limit",String(filters.limit));return apiRequest<ProductTemplatePage>(`/businesses/${encodeURIComponent(businessId)}/product-templates${query.size?`?${query.toString()}`:""}`);},
 copyProductTemplate:(businessId:string,templateId:string,input:TemplateCopyInput,idempotencyKey:string)=>apiRequest<TemplateCopyResult>(`/businesses/${encodeURIComponent(businessId)}/product-templates/${encodeURIComponent(templateId)}/copy`,{method:"POST",headers:{"idempotency-key":idempotencyKey},body:json(input)}),
 createProductImport:(businessId:string,input:ProductImportStartInput)=>apiRequest<ProductImportStartResult>(`/businesses/${encodeURIComponent(businessId)}/products/imports`,{method:"POST",body:json(input)}),
 getProductImport:(businessId:string,importId:string,cursor?:string)=>apiRequest<ProductImportJob>(`/businesses/${encodeURIComponent(businessId)}/products/imports/${encodeURIComponent(importId)}${cursor?`?cursor=${encodeURIComponent(cursor)}`:""}`),
};
