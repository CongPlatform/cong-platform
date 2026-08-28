import {
  apiGet,
  apiPost,
  apiRequest,
} from "./api";
import type {
  OnboardingRepresentation,
} from "./onboardingService";

export type RepresentationStatus =
  | "pending"
  | "active"
  | "suspended";

export interface MyRepresentation {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationType: OnboardingRepresentation;
  status: RepresentationStatus;
  roleCode: string | null;
  roleName: string;
}

export interface OrganizationSearchResult {
  id: string;
  name: string;
  organizationType: OnboardingRepresentation;
  city: string | null;
  state: string | null;
  description?: string | null;
  legalName?: string | null;
  cnpj?: string | null;
  areas?: string[] | null;
  initiativeKind?: InitiativeKind | null;
  membershipStatus: RepresentationStatus | null;
}

export type InitiativeKind = "formal" | "independent" | "punctual";

export interface CnpjAvailabilityResult {
  available: boolean;
  organization: {
    id: string;
    name: string;
    organizationType: OnboardingRepresentation;
  } | null;
}

export interface CreateRepresentationInput {
  organizationType: OnboardingRepresentation;
  name: string;
  legalName?: string;
  cnpj?: string;
  email: string;
  phone: string;
  description: string;
  cep: string;
  street: string;
  district: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  initiativeKind: InitiativeKind;
  areas: string[];
  supportTypes: string[];
}

interface RepresentationsResponse {
  representations: MyRepresentation[];
}

interface SearchResponse {
  organizations: OrganizationSearchResult[];
}

interface RepresentationResponse {
  representation: MyRepresentation;
}

export async function getMyRepresentations(): Promise<MyRepresentation[]> {
  const response = await apiGet<RepresentationsResponse>(
    "/account/me/representations",
  );
  return response.representations;
}

export async function searchRepresentationOrganizations(
  type: OnboardingRepresentation,
  query: string,
): Promise<OrganizationSearchResult[]> {
  const response = await apiGet<SearchResponse>(
    `/account/me/representations/search?type=${encodeURIComponent(
      type,
    )}&q=${encodeURIComponent(query)}`,
  );
  return response.organizations;
}

export async function checkRepresentationCnpj(
  cnpj: string,
): Promise<CnpjAvailabilityResult> {
  return apiGet<CnpjAvailabilityResult>(
    `/account/me/representations/check-cnpj?cnpj=${encodeURIComponent(cnpj)}`,
  );
}

export async function createMyRepresentation(
  input: CreateRepresentationInput,
): Promise<MyRepresentation> {
  const response = await apiPost<RepresentationResponse>(
    "/account/me/representations",
    input,
  );
  return response.representation;
}

export async function requestMyRepresentation(
  organizationId: string,
): Promise<MyRepresentation> {
  const response = await apiPost<RepresentationResponse>(
    "/account/me/representations/request",
    { organizationId },
  );
  return response.representation;
}


export async function cancelMyRepresentationRequest(
  representationId: string,
): Promise<void> {
  await apiRequest<void>(
    `/account/me/representations/request/${encodeURIComponent(representationId)}`,
    {
      method: "DELETE",
    },
  );
}
