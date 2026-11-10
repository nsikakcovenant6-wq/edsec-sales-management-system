import {describe,expect,it} from "vitest";
import type {Membership} from "@/lib/api/client";
import {canCreateAdditionalBranch,getOnboardingRoute} from "./flow";
const member:Membership={business_id:"b1",business_name:"Demo",role:"Owner",permissions:["branches.manage"],permission_scopes:{},branch_ids:[],default_branch_id:null,subscription_status:"trial",features:[{key:"multi_branch",enabled:false,limit:null,usage:0}],onboarding:{current_step:"branch_setup",completed_steps:[],skipped_steps:[],status:"in_progress"}};
describe("Phase 2 onboarding routing and branch feature gate",()=>{
 it("resumes each persisted Phase 2 step at its dedicated screen",()=>{
  expect(getOnboardingRoute("product_templates")).toBe("/onboarding/product-templates");
  expect(getOnboardingRoute("product_import")).toBe("/onboarding/product-import");
 });
 it("preserves Phase 1 routes and completion",()=>{
  expect(getOnboardingRoute("business_category")).toBe("/onboarding/categories");
  expect(getOnboardingRoute("onboarding_complete")).toBe("/onboarding/complete");
 });
 it("requires permission and plan feature for multiple branches",()=>{
  expect(canCreateAdditionalBranch(member)).toBe(false);
  expect(canCreateAdditionalBranch({...member,features:[{key:"multi_branch",enabled:true,limit:null,usage:0}]})).toBe(true);
  expect(canCreateAdditionalBranch({...member,permissions:[]})).toBe(false);
 });
});
