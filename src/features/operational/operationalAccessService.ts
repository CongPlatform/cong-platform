import { apiTenantGet, apiTenantPost, apiTenantPatch, apiTenantDelete } from "../../services/api";

export interface JoinRequest {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}
export interface AccessPerson {
  id: string;
  name: string;
  email: string;
  protected: boolean;
}
export interface AccessRole {
  id: string;
  name: string;
  canRead: boolean;
  canWrite: boolean;
  canConfigure: boolean;
  presetCode: string | null;
}
export interface AccessGrant {
  userId: string;
  roleId: string;
  modules: Record<string, "none" | "read" | "write">;
}
export interface AccessModule {
  id: string;
  name: string;
  blueprintKey: string;
}
export interface AccessOverview {
  roles: AccessRole[];
  people: AccessPerson[];
  grants: AccessGrant[];
  modules: AccessModule[];
}
export interface MyAccess {
  owner: boolean;
  canConfigure: boolean;
  canWrite: boolean;
  visibleModuleIds: string[] | null;
  hasHiddenAreas: boolean;
  modulePermissions: Record<string, "none" | "read" | "write">;
}
export const myOperationalAccess = (systemId: string) =>
  apiTenantGet<MyAccess>(`/operational/systems/${systemId}/access/me`);
export const pendingJoinRequests = async () =>
  (await apiTenantGet<{ requests: JoinRequest[] }>("/organizations/current/join-requests"))
    .requests;
export const reviewJoinRequest = (id: string, approved: boolean) =>
  apiTenantPost<void>(`/organizations/current/join-requests/${id}/decision`, { approved });
export const systemAccessOverview = (systemId: string) =>
  apiTenantGet<AccessOverview>(`/operational/systems/${systemId}/access`);
export const addAccessRole = (
  systemId: string,
  details: { name: string; canRead: boolean; canWrite: boolean; canConfigure: boolean },
) => apiTenantPost(`/operational/systems/${systemId}/access/roles`, details);
export const setSystemGrant = (systemId: string, userId: string, roleId: string) =>
  apiTenantPatch<void>(`/operational/systems/${systemId}/access/grants`, { userId, roleId });
export const revokeSystemGrant = (systemId: string, userId: string) =>
  apiTenantDelete<void>(`/operational/systems/${systemId}/access/grants/${userId}`);
export const changeModuleGrant = (
  systemId: string,
  userId: string,
  moduleId: string,
  level: "inherit" | "none" | "read" | "write",
) =>
  apiTenantPatch<void>(`/operational/systems/${systemId}/access/modules`, {
    userId,
    moduleId,
    level,
  });
