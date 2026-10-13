import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/auth-context";
import { useOrganization } from "../contexts/organization-context";
import { useWorkspace } from "../contexts/workspace-context";
import type { CollaborationRole } from "../services/collaborationProfileService";

export default function WorkspaceRoute({
  children,
  kind,
  collaborationRole,
  organizationType,
}: {
  children: ReactNode;
  kind: "collaboration" | "organization";
  collaborationRole?: CollaborationRole;
  organizationType?: "ngo" | "company";
}) {
  const { workspace, switchingWorkspace } = useWorkspace();
  const { collaborationProfilesLoading } = useAuth();
  const { loadingOrganizations } = useOrganization();

  const hydratingWorkspace =
    switchingWorkspace ||
    (kind === "organization" && loadingOrganizations) ||
    (kind === "collaboration" && collaborationProfilesLoading);

  if (hydratingWorkspace) {
    return null;
  }

  if (workspace.kind !== kind) {
    return <Navigate to="/app/comunidade" replace />;
  }

  if (
    workspace.kind === "collaboration" &&
    collaborationRole &&
    workspace.profile.role !== collaborationRole
  ) {
    return <Navigate to="/app/comunidade" replace />;
  }

  if (
    workspace.kind === "organization" &&
    organizationType &&
    workspace.organization.organizationType !== organizationType
  ) {
    return <Navigate to="/app/comunidade" replace />;
  }

  return children;
}
