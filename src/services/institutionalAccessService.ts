import { apiRequest, apiTenantGet } from "./api";

export type SiteAccessLevel = "none" | "viewer" | "editor" | "publisher";

export interface SiteAccessPerson {
  id: string;
  name: string;
  email: string;
  roleName: string;
  roleCode: string;
  level: SiteAccessLevel;
  roleHasSiteAccess: boolean;
}

export async function listSiteAccessPeople(): Promise<SiteAccessPerson[]> {
  const response = await apiTenantGet<{ people: SiteAccessPerson[] }>("/institutional/site-access/people");
  return response.people;
}

export async function setSiteAccessPerson(userId: string, level: SiteAccessLevel): Promise<void> {
  await apiRequest<void>(`/institutional/site-access/people/${encodeURIComponent(userId)}`, {
    method: "PUT",
    body: JSON.stringify({ level }),
    organizationScoped: true,
  });
}
