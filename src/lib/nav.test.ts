import {describe,expect,it} from "vitest";
import {getNavigationTitle,navigationItems} from "./nav";
describe("workspace navigation",()=>{
 it("provides unique local destinations",()=>{const paths=navigationItems.map(x=>x.href);expect(new Set(paths).size).toBe(paths.length);});
 it("resolves nested import route to Products",()=>expect(getNavigationTitle("/products/import")).toBe("Bulk import"));
 it("falls back for an unknown path",()=>expect(getNavigationTitle("/not-a-module")).toBe("Workspace"));
});
