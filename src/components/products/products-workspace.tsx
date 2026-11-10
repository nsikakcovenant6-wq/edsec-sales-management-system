"use client";
import {ProductTemplatesWorkspace} from "./product-templates-workspace";
import {ProductImportWorkspace} from "./product-import-workspace";
export function ProductsWorkspace({mode}:{mode:"catalogue"|"import"}){return mode==="import"?<ProductImportWorkspace/>:<ProductTemplatesWorkspace/>;}
