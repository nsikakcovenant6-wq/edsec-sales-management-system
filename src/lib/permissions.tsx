import { createContext, useContext, type ReactNode } from "react";

const PermissionContext = createContext<ReadonlySet<string>>(new Set());

type PermissionProviderProps = {
  permissions: readonly string[];
  children: ReactNode;
};

/** Generic permission boundary. Permission identifiers must come from the approved backend contract. */
export function PermissionProvider({ permissions, children }: PermissionProviderProps) {
  return (
    <PermissionContext.Provider value={new Set(permissions)}>
      {children}
    </PermissionContext.Provider>
  );
}

export function useCan(permission: string): boolean {
  return useContext(PermissionContext).has(permission);
}

type CanProps = {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
};

export function Can({ permission, children, fallback = null }: CanProps) {
  return useCan(permission) ? children : fallback;
}
