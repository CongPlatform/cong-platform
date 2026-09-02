import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getAccessibleOrganizations,
  type AccessibleOrganization,
} from "../services/organizationService";

import {
  clearStoredActiveOrganizationId,
  getStoredActiveOrganizationId,
  storeActiveOrganizationId,
} from "../services/organizationStorage";

import { OrganizationContext } from "./organization-context";

function resolveActiveOrganization(
  organizations: AccessibleOrganization[],
): AccessibleOrganization | null {
  if (organizations.length === 0) {
    return null;
  }

  const storedOrganizationId = getStoredActiveOrganizationId();

  const storedOrganization =
    organizations.find(
      (organization) => organization.id === storedOrganizationId,
    ) ?? null;

  return storedOrganization ?? organizations[0];
}

export default function OrganizationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [organizations, setOrganizations] = useState<AccessibleOrganization[]>(
    [],
  );

  const [activeOrganization, setActiveOrganizationState] =
    useState<AccessibleOrganization | null>(null);

  const [loadingOrganizations, setLoadingOrganizations] = useState(true);

  const applyOrganizations = useCallback(
    (accessibleOrganizations: AccessibleOrganization[]): void => {
      const nextActiveOrganization = resolveActiveOrganization(
        accessibleOrganizations,
      );

      setOrganizations(accessibleOrganizations);
      setActiveOrganizationState(nextActiveOrganization);

      if (nextActiveOrganization) {
        storeActiveOrganizationId(nextActiveOrganization.id);
      } else {
        clearStoredActiveOrganizationId();
      }
    },
    [],
  );

  const refreshOrganizations = useCallback(async (): Promise<void> => {
    setLoadingOrganizations(true);

    try {
      const accessibleOrganizations = await getAccessibleOrganizations();

      applyOrganizations(accessibleOrganizations);
    } finally {
      setLoadingOrganizations(false);
    }
  }, [applyOrganizations]);

  useEffect(() => {
    let cancelled = false;

    void getAccessibleOrganizations()
      .then((accessibleOrganizations) => {
        if (cancelled) {
          return;
        }

        applyOrganizations(accessibleOrganizations);
      })
      .catch((error) => {
        if (cancelled) {
          return;
        }

        console.error(
          "Não foi possível carregar as organizações acessíveis:",
          error,
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOrganizations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyOrganizations]);

  const setActiveOrganization = useCallback(
    (organization: AccessibleOrganization | null): void => {
      setActiveOrganizationState(organization);

      if (organization) {
        storeActiveOrganizationId(organization.id);
      } else {
        clearStoredActiveOrganizationId();
      }
    },
    [],
  );

  const value = useMemo(
    () => ({
      organizations,
      activeOrganization,
      loadingOrganizations,
      setActiveOrganization,
      refreshOrganizations,
    }),
    [
      organizations,
      activeOrganization,
      loadingOrganizations,
      setActiveOrganization,
      refreshOrganizations,
    ],
  );

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
}
