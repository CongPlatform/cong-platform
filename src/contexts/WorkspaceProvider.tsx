import { useCallback, useMemo, useState, type ReactNode } from "react";

import { useAuth } from "./auth-context";
import { useOrganization } from "./organization-context";
import { WorkspaceContext, type ActiveWorkspace } from "./workspace-context";
import type { CollaborationProfile } from "../services/collaborationProfileService";
import type { AccessibleOrganization } from "../services/organizationService";

function resolveWorkspace(
  activeProfile: CollaborationProfile | null,
  activeOrganization: AccessibleOrganization | null,
): ActiveWorkspace {
  if (activeProfile) {
    return { kind: "collaboration", profile: activeProfile };
  }

  if (activeOrganization) {
    return { kind: "organization", organization: activeOrganization };
  }

  return { kind: "personal" };
}

export default function WorkspaceProvider({ children }: { children: ReactNode }) {
  const {
    activeCollaborationProfile,
    activateCollaborationProfile,
    deactivateCollaborationProfile,
  } = useAuth();
  const { activeOrganization, setActiveOrganization } = useOrganization();
  const [switchingWorkspace, setSwitchingWorkspace] = useState(false);

  const workspace = useMemo(
    () => resolveWorkspace(activeCollaborationProfile, activeOrganization),
    [activeCollaborationProfile, activeOrganization],
  );

  const selectPersonalWorkspace = useCallback(async (): Promise<void> => {
    setSwitchingWorkspace(true);

    try {
      if (activeCollaborationProfile) {
        await deactivateCollaborationProfile();
      }
      setActiveOrganization(null);
    } finally {
      setSwitchingWorkspace(false);
    }
  }, [activeCollaborationProfile, deactivateCollaborationProfile, setActiveOrganization]);

  const selectCollaborationWorkspace = useCallback(
    async (profile: CollaborationProfile): Promise<void> => {
      setSwitchingWorkspace(true);

      try {
        setActiveOrganization(null);
        if (!profile.isActive) {
          await activateCollaborationProfile(profile.id);
        }
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [activateCollaborationProfile, setActiveOrganization],
  );

  const selectOrganizationWorkspace = useCallback(
    async (organization: AccessibleOrganization): Promise<void> => {
      setSwitchingWorkspace(true);

      try {
        if (activeCollaborationProfile) {
          await deactivateCollaborationProfile();
        }
        setActiveOrganization(organization);
      } finally {
        setSwitchingWorkspace(false);
      }
    },
    [activeCollaborationProfile, deactivateCollaborationProfile, setActiveOrganization],
  );

  const value = useMemo(
    () => ({
      workspace,
      switchingWorkspace,
      selectPersonalWorkspace,
      selectCollaborationWorkspace,
      selectOrganizationWorkspace,
    }),
    [
      workspace,
      switchingWorkspace,
      selectPersonalWorkspace,
      selectCollaborationWorkspace,
      selectOrganizationWorkspace,
    ],
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}
