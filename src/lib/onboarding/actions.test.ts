import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type Membership } from "@/lib/api/client";
const api = vi.hoisted(() => ({
  me: vi.fn(), createBusiness: vi.fn(), patchBusiness: vi.fn(), patchOnboarding: vi.fn(), replaceCategories: vi.fn(),
  getOnboarding: vi.fn(), listBranches: vi.fn(), createBranch: vi.fn(),
}));
vi.mock("@/lib/api/client", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/lib/api/client")>()), api }));
import { saveBusinessProfile, saveBusinessCategories, saveBranchSetup } from "./actions";
const member: Membership = { business_id:"b1", business_name:"Shop", role:"Owner", permissions:["branches.manage"], permission_scopes:{}, branch_ids:["main"], default_branch_id:"main", subscription_status:"trial", features:[{key:"multi_branch",enabled:false,limit:null,usage:0}], onboarding:{current_step:"business_profile",completed_steps:[],skipped_steps:[],status:"not_started"} };
describe("mocked onboarding integration", () => {
  beforeEach(() => { vi.clearAllMocks(); window.localStorage.clear(); api.me.mockResolvedValue({memberships:[member]}); api.patchOnboarding.mockResolvedValue({}); api.getOnboarding.mockResolvedValue({current_step:"business_category",completed_steps:["business_profile"],skipped_steps:[],status:"in_progress"}); api.listBranches.mockResolvedValue({items:[{id:"main",name:"Main Branch",code:"MAIN",address:null,is_active:true,is_default:true}],next_cursor:null}); });
  it("reuses the backend-created business instead of creating a duplicate on resume", async () => {
    const result = await saveBusinessProfile({name:"Shop"}, null);
    expect(result.businessId).toBe("b1"); expect(api.createBusiness).not.toHaveBeenCalled(); expect(api.patchBusiness).toHaveBeenCalledWith("b1",{name:"Shop"});
  });
  it("persists category UUIDs and advances the backend onboarding step", async () => {
    await saveBusinessCategories("b1",["category-1"]);
    expect(api.replaceCategories).toHaveBeenCalledWith("b1",["category-1"]);
    expect(api.patchOnboarding).toHaveBeenCalledWith("b1",expect.objectContaining({current_step:"branch_setup",completed_steps:expect.arrayContaining(["business_profile","business_category"])}));
  });
  it("blocks branch creation without the plan feature", async () => {
    await expect(saveBranchSetup("b1",member,[{id:1,name:"Outlet",code:"OUT",address:""}])).rejects.toMatchObject({code:"FEATURE_NOT_AVAILABLE",status:403});
    expect(api.createBranch).not.toHaveBeenCalled();
  });
  it("never creates a duplicate Main Branch and creates only new branch codes", async () => {
    const enabled={...member,features:[{key:"multi_branch",enabled:true,limit:null,usage:0}]};
    await saveBranchSetup("b1",enabled,[{id:1,name:"Duplicate main",code:"MAIN",address:""},{id:2,name:"Outlet",code:"OUT",address:""}]);
    expect(api.createBranch).toHaveBeenCalledTimes(1); expect(api.createBranch).toHaveBeenCalledWith("b1",{name:"Outlet",code:"OUT",address:null});
  });
});
