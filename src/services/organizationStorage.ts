const ACTIVE_ORGANIZATION_STORAGE_KEY = "cong.activeOrganizationId";

export function getStoredActiveOrganizationId(): string | null {
  return localStorage.getItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}

export function storeActiveOrganizationId(organizationId: string): void {
  localStorage.setItem(ACTIVE_ORGANIZATION_STORAGE_KEY, organizationId);
}

export function clearStoredActiveOrganizationId(): void {
  localStorage.removeItem(ACTIVE_ORGANIZATION_STORAGE_KEY);
}
