import { useEffect, useMemo, useState, type SubmitEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Circle,
  Code2,
  Languages,
  LoaderCircle,
  Palette,
  Search,
  UserRound,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";

import DeveloperProfileForm, {
  type DeveloperExperienceLevel,
  type DeveloperProfileFormData,
} from "../../../components/profileForms/DeveloperProfileForm";
import DesignerProfileForm, {
  type DesignerProfileFormData,
} from "../../../components/profileForms/DesignerProfileForm";
import TranslatorProfileForm, {
  type TranslatorProfileFormData,
} from "../../../components/profileForms/TranslatorProfileForm";
import VolunteerProfileForm, {
  type VolunteerProfileFormData,
} from "../../../components/profileForms/VolunteerProfileForm";
import InstitutionRepresentationForm, {
  type RepresentationDraft,
} from "../../../components/profileForms/InstitutionRepresentationForm";
import ModalMensagem from "../../../components/modalMensagem/ModalMensagem";
import { causeSelectionLabel } from "../../../data/profileCatalog";
import { useAuth } from "../../../contexts/auth-context";
import { ApiError } from "../../../services/api";
import {
  createMyCollaborationProfile,
  updateMyCollaborationProfile,
  type CollaborationProfile,
  type CollaborationProfileData,
  type CollaborationRole,
  type DeveloperProfileData,
  type DesignerProfileData,
  type TranslatorProfileData,
  type VolunteerProfileData,
} from "../../../services/collaborationProfileService";
import {
  completeOnboarding,
  type OnboardingRepresentation,
} from "../../../services/onboardingService";
import {
  cancelMyRepresentationRequest,
  createMyRepresentation,
  getMyRepresentations,
  requestMyRepresentation,
  searchRepresentationOrganizations,
  type MyRepresentation,
  type OrganizationSearchResult,
  type RepresentationStatus,
} from "../../../services/representationService";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import happyCong from "../../../assets/mascot/cong-happy.webp";
import styles from "./CompleteProfiles.module.css";

type WorkspaceKey =
  `role:${CollaborationRole}` | `representation:${OnboardingRepresentation}`;

type RepresentationMode = "choose" | "search" | "create";

type DeveloperDraft = {
  technologies: string[];
  experienceLevel: DeveloperExperienceLevel;
  portfolioUrl: string;
};

type PersonalDraftMap = {
  developer: DeveloperDraft;
  designer: DesignerProfileFormData;
  translator: TranslatorProfileFormData;
  volunteer: VolunteerProfileFormData;
};

const ROLE_LABELS: Record<CollaborationRole, string> = {
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradução e acessibilidade",
  volunteer: "Voluntário",
};

const ROLE_ICONS: Record<CollaborationRole, typeof Code2> = {
  developer: Code2,
  designer: Palette,
  translator: Languages,
  volunteer: UserRound,
};

const REPRESENTATION_LABELS: Record<OnboardingRepresentation, string> = {
  ngo: "ONG ou projeto social",
  company: "Empresa apoiadora",
};

const REPRESENTATION_ICONS: Record<OnboardingRepresentation, typeof Building2> =
  {
    ngo: Building2,
    company: BriefcaseBusiness,
  };

const EMPTY_REPRESENTATION: RepresentationDraft = {
  name: "",
  legalName: "",
  cnpj: "",
  email: "",
  phone: "",
  description: "",
  cep: "",
  street: "",
  district: "",
  number: "",
  complement: "",
  city: "",
  state: "",
  initiativeKind: "formal",
  areas: [],
  supportTypes: [],
};

function createEmptyRepresentationDraft(): RepresentationDraft {
  return {
    ...EMPTY_REPRESENTATION,
    areas: [],
    supportTypes: [],
  };
}

function roleKey(role: CollaborationRole): WorkspaceKey {
  return `role:${role}`;
}

function representationKey(
  representation: OnboardingRepresentation,
): WorkspaceKey {
  return `representation:${representation}`;
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function emptyDraft(
  role: CollaborationRole,
): PersonalDraftMap[CollaborationRole] {
  if (role === "developer") {
    return { technologies: [], experienceLevel: "", portfolioUrl: "" };
  }
  if (role === "designer") {
    return { specialties: [], tools: [], portfolioUrl: "" };
  }
  if (role === "translator") {
    return { languages: [], accessibilitySkills: [], notes: "" };
  }
  return {
    causes: [],
    interestAreas: [],
    availability: "",
    opportunityPreference: "both",
  };
}

function draftFromProfile(
  role: CollaborationRole,
  profileData: CollaborationProfileData | undefined,
): PersonalDraftMap[CollaborationRole] {
  if (!profileData) return emptyDraft(role);

  if (role === "developer") {
    const data = profileData as DeveloperProfileData;
    return {
      technologies: data.technologies ?? [],
      experienceLevel: data.experienceLevel ?? "",
      portfolioUrl: data.portfolioUrl ?? "",
    };
  }

  if (role === "designer") {
    const data = profileData as DesignerProfileData;
    return {
      specialties: data.specialties ?? [],
      tools: data.tools ?? [],
      portfolioUrl: data.portfolioUrl ?? "",
    };
  }

  if (role === "translator") {
    const data = profileData as TranslatorProfileData;
    return {
      languages: data.languages ?? [],
      accessibilitySkills: data.accessibilitySkills ?? [],
      notes: data.notes ?? "",
    };
  }

  const data = profileData as VolunteerProfileData;
  return {
    causes: data.causes ?? [],
    interestAreas: data.interestAreas ?? [],
    availability: data.availability ?? "",
    location: data.location,
    availabilityDetails: data.availabilityDetails,
    opportunityPreference: data.opportunityPreference ?? "both",
  };
}

function isProfileComplete(profile: CollaborationProfile): boolean {
  if (profile.role === "developer") {
    const data = profile.profileData as DeveloperProfileData;
    return (
      (data.technologies?.length ?? 0) > 0 && Boolean(data.experienceLevel)
    );
  }

  if (profile.role === "designer") {
    const data = profile.profileData as DesignerProfileData;
    return (data.specialties?.length ?? 0) > 0 && (data.tools?.length ?? 0) > 0;
  }

  if (profile.role === "translator") {
    const data = profile.profileData as TranslatorProfileData;
    return (
      (data.languages?.length ?? 0) + (data.accessibilitySkills?.length ?? 0) >
      0
    );
  }

  const data = profile.profileData as VolunteerProfileData;
  const availability = data.availabilityDetails;
  const availabilityComplete =
    availability?.frequency === "flexible" ||
    Boolean(
      availability &&
      availability.days.length > 0 &&
      availability.periods.length > 0 &&
      availability.frequency,
    );

  return (
    (data.interestAreas?.length ?? 0) > 0 &&
    (data.causes?.length ?? 0) > 0 &&
    Boolean(data.location?.state && data.location?.city) &&
    availabilityComplete
  );
}

function representationStatusLabel(
  status: RepresentationStatus | null,
): string {
  if (status === "active") return "Vínculo ativo";
  if (status === "pending") return "Solicitação enviada";
  return "Disponível";
}

function summarizeAreas(areas?: string[] | null): string | null {
  if (!areas || areas.length === 0) return null;
  return areas.slice(0, 4).map(causeSelectionLabel).join(" · ");
}

function toPersistedProfileData(
  role: CollaborationRole,
  draft: PersonalDraftMap[CollaborationRole],
): CollaborationProfileData {
  if (role === "developer") {
    const data = draft as DeveloperDraft;
    return {
      technologies: data.technologies,
      experienceLevel: data.experienceLevel || undefined,
      portfolioUrl: optionalText(data.portfolioUrl),
    };
  }
  if (role === "designer") {
    const data = draft as DesignerProfileFormData;
    return {
      specialties: data.specialties,
      tools: data.tools,
      portfolioUrl: optionalText(data.portfolioUrl),
    };
  }
  if (role === "translator") {
    const data = draft as TranslatorProfileFormData;
    return {
      languages: data.languages,
      accessibilitySkills: data.accessibilitySkills,
      notes: optionalText(data.notes),
    };
  }
  const data = draft as VolunteerProfileFormData;
  return {
    causes: data.causes,
    interestAreas: data.interestAreas,
    availability: optionalText(data.availability),
    location: data.location,
    availabilityDetails: data.availabilityDetails,
    opportunityPreference: data.opportunityPreference,
  };
}

export default function CompleteProfiles() {
  const {
    account,
    accountLoading,
    collaborationProfiles,
    collaborationProfilesLoading,
    refreshAccount,
    refreshCollaborationProfiles,
  } = useAuth();

  if (accountLoading && !account) {
    return (
      <main className={styles.loadingPage}>
        <LoaderCircle className={styles.spinner} aria-hidden="true" />
        <p>Preparando seus perfis...</p>
      </main>
    );
  }
  if (!account) return null;
  if (account.onboardingStep === "identity")
    return <Navigate to="/app/primeiro-acesso" replace />;
  if (account.onboardingStep === "roles")
    return <Navigate to="/app/escolher-funcao" replace />;
  if (account.onboardingStep === "completed")
    return <Navigate to="/app/comunidade" replace />;

  return (
    <CompleteProfilesWorkspace
      roles={account.onboardingRoles}
      representationTypes={account.onboardingRepresentations}
      collaborationProfiles={collaborationProfiles}
      collaborationProfilesLoading={collaborationProfilesLoading}
      refreshAccount={refreshAccount}
      refreshCollaborationProfiles={refreshCollaborationProfiles}
    />
  );
}

function CompleteProfilesWorkspace({
  roles,
  representationTypes,
  collaborationProfiles,
  collaborationProfilesLoading,
  refreshAccount,
  refreshCollaborationProfiles,
}: {
  roles: CollaborationRole[];
  representationTypes: OnboardingRepresentation[];
  collaborationProfiles: ReturnType<typeof useAuth>["collaborationProfiles"];
  collaborationProfilesLoading: boolean;
  refreshAccount: () => Promise<void>;
  refreshCollaborationProfiles: () => Promise<void>;
}) {
  const navigate = useNavigate();

  const workspaceKeys = useMemo<WorkspaceKey[]>(
    () => [
      ...roles.map(roleKey),
      ...representationTypes.map(representationKey),
    ],
    [roles, representationTypes],
  );

  const [activeKey, setActiveKey] = useState<WorkspaceKey>(
    () => workspaceKeys[0] ?? "role:volunteer",
  );
  const [personalDrafts, setPersonalDrafts] = useState<
    Partial<PersonalDraftMap>
  >({});
  const [representations, setRepresentations] = useState<MyRepresentation[]>(
    [],
  );
  const [representationsLoading, setRepresentationsLoading] = useState(true);
  const [representationMode, setRepresentationMode] =
    useState<RepresentationMode>("choose");
  const [representationDrafts, setRepresentationDrafts] = useState<
    Record<OnboardingRepresentation, RepresentationDraft>
  >(() => ({
    ngo: createEmptyRepresentationDraft(),
    company: createEmptyRepresentationDraft(),
  }));
  const [representationToCancel, setRepresentationToCancel] =
    useState<MyRepresentation | null>(null);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    OrganizationSearchResult[]
  >([]);
  const [lastSearchedQuery, setLastSearchedQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    void getMyRepresentations()
      .then((result) => {
        if (!cancelled) setRepresentations(result);
      })
      .catch((error) => {
        console.error("Não foi possível carregar as representações:", error);
        if (!cancelled)
          setErrorMessage(
            "Não foi possível carregar seus vínculos institucionais.",
          );
      })
      .finally(() => {
        if (!cancelled) setRepresentationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const completedRoles = useMemo(
    () =>
      new Set(
        collaborationProfiles
          .filter(isProfileComplete)
          .map((profile) => profile.role),
      ),
    [collaborationProfiles],
  );

  const completedRepresentations = useMemo(
    () =>
      new Set(
        representations
          .filter(
            (representation) =>
              representation.status === "active" ||
              representation.status === "pending",
          )
          .map((representation) => representation.organizationType),
      ),
    [representations],
  );

  const completedCount =
    roles.filter((role) => completedRoles.has(role)).length +
    representationTypes.filter((representation) =>
      completedRepresentations.has(representation),
    ).length;
  const totalCount = roles.length + representationTypes.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  const activeRole = activeKey.startsWith("role:")
    ? (activeKey.replace("role:", "") as CollaborationRole)
    : null;
  const activeRepresentation = activeKey.startsWith("representation:")
    ? (activeKey.replace("representation:", "") as OnboardingRepresentation)
    : null;

  const representationDraft = activeRepresentation
    ? representationDrafts[activeRepresentation]
    : createEmptyRepresentationDraft();

  const currentDraft = <R extends CollaborationRole>(
    role: R,
  ): PersonalDraftMap[R] => {
    const edited = personalDrafts[role] as PersonalDraftMap[R] | undefined;
    if (edited) return edited;
    const profile = collaborationProfiles.find((item) => item.role === role);
    return draftFromProfile(role, profile?.profileData) as PersonalDraftMap[R];
  };

  const setDraft = <R extends CollaborationRole>(
    role: R,
    value: PersonalDraftMap[R],
  ) => {
    setPersonalDrafts((current) => ({ ...current, [role]: value }));
    setErrorMessage("");
  };

  const moveToNext = (currentKey: WorkspaceKey) => {
    const next = workspaceKeys[workspaceKeys.indexOf(currentKey) + 1];
    if (next) setActiveKey(next);
  };

  const savePersonal = async <R extends CollaborationRole>(
    role: R,
    draft: PersonalDraftMap[R],
  ) => {
    if (saving) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const profileData = toPersistedProfileData(role, draft);
      const existing = collaborationProfiles.find(
        (profile) => profile.role === role,
      );
      if (existing)
        await updateMyCollaborationProfile(existing.id, profileData);
      else await createMyCollaborationProfile(role, profileData);
      setDraft(role, draft);
      await refreshCollaborationProfiles();
      moveToNext(roleKey(role));
    } catch (error) {
      console.error("Não foi possível salvar o perfil:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar esse perfil.",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateRepresentationDraft = <K extends keyof RepresentationDraft>(
    field: K,
    value: RepresentationDraft[K],
  ) => {
    if (!activeRepresentation) return;

    setRepresentationDrafts((current) => ({
      ...current,
      [activeRepresentation]: {
        ...current[activeRepresentation],
        [field]: value,
      },
    }));
    setErrorMessage("");
  };

  useEffect(() => {
    if (representationMode !== "search" || !activeRepresentation) return;

    const query = searchQuery.trim();
    if (query.length < 2) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setSearching(true);
      setErrorMessage("");

      void searchRepresentationOrganizations(activeRepresentation, query)
        .then((results) => {
          if (cancelled) return;
          setSearchResults(results);
          setLastSearchedQuery(query);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Não foi possível pesquisar instituições:", error);
          setSearchResults([]);
          setLastSearchedQuery(query);
          setErrorMessage("Não foi possível pesquisar instituições agora.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [representationMode, activeRepresentation, searchQuery]);

  const handleSearch = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeRepresentation || searchQuery.trim().length < 2) return;
    setSearching(true);
    setErrorMessage("");
    try {
      const query = searchQuery.trim();
      setSearchResults(
        await searchRepresentationOrganizations(activeRepresentation, query),
      );
      setLastSearchedQuery(query);
    } catch (error) {
      console.error("Não foi possível pesquisar instituições:", error);
      setSearchResults([]);
      setLastSearchedQuery(searchQuery.trim());
      setErrorMessage("Não foi possível pesquisar instituições agora.");
    } finally {
      setSearching(false);
    }
  };

  const handleRequest = async (organizationId: string) => {
    if (saving || !activeRepresentation) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const representation = await requestMyRepresentation(organizationId);
      setRepresentations((current) => [
        ...current.filter((item) => item.id !== representation.id),
        representation,
      ]);
      setRepresentationMode("choose");
      setSearchQuery("");
      setSearchResults([]);
      setLastSearchedQuery("");
      moveToNext(representationKey(activeRepresentation));
    } catch (error) {
      console.error("Não foi possível solicitar o vínculo:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível solicitar o vínculo.",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmCancelRepresentationRequest = async () => {
    const representation = representationToCancel;
    if (!representation || saving || representation.status !== "pending")
      return;

    setSaving(true);
    setErrorMessage("");

    try {
      await cancelMyRepresentationRequest(representation.id);
      setRepresentations((current) =>
        current.filter((item) => item.id !== representation.id),
      );
      setSearchResults((current) =>
        current.map((organization) =>
          organization.id === representation.organizationId
            ? { ...organization, membershipStatus: null }
            : organization,
        ),
      );
      setRepresentationMode("choose");
    } catch (error) {
      console.error(
        "Não foi possível cancelar a solicitação de vínculo:",
        error,
      );
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar essa solicitação agora.",
      );
    } finally {
      setSaving(false);
      setRepresentationToCancel(null);
    }
  };

  const handleCreateRepresentation = async () => {
    if (saving || !activeRepresentation) return;
    setSaving(true);
    setErrorMessage("");
    try {
      const representation = await createMyRepresentation({
        organizationType: activeRepresentation,
        name: representationDraft.name.trim(),
        legalName: optionalText(representationDraft.legalName),
        cnpj: optionalText(representationDraft.cnpj),
        email: representationDraft.email.trim(),
        phone: representationDraft.phone.trim(),
        description: representationDraft.description.trim(),
        cep: representationDraft.cep.trim(),
        street: representationDraft.street.trim(),
        district: representationDraft.district.trim(),
        number: representationDraft.number.trim(),
        complement: optionalText(representationDraft.complement),
        city: representationDraft.city.trim(),
        state: representationDraft.state.trim(),
        initiativeKind:
          activeRepresentation === "company"
            ? "formal"
            : representationDraft.initiativeKind,
        areas: representationDraft.areas,
        supportTypes:
          activeRepresentation === "company"
            ? representationDraft.supportTypes
            : [],
      });
      setRepresentations((current) => [
        ...current.filter((item) => item.id !== representation.id),
        representation,
      ]);
      setRepresentationDrafts((current) => ({
        ...current,
        [activeRepresentation]: createEmptyRepresentationDraft(),
      }));
      setRepresentationMode("choose");
      moveToNext(representationKey(activeRepresentation));
    } catch (error) {
      console.error("Não foi possível criar a instituição:", error);

      if (
        error instanceof ApiError &&
        error.code === "ORGANIZATION_CNPJ_ALREADY_EXISTS"
      ) {
        setErrorMessage(
          error.message ||
            "Esse CNPJ já está cadastrado. Procure a instituição existente e solicite o vínculo.",
        );
      } else {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Não foi possível cadastrar a instituição.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const completeAfterWelcome = async () => {
    if (!allCompleted || saving) return;
    setSaving(true);
    setErrorMessage("");
    try {
      await completeOnboarding();
      await refreshAccount();
      navigate("/app/comunidade", { replace: true });
    } catch (error) {
      console.error("Não foi possível concluir o primeiro acesso:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Ainda existem itens que precisam ser concluídos.",
      );
    } finally {
      setSaving(false);
    }
  };

  const activeRepresentationRecord = activeRepresentation
    ? representations.find(
        (item) =>
          item.organizationType === activeRepresentation &&
          (item.status === "active" || item.status === "pending"),
      )
    : undefined;

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <img src={logo} alt="CONG" className={styles.logo} />
        <button
          type="button"
          className={styles.backButton}
          onClick={() => navigate("/app/escolher-funcao")}
          disabled={saving}
        >
          <ArrowLeft aria-hidden="true" /> Rever escolhas
        </button>
      </header>

      <section className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Seu lugar no bando</span>
          <h1>
            Complete seus <span className={styles.titleAccent}>perfis</span>
          </h1>
          <p>
            Complete as informações essenciais para ativar suas formas de
            participação.
          </p>
        </div>

        <div className={styles.workspace}>
          <aside className={styles.sidebar}>
            <div className={styles.progressHeader}>
              <div className={styles.progressMeta}>
                <span>Progresso</span>
                <strong>
                  {completedCount} de {totalCount} concluídos
                </strong>
              </div>
              <div className={styles.progressTrack}>
                <span
                  style={{
                    width: totalCount
                      ? `${(completedCount / totalCount) * 100}%`
                      : "0%",
                  }}
                />
              </div>
            </div>

            {roles.length > 0 && (
              <nav className={styles.navGroup} aria-label="Seus perfis">
                <span className={styles.navLabel}>Seus perfis</span>
                {roles.map((role) => {
                  const Icon = ROLE_ICONS[role];
                  const completed = completedRoles.has(role);
                  const active = activeKey === roleKey(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                      onClick={() => {
                        setActiveKey(roleKey(role));
                        setErrorMessage("");
                      }}
                    >
                      <span className={styles.navIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className={styles.navCopy}>
                        <strong>{ROLE_LABELS[role]}</strong>
                        <small>
                          {completed
                            ? "Concluído"
                            : active
                              ? "Em edição"
                              : "Pendente"}
                        </small>
                      </span>
                      <span
                        className={`${styles.statusIcon} ${completed ? styles.statusDone : active ? styles.statusActive : ""}`}
                        aria-hidden="true"
                      >
                        {completed ? <Check /> : <Circle />}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            {representationTypes.length > 0 && (
              <nav className={styles.navGroup} aria-label="Representações">
                <span className={styles.navLabel}>Representações</span>
                {representationTypes.map((representation) => {
                  const Icon = REPRESENTATION_ICONS[representation];
                  const completed =
                    completedRepresentations.has(representation);
                  const active =
                    activeKey === representationKey(representation);
                  return (
                    <button
                      key={representation}
                      type="button"
                      className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                      onClick={() => {
                        setActiveKey(representationKey(representation));
                        setRepresentationMode("choose");
                        setSearchQuery("");
                        setSearchResults([]);
                        setErrorMessage("");
                      }}
                    >
                      <span className={styles.navIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span className={styles.navCopy}>
                        <strong>{REPRESENTATION_LABELS[representation]}</strong>
                        <small>
                          {completed
                            ? "Configurada"
                            : active
                              ? "Em edição"
                              : "Pendente"}
                        </small>
                      </span>
                      <span
                        className={`${styles.statusIcon} ${completed ? styles.statusDone : active ? styles.statusActive : ""}`}
                        aria-hidden="true"
                      >
                        {completed ? <Check /> : <Circle />}
                      </span>
                    </button>
                  );
                })}
              </nav>
            )}

            <button
              type="button"
              className={styles.finishButton}
              disabled={!allCompleted || saving}
              onClick={() => setWelcomeOpen(true)}
            >
              {saving && allCompleted ? (
                <LoaderCircle className={styles.spinner} aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              Finalizar perfis
            </button>
          </aside>

          <section className={styles.panel}>
            {errorMessage && (
              <div className={styles.error} role="alert">
                {errorMessage}
              </div>
            )}

            {activeRole === "developer" &&
              (() => {
                const draft = currentDraft("developer");
                return (
                  <DeveloperProfileForm
                    technologies={draft.technologies}
                    experienceLevel={draft.experienceLevel}
                    portfolioUrl={draft.portfolioUrl}
                    completed={completedRoles.has("developer")}
                    saving={saving || collaborationProfilesLoading}
                    onTechnologiesChange={(technologies) =>
                      setDraft("developer", { ...draft, technologies })
                    }
                    onExperienceLevelChange={(experienceLevel) =>
                      setDraft("developer", { ...draft, experienceLevel })
                    }
                    onPortfolioUrlChange={(portfolioUrl) =>
                      setDraft("developer", { ...draft, portfolioUrl })
                    }
                    onSubmit={(data: DeveloperProfileFormData) =>
                      savePersonal("developer", { ...data })
                    }
                  />
                );
              })()}

            {activeRole === "designer" &&
              (() => {
                const draft = currentDraft("designer");
                return (
                  <DesignerProfileForm
                    {...draft}
                    completed={completedRoles.has("designer")}
                    saving={saving || collaborationProfilesLoading}
                    onSpecialtiesChange={(specialties) =>
                      setDraft("designer", { ...draft, specialties })
                    }
                    onToolsChange={(tools) =>
                      setDraft("designer", { ...draft, tools })
                    }
                    onPortfolioUrlChange={(portfolioUrl) =>
                      setDraft("designer", { ...draft, portfolioUrl })
                    }
                    onSubmit={(data) => savePersonal("designer", data)}
                  />
                );
              })()}

            {activeRole === "translator" &&
              (() => {
                const draft = currentDraft("translator");
                return (
                  <TranslatorProfileForm
                    {...draft}
                    completed={completedRoles.has("translator")}
                    saving={saving || collaborationProfilesLoading}
                    onLanguagesChange={(languages) =>
                      setDraft("translator", { ...draft, languages })
                    }
                    onAccessibilitySkillsChange={(accessibilitySkills) =>
                      setDraft("translator", { ...draft, accessibilitySkills })
                    }
                    onNotesChange={(notes) =>
                      setDraft("translator", { ...draft, notes })
                    }
                    onSubmit={(data) => savePersonal("translator", data)}
                  />
                );
              })()}

            {activeRole === "volunteer" &&
              (() => {
                const draft = currentDraft("volunteer");
                return (
                  <VolunteerProfileForm
                    {...draft}
                    completed={completedRoles.has("volunteer")}
                    saving={saving || collaborationProfilesLoading}
                    onChange={(data) => setDraft("volunteer", data)}
                    onOpenParticipationChoices={() =>
                      navigate("/app/escolher-funcao")
                    }
                    onSubmit={(data) => savePersonal("volunteer", data)}
                  />
                );
              })()}

            {activeRepresentation && representationsLoading && (
              <div className={styles.loadingInline}>
                <LoaderCircle className={styles.spinner} aria-hidden="true" />
                Carregando vínculos...
              </div>
            )}

            {activeRepresentation && !representationsLoading && (
              <div className={styles.representationArea}>
                <div className={styles.representationHeading}>
                  <span className={styles.representationEyebrow}>
                    Representação
                  </span>
                  <h2>{REPRESENTATION_LABELS[activeRepresentation]}</h2>
                  <p>
                    {activeRepresentation === "ngo"
                      ? "Encontre uma iniciativa já cadastrada ou registre uma organização, coletivo ou ação."
                      : "Encontre sua empresa ou cadastre uma nova representação apoiadora."}
                  </p>
                </div>

                {activeRepresentationRecord ? (
                  <div className={styles.completedCard}>
                    <span className={styles.completedBadge}>
                      <Check aria-hidden="true" />
                    </span>
                    <div className={styles.completedCopy}>
                      <strong>
                        {activeRepresentationRecord.organizationName}
                      </strong>
                      <span>
                        {activeRepresentationRecord.status === "pending"
                          ? "Solicitação enviada. A instituição ainda precisa aprovar seu vínculo."
                          : "Você já está vinculado a esta instituição."}
                      </span>
                      <small className={styles.completedMeta}>
                        {activeRepresentationRecord.organizationType ===
                        "company"
                          ? "Empresa apoiadora"
                          : "ONG ou projeto social"}{" "}
                        · {activeRepresentationRecord.roleName}
                      </small>
                      {activeRepresentationRecord.status === "pending" && (
                        <button
                          type="button"
                          className={styles.cancelRequestButton}
                          disabled={saving}
                          onClick={() =>
                            setRepresentationToCancel(
                              activeRepresentationRecord,
                            )
                          }
                        >
                          Cancelar solicitação
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {representationMode === "choose" && (
                      <div className={styles.choiceGrid}>
                        <button
                          type="button"
                          className={styles.choiceCard}
                          onClick={() => setRepresentationMode("search")}
                        >
                          <span className={styles.choiceIcon}>
                            <Search aria-hidden="true" />
                          </span>
                          <strong>Encontrar uma instituição</strong>
                          <span>
                            Evite duplicidade: procure primeiro pelo cadastro já
                            existente.
                          </span>
                          <span className={styles.choiceAction}>
                            Procurar <ArrowRight aria-hidden="true" />
                          </span>
                        </button>
                        <button
                          type="button"
                          className={styles.choiceCard}
                          onClick={() => setRepresentationMode("create")}
                        >
                          <span className={styles.choiceIcon}>
                            <Building2 aria-hidden="true" />
                          </span>
                          <strong>
                            {activeRepresentation === "ngo"
                              ? "Cadastrar organização ou iniciativa"
                              : "Cadastrar empresa"}
                          </strong>
                          <span>
                            {activeRepresentation === "ngo"
                              ? "Inclui projetos sem CNPJ e ações pontuais."
                              : "Validação de CNPJ, CEP e UF assistida."}
                          </span>
                          <span className={styles.choiceAction}>
                            Cadastrar <ArrowRight aria-hidden="true" />
                          </span>
                        </button>
                      </div>
                    )}

                    {representationMode === "search" && (
                      <div className={styles.searchArea}>
                        <button
                          type="button"
                          className={styles.textButton}
                          onClick={() => setRepresentationMode("choose")}
                        >
                          <ArrowLeft aria-hidden="true" />
                          Voltar
                        </button>
                        <form
                          className={styles.searchForm}
                          onSubmit={handleSearch}
                        >
                          <label htmlFor="organization-search">
                            Nome da instituição
                          </label>
                          <div className={styles.searchRow}>
                            <input
                              id="organization-search"
                              value={searchQuery}
                              onChange={(event) => {
                                const nextQuery = event.target.value;
                                setSearchQuery(nextQuery);
                                setErrorMessage("");
                                if (nextQuery.trim().length < 2) {
                                  setSearchResults([]);
                                  setLastSearchedQuery("");
                                  setSearching(false);
                                }
                              }}
                              minLength={2}
                              placeholder={
                                activeRepresentation === "ngo"
                                  ? "Ex.: Alimento Para Todos"
                                  : "Ex.: Empresa apoiadora"
                              }
                            />
                            <button
                              type="submit"
                              disabled={
                                searching || searchQuery.trim().length < 2
                              }
                            >
                              {searching ? (
                                <LoaderCircle
                                  className={styles.spinner}
                                  aria-hidden="true"
                                />
                              ) : (
                                <Search aria-hidden="true" />
                              )}
                              Buscar
                            </button>
                          </div>
                        </form>
                        <div className={styles.searchResults}>
                          {searchResults.map((organization) => {
                            const locationText =
                              [organization.city, organization.state]
                                .filter(Boolean)
                                .join(", ") || "Localização não informada";
                            const areasText = summarizeAreas(
                              organization.areas,
                            );

                            return (
                              <article
                                key={organization.id}
                                className={styles.searchResult}
                              >
                                <div className={styles.searchResultCopy}>
                                  <div className={styles.searchResultHeader}>
                                    <strong>{organization.name}</strong>
                                    <span className={styles.searchResultStatus}>
                                      {representationStatusLabel(
                                        organization.membershipStatus,
                                      )}
                                    </span>
                                  </div>

                                  <span>{locationText}</span>
                                  {organization.legalName && (
                                    <span>
                                      Razão social: {organization.legalName}
                                    </span>
                                  )}
                                  {organization.cnpj && (
                                    <span>CNPJ: {organization.cnpj}</span>
                                  )}
                                  {organization.description && (
                                    <p
                                      className={styles.searchResultDescription}
                                    >
                                      {organization.description}
                                    </p>
                                  )}
                                  {areasText && (
                                    <small className={styles.searchResultMeta}>
                                      {areasText}
                                    </small>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  disabled={
                                    saving ||
                                    organization.membershipStatus ===
                                      "active" ||
                                    organization.membershipStatus === "pending"
                                  }
                                  onClick={() =>
                                    void handleRequest(organization.id)
                                  }
                                >
                                  {organization.membershipStatus === "active"
                                    ? "Já vinculado"
                                    : organization.membershipStatus ===
                                        "pending"
                                      ? "Solicitação enviada"
                                      : "Solicitar vínculo"}
                                </button>
                              </article>
                            );
                          })}
                        </div>
                        {!searching &&
                          searchQuery.trim().length >= 2 &&
                          lastSearchedQuery === searchQuery.trim() &&
                          searchResults.length === 0 && (
                            <p className={styles.emptyMessage}>
                              Nenhuma instituição encontrada. Você pode
                              cadastrá-la como nova.
                            </p>
                          )}
                      </div>
                    )}

                    {representationMode === "create" && (
                      <InstitutionRepresentationForm
                        type={activeRepresentation}
                        draft={representationDraft}
                        saving={saving}
                        onBack={() => setRepresentationMode("choose")}
                        onChange={updateRepresentationDraft}
                        onSubmit={handleCreateRepresentation}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        </div>

        <button
          type="button"
          className={styles.mobileFinishButton}
          disabled={!allCompleted || saving}
          onClick={() => setWelcomeOpen(true)}
        >
          {saving && allCompleted ? (
            <LoaderCircle className={styles.spinner} aria-hidden="true" />
          ) : (
            <Check aria-hidden="true" />
          )}
          Finalizar perfis
        </button>
      </section>

      <ModalMensagem
        aberto={Boolean(representationToCancel)}
        titulo="Cancelar solicitação de vínculo?"
        tamanho="pequeno"
        textoBotaoOk="Cancelar solicitação"
        mensagem={
          representationToCancel ? (
            <div className={styles.confirmationMessage}>
              <p>
                A solicitação para{" "}
                <strong>{representationToCancel.organizationName}</strong> ainda
                está pendente.
              </p>
              <p>
                Ao cancelar, você poderá procurar a instituição novamente ou
                enviar uma nova solicitação depois.
              </p>
            </div>
          ) : undefined
        }
        onOk={() => void confirmCancelRepresentationRequest()}
        onFechar={() => setRepresentationToCancel(null)}
      />

      <ModalMensagem
        aberto={welcomeOpen}
        titulo="Bem-vindo ao bando"
        tamanho="medio"
        textoBotaoOk="Entrar na CONG"
        fecharAoClicarFora={false}
        mensagem={
          <div className={styles.welcomeMessage}>
            <img src={happyCong} alt="Mascote Cong comemorando" />
            <div>
              <strong>A união faz a força.</strong>
              <p>
                Seus perfis estão prontos. A CONG vai usar essas informações
                para aproximar você de pessoas, causas e oportunidades que
                combinam com a sua forma de participar.
              </p>
            </div>
          </div>
        }
        onOk={() => void completeAfterWelcome()}
        onFechar={() => setWelcomeOpen(false)}
      />
    </main>
  );
}
