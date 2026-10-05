import { createContext, useContext } from "react";

import type { CollaborationProfile } from "../services/collaborationProfileService";
import type { AccessibleOrganization } from "../services/organizationService";

export type ActiveWorkspace =
  | {
      kind: "personal";
    }
  | {
      kind: "collaboration";
      profile: CollaborationProfile;
    }
  | {
      kind: "organization";
      organization: AccessibleOrganization;
    };

export interface WorkspaceContextValue {
  workspace: ActiveWorkspace;
  switchingWorkspace: boolean;
  selectPersonalWorkspace: () => Promise<void>;
  selectCollaborationWorkspace: (profile: CollaborationProfile) => Promise<void>;
  selectOrganizationWorkspace: (organization: AccessibleOrganization) => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);

  if (!context) {
    throw new Error("useWorkspace precisa ser utilizado dentro de WorkspaceProvider.");
  }

  return context;
}
