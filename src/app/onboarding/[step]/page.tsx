import { OnboardingScreen } from "@/components/auth/auth-screens";
import { ProductTemplatesWorkspace } from "@/components/products/product-templates-workspace";
import { ProductImportWorkspace } from "@/components/products/product-import-workspace";
const allowed=["welcome","business","categories","branches","store-configuration","product-templates","product-import","complete"] as const;
export default async function OnboardingPage({params}:{params:Promise<{step:string}>}){
 const {step}=await params;
 if(step==="product-templates")return <ProductTemplatesWorkspace mode="onboarding"/>;
 if(step==="product-import")return <ProductImportWorkspace mode="onboarding"/>;
 const selected=allowed.includes(step as (typeof allowed)[number])?step:"welcome";
 return <OnboardingScreen step={selected as "welcome"|"business"|"categories"|"branches"|"store-configuration"|"complete"}/>;
}
