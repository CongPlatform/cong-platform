import { createContext, useContext } from "react";

import type { AccessibleOrganization } from "../services/organizationService";

export interface OrganizationContextValue {
  organizations: AccessibleOrganization[];
  activeOrganization: AccessibleOrganization | null;
  loadingOrganizations: boolean;
  setActiveOrganization: (organization: AccessibleOrganization | null) => void;
  refreshOrganizations: () => Promise<void>;
}

export const OrganizationContext =
  createContext<OrganizationContextValue | null>(null);

export function useOrganization(): OrganizationContextValue {
  const context = useContext(OrganizationContext);

  if (!context) {
    throw new Error("useOrganization must be used inside OrganizationProvider");
  }

  return context;
}
