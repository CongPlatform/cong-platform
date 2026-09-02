import { apiGet, apiTenantGet } from "./api";

export interface OrganizationRole {
  id: string;
  code: string;
  name: string;
}

export interface AccessibleOrganization {
  id: string;
  name: string;
  organizationType: "ngo" | "company";
  membershipId: string;
  role: OrganizationRole;
}

interface OrganizationsResponse {
  organizations: AccessibleOrganization[];
}

export interface ActiveOrganizationContext {
  organizationId: string;
  organizationName: string;
  organizationType: "ngo" | "company";
  membershipId: string;
  roleId: string;
  roleCode: string;
  roleName: string;
}

interface CurrentOrganizationResponse {
  organization: ActiveOrganizationContext;
}

export async function getActiveOrganizationContext(): Promise<ActiveOrganizationContext> {
  const response = await apiTenantGet<CurrentOrganizationResponse>(
    "/organizations/current",
  );

  return response.organization;
}

export async function getAccessibleOrganizations(): Promise<
  AccessibleOrganization[]
> {
  const response = await apiGet<OrganizationsResponse>("/organizations");

  return response.organizations;
}
