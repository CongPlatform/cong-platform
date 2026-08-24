import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

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

import { useAuth } from "../../../contexts/auth-context";

import {
  createMyCollaborationProfile,
  updateMyCollaborationProfile,
  type CollaborationProfileData,
  type CollaborationRole,
} from "../../../services/collaborationProfileService";

import {
  completeOnboarding,
  type OnboardingRepresentation,
} from "../../../services/onboardingService";

import {
  createMyRepresentation,
  getMyRepresentations,
  requestMyRepresentation,
  searchRepresentationOrganizations,
  type MyRepresentation,
  type OrganizationSearchResult,
} from "../../../services/representationService";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import muscularCong from "../../../assets/mascot/cong-muscular-medalist.webp";

import styles from "./CompleteProfiles.module.css";

type PersonalDraft = {
  technologies: string;
  experienceLevel: string;
  portfolioUrl: string;

  specialties: string;
  tools: string;

  languages: string;
  notes: string;

  interestAreas: string;
  availability: string;
};

type RepresentationDraft = {
  name: string;
  legalName: string;
  cnpj: string;
  email: string;
  phone: string;
  description: string;
  city: string;
  state: string;
};

type WorkspaceKey =
  | `role:${CollaborationRole}`
  | `representation:${OnboardingRepresentation}`;

type RepresentationMode = "choose" | "search" | "create";

const ROLE_LABELS: Record<CollaborationRole, string> = {
  developer: "Desenvolvedor",
  designer: "Designer",
  translator: "Tradutor",
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

const initialPersonalDraft: PersonalDraft = {
  technologies: "",
  experienceLevel: "",
  portfolioUrl: "",

  specialties: "",
  tools: "",

  languages: "",
  notes: "",

  interestAreas: "",
  availability: "",
};

const initialRepresentationDraft: RepresentationDraft = {
  name: "",
  legalName: "",
  cnpj: "",
  email: "",
  phone: "",
  description: "",
  city: "",
  state: "",
};

function toList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();

  return normalized || undefined;
}

function roleKey(role: CollaborationRole): WorkspaceKey {
  return `role:${role}`;
}

function representationKey(
  representation: OnboardingRepresentation,
): WorkspaceKey {
  return `representation:${representation}`;
}

function buildProfileData(
  role: CollaborationRole,
  draft: PersonalDraft,
): CollaborationProfileData {
  switch (role) {
    case "developer":
      return {
        technologies: toList(draft.technologies),

        experienceLevel:
          draft.experienceLevel === "beginner" ||
          draft.experienceLevel === "intermediate" ||
          draft.experienceLevel === "advanced"
            ? draft.experienceLevel
            : undefined,

        portfolioUrl: optionalText(draft.portfolioUrl),
      };

    case "designer":
      return {
        specialties: toList(draft.specialties),

        tools: toList(draft.tools),

        portfolioUrl: optionalText(draft.portfolioUrl),
      };

    case "translator":
      return {
        languages: toList(draft.languages),

        notes: optionalText(draft.notes),
      };

    case "volunteer":
      return {
        interestAreas: toList(draft.interestAreas),

        availability: optionalText(draft.availability),
      };
  }
}

function personalDraftFromProfile(
  role: CollaborationRole,
  profileData: CollaborationProfileData,
): PersonalDraft {
  const draft = {
    ...initialPersonalDraft,
  };

  if (role === "developer") {
    const data = profileData as {
      technologies?: string[];
      experienceLevel?: string;
      portfolioUrl?: string;
    };

    draft.technologies = data.technologies?.join(", ") ?? "";

    draft.experienceLevel = data.experienceLevel ?? "";

    draft.portfolioUrl = data.portfolioUrl ?? "";
  }

  if (role === "designer") {
    const data = profileData as {
      specialties?: string[];
      tools?: string[];
      portfolioUrl?: string;
    };

    draft.specialties = data.specialties?.join(", ") ?? "";

    draft.tools = data.tools?.join(", ") ?? "";

    draft.portfolioUrl = data.portfolioUrl ?? "";
  }

  if (role === "translator") {
    const data = profileData as {
      languages?: string[];
      notes?: string;
    };

    draft.languages = data.languages?.join(", ") ?? "";

    draft.notes = data.notes ?? "";
  }

  if (role === "volunteer") {
    const data = profileData as {
      interestAreas?: string[];
      availability?: string;
    };

    draft.interestAreas = data.interestAreas?.join(", ") ?? "";

    draft.availability = data.availability ?? "";
  }

  return draft;
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

  if (!account) {
    return null;
  }

  if (account.onboardingStep === "identity") {
    return <Navigate to="/app/primeiro-acesso" replace />;
  }

  if (account.onboardingStep === "roles") {
    return <Navigate to="/app/escolher-funcao" replace />;
  }

  if (account.onboardingStep === "completed") {
    return <Navigate to="/app/comunidade" replace />;
  }

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
    Partial<Record<CollaborationRole, PersonalDraft>>
  >(() => {
    const initial: Partial<Record<CollaborationRole, PersonalDraft>> = {};

    for (const role of roles) {
      const existing = collaborationProfiles.find(
        (profile) => profile.role === role,
      );

      initial[role] = existing
        ? personalDraftFromProfile(role, existing.profileData)
        : {
            ...initialPersonalDraft,
          };
    }

    return initial;
  });

  const [representations, setRepresentations] = useState<MyRepresentation[]>(
    [],
  );

  const [representationsLoading, setRepresentationsLoading] = useState(true);

  const [representationMode, setRepresentationMode] =
    useState<RepresentationMode>("choose");

  const [representationDraft, setRepresentationDraft] =
    useState<RepresentationDraft>({
      ...initialRepresentationDraft,
    });

  const [searchQuery, setSearchQuery] = useState("");

  const [searchResults, setSearchResults] = useState<
    OrganizationSearchResult[]
  >([]);

  const [searching, setSearching] = useState(false);

  const [saving, setSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    void getMyRepresentations()
      .then((result) => {
        if (!cancelled) {
          setRepresentations(result);
        }
      })
      .catch((error) => {
        console.error("Não foi possível carregar as representações:", error);

        if (!cancelled) {
          setErrorMessage(
            "Não foi possível carregar seus vínculos institucionais.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRepresentationsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const completedRoles = useMemo(
    () => new Set(collaborationProfiles.map((profile) => profile.role)),
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

  const moveToNext = (currentKey: WorkspaceKey) => {
    const index = workspaceKeys.indexOf(currentKey);

    const next = workspaceKeys[index + 1];

    if (next) {
      setActiveKey(next);
    }
  };

  const updatePersonalDraft = (
    role: CollaborationRole,
    field: keyof PersonalDraft,
    value: string,
  ) => {
    setPersonalDrafts((current) => ({
      ...current,

      [role]: {
        ...(current[role] ?? initialPersonalDraft),

        [field]: value,
      },
    }));

    setErrorMessage("");
  };

  const updateRepresentationDraft = (
    field: keyof RepresentationDraft,
    value: string,
  ) => {
    setRepresentationDraft((current) => ({
      ...current,
      [field]: value,
    }));

    setErrorMessage("");
  };

  const handleSavePersonal = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeRole || saving) {
      return;
    }

    const draft = personalDrafts[activeRole] ?? initialPersonalDraft;

    setSaving(true);
    setErrorMessage("");

    try {
      const profileData = buildProfileData(activeRole, draft);

      const existing = collaborationProfiles.find(
        (profile) => profile.role === activeRole,
      );

      if (existing) {
        await updateMyCollaborationProfile(existing.id, profileData);
      } else {
        await createMyCollaborationProfile(activeRole, profileData);
      }

      await refreshCollaborationProfiles();

      moveToNext(roleKey(activeRole));
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

  const handleSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeRepresentation || searchQuery.trim().length < 2) {
      return;
    }

    setSearching(true);
    setErrorMessage("");

    try {
      const result = await searchRepresentationOrganizations(
        activeRepresentation,
        searchQuery,
      );

      setSearchResults(result);
    } catch (error) {
      console.error("Não foi possível pesquisar instituições:", error);

      setErrorMessage("Não foi possível pesquisar instituições agora.");
    } finally {
      setSearching(false);
    }
  };

  const handleRequest = async (organizationId: string) => {
    if (saving || !activeRepresentation) {
      return;
    }

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

  const handleCreateRepresentation = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!activeRepresentation || saving) {
      return;
    }

    if (representationDraft.name.trim().length < 2) {
      setErrorMessage("Informe o nome da instituição.");

      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      const representation = await createMyRepresentation({
        organizationType: activeRepresentation,

        name: representationDraft.name.trim(),

        legalName: optionalText(representationDraft.legalName),

        cnpj: optionalText(representationDraft.cnpj),

        email: optionalText(representationDraft.email),

        phone: optionalText(representationDraft.phone),

        description: optionalText(representationDraft.description),

        city: optionalText(representationDraft.city),

        state: optionalText(representationDraft.state),
      });

      setRepresentations((current) => [
        ...current.filter((item) => item.id !== representation.id),

        representation,
      ]);

      setRepresentationDraft({
        ...initialRepresentationDraft,
      });

      setRepresentationMode("choose");

      moveToNext(representationKey(activeRepresentation));
    } catch (error) {
      console.error("Não foi possível criar a instituição:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar a instituição.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    if (!allCompleted || saving) {
      return;
    }

    setSaving(true);
    setErrorMessage("");

    try {
      await completeOnboarding();

      await refreshAccount();

      navigate("/app/comunidade", {
        replace: true,
      });
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
          <ArrowLeft aria-hidden="true" />
          Rever escolhas
        </button>
      </header>

      <section className={styles.content}>
        <div className={styles.hero}>
          <span className={styles.eyebrow}>Seu lugar no bando</span>

          <h1>
            Complete seus <span className={styles.titleAccent}>perfis</span>
          </h1>

          <p>
            Falta pouco. Complete as informações necessárias para ativar as
            formas de participação que você escolheu.
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
                    width:
                      totalCount === 0
                        ? "0%"
                        : `${(completedCount / totalCount) * 100}%`,
                  }}
                />
              </div>
            </div>

            {roles.length > 0 && (
              <div className={styles.navGroup}>
                <span className={styles.navLabel}>Seus perfis</span>

                {roles.map((role) => {
                  const Icon = ROLE_ICONS[role];

                  const completed = completedRoles.has(role);

                  const key = roleKey(role);

                  const active = activeKey === key;

                  return (
                    <button
                      key={role}
                      type="button"
                      className={`${styles.navItem} ${
                        active ? styles.navItemActive : ""
                      }`}
                      onClick={() => {
                        setActiveKey(key);
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
                        className={`${styles.statusIcon} ${
                          completed
                            ? styles.statusDone
                            : active
                              ? styles.statusActive
                              : ""
                        }`}
                        aria-hidden="true"
                      >
                        {completed ? <Check /> : <Circle />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {representationTypes.length > 0 && (
              <div className={styles.navGroup}>
                <span className={styles.navLabel}>Representações</span>

                {representationTypes.map((representation) => {
                  const Icon = REPRESENTATION_ICONS[representation];

                  const completed =
                    completedRepresentations.has(representation);

                  const key = representationKey(representation);

                  const active = activeKey === key;

                  return (
                    <button
                      key={representation}
                      type="button"
                      className={`${styles.navItem} ${
                        active ? styles.navItemActive : ""
                      }`}
                      onClick={() => {
                        setActiveKey(key);

                        setRepresentationMode("choose");

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
                        className={`${styles.statusIcon} ${
                          completed
                            ? styles.statusDone
                            : active
                              ? styles.statusActive
                              : ""
                        }`}
                        aria-hidden="true"
                      >
                        {completed ? <Check /> : <Circle />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className={styles.bandoCard}>
              <div className={styles.bandoMascotWrap}>
                <img
                  src={muscularCong}
                  alt=""
                  aria-hidden="true"
                  className={styles.bandoMascot}
                />
              </div>

              <div className={styles.bandoCopy}>
                <strong>Cada jeito de participar fortalece o bando.</strong>

                <span>Obrigado por trazer a sua força para a CONG.</span>
              </div>
            </div>

            <button
              type="button"
              className={styles.finishButton}
              disabled={!allCompleted || saving}
              onClick={() => void handleFinish()}
            >
              {saving && allCompleted ? (
                <LoaderCircle className={styles.spinner} aria-hidden="true" />
              ) : (
                <Check aria-hidden="true" />
              )}
              Concluir primeiro acesso
            </button>
          </aside>

          <section className={styles.panel}>
            {activeRole && (
              <PersonalProfileForm
                role={activeRole}
                draft={personalDrafts[activeRole] ?? initialPersonalDraft}
                completed={completedRoles.has(activeRole)}
                saving={saving || collaborationProfilesLoading}
                onChange={(field, value) =>
                  updatePersonalDraft(activeRole, field, value)
                }
                onSubmit={handleSavePersonal}
              />
            )}

            {activeRepresentation && representationsLoading && (
              <div className={styles.loadingInline}>
                <LoaderCircle className={styles.spinner} aria-hidden="true" />
                Carregando vínculos...
              </div>
            )}

            {activeRepresentation && !representationsLoading && (
              <div>
                <RepresentationHeading representation={activeRepresentation} />

                {activeRepresentationRecord ? (
                  <div className={styles.completedCard}>
                    <span className={styles.completedBadge}>
                      <Check aria-hidden="true" />
                    </span>

                    <div>
                      <strong>
                        {activeRepresentationRecord.organizationName}
                      </strong>

                      <span>
                        {activeRepresentationRecord.status === "pending"
                          ? "Solicitação enviada. A instituição poderá aprovar seu vínculo."
                          : "Você já está vinculado a esta instituição."}
                      </span>
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
                            Procure uma que já tenha cadastro na CONG.
                          </span>

                          <span className={styles.choiceAction}>
                            Procurar
                            <ArrowRight aria-hidden="true" />
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

                          <strong>Cadastrar nova</strong>

                          <span>
                            Cadastre a instituição e torne-se o primeiro
                            administrador.
                          </span>

                          <span className={styles.choiceAction}>
                            Cadastrar
                            <ArrowRight aria-hidden="true" />
                          </span>
                        </button>
                      </div>
                    )}

                    {representationMode === "search" && (
                      <div>
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
                          onSubmit={(event) => void handleSearch(event)}
                        >
                          <label htmlFor="organization-search">
                            Nome da instituição
                          </label>

                          <div className={styles.searchRow}>
                            <input
                              id="organization-search"
                              value={searchQuery}
                              onChange={(event) =>
                                setSearchQuery(event.target.value)
                              }
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
                          {searchResults.map((organization) => (
                            <article
                              key={organization.id}
                              className={styles.searchResult}
                            >
                              <div>
                                <strong>{organization.name}</strong>

                                <span>
                                  {[organization.city, organization.state]
                                    .filter(Boolean)
                                    .join(", ") || "Localização não informada"}
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={
                                  saving ||
                                  organization.membershipStatus === "active" ||
                                  organization.membershipStatus === "pending"
                                }
                                onClick={() =>
                                  void handleRequest(organization.id)
                                }
                              >
                                {organization.membershipStatus === "active"
                                  ? "Já vinculado"
                                  : organization.membershipStatus === "pending"
                                    ? "Solicitação enviada"
                                    : "Solicitar vínculo"}
                              </button>
                            </article>
                          ))}

                          {!searching &&
                            searchQuery.trim().length >= 2 &&
                            searchResults.length === 0 && (
                              <p className={styles.emptyMessage}>
                                Nenhuma instituição encontrada. Você pode
                                cadastrá-la como nova.
                              </p>
                            )}
                        </div>
                      </div>
                    )}

                    {representationMode === "create" && (
                      <RepresentationCreateForm
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

            {errorMessage && (
              <div className={styles.error} role="alert">
                {errorMessage}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

function PersonalProfileForm({
  role,
  draft,
  completed,
  saving,
  onChange,
  onSubmit,
}: {
  role: CollaborationRole;

  draft: PersonalDraft;

  completed: boolean;

  saving: boolean;

  onChange: (field: keyof PersonalDraft, value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const Icon = ROLE_ICONS[role];

  return (
    <form onSubmit={onSubmit} className={styles.profileForm}>
      <div className={styles.panelHeading}>
        <div className={styles.panelIdentity}>
          <span className={styles.panelIcon}>
            <Icon aria-hidden="true" />
          </span>

          <span className={styles.panelEyebrow}>Perfil pessoal</span>
        </div>

        <h2>{ROLE_LABELS[role]}</h2>

        <p>
          {completed
            ? "Este perfil já está configurado. Você pode ajustar os dados e salvar novamente."
            : "Conte somente o necessário para a comunidade entender como você quer colaborar."}
        </p>
      </div>

      <div className={styles.formFields}>
        {role === "developer" && (
          <>
            <Field label="Tecnologias" required hint="Separe por vírgulas.">
              <input
                value={draft.technologies}
                onChange={(event) =>
                  onChange("technologies", event.target.value)
                }
                placeholder="React, TypeScript, Node.js"
                required
              />
            </Field>

            <Field label="Nível de experiência">
              <select
                value={draft.experienceLevel}
                onChange={(event) =>
                  onChange("experienceLevel", event.target.value)
                }
              >
                <option value="">Prefiro não informar</option>

                <option value="beginner">Iniciante</option>

                <option value="intermediate">Intermediário</option>

                <option value="advanced">Avançado</option>
              </select>
            </Field>

            <Field label="Portfólio ou GitHub">
              <input
                type="url"
                value={draft.portfolioUrl}
                onChange={(event) =>
                  onChange("portfolioUrl", event.target.value)
                }
                placeholder="https://..."
              />
            </Field>
          </>
        )}

        {role === "designer" && (
          <>
            <Field label="Especialidades" required hint="Separe por vírgulas.">
              <input
                value={draft.specialties}
                onChange={(event) =>
                  onChange("specialties", event.target.value)
                }
                placeholder="UI, UX, identidade visual"
                required
              />
            </Field>

            <Field label="Ferramentas">
              <input
                value={draft.tools}
                onChange={(event) => onChange("tools", event.target.value)}
                placeholder="Figma, Illustrator, Canva"
              />
            </Field>

            <Field label="Portfólio">
              <input
                type="url"
                value={draft.portfolioUrl}
                onChange={(event) =>
                  onChange("portfolioUrl", event.target.value)
                }
                placeholder="https://..."
              />
            </Field>
          </>
        )}

        {role === "translator" && (
          <>
            <Field label="Idiomas" required hint="Separe por vírgulas.">
              <input
                value={draft.languages}
                onChange={(event) => onChange("languages", event.target.value)}
                placeholder="Português, Inglês, Espanhol"
                required
              />
            </Field>

            <Field label="Observações">
              <textarea
                rows={5}
                maxLength={300}
                value={draft.notes}
                onChange={(event) => onChange("notes", event.target.value)}
                placeholder="Conte um pouco sobre sua experiência com tradução."
              />
            </Field>
          </>
        )}

        {role === "volunteer" && (
          <>
            <Field
              label="Áreas em que deseja ajudar"
              required
              hint="Separe por vírgulas."
            >
              <input
                value={draft.interestAreas}
                onChange={(event) =>
                  onChange("interestAreas", event.target.value)
                }
                placeholder="Eventos, logística, atendimento"
                required
              />
            </Field>

            <Field label="Disponibilidade">
              <input
                maxLength={120}
                value={draft.availability}
                onChange={(event) =>
                  onChange("availability", event.target.value)
                }
                placeholder="Finais de semana, período da tarde..."
              />
            </Field>
          </>
        )}
      </div>

      <div className={styles.panelActions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle className={styles.spinner} aria-hidden="true" />
          ) : completed ? (
            <Check aria-hidden="true" />
          ) : (
            <ArrowRight aria-hidden="true" />
          )}

          {saving
            ? "Salvando..."
            : completed
              ? "Salvar alterações"
              : "Salvar e continuar"}
        </button>
      </div>
    </form>
  );
}

function RepresentationHeading({
  representation,
}: {
  representation: OnboardingRepresentation;
}) {
  const Icon = REPRESENTATION_ICONS[representation];

  return (
    <div className={styles.panelHeading}>
      <div className={styles.panelIdentity}>
        <span className={styles.panelIcon}>
          <Icon aria-hidden="true" />
        </span>

        <span className={styles.panelEyebrow}>Representação</span>
      </div>

      <h2>{REPRESENTATION_LABELS[representation]}</h2>

      <p>
        Conecte-se a uma instituição que já está na CONG ou cadastre uma nova.
      </p>
    </div>
  );
}

function RepresentationCreateForm({
  type,
  draft,
  saving,
  onBack,
  onChange,
  onSubmit,
}: {
  type: OnboardingRepresentation;

  draft: RepresentationDraft;

  saving: boolean;

  onBack: () => void;

  onChange: (field: keyof RepresentationDraft, value: string) => void;

  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit}>
      <button type="button" className={styles.textButton} onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        Voltar
      </button>

      <div className={styles.formFields}>
        <Field
          label={type === "ngo" ? "Nome da ONG ou projeto" : "Nome da empresa"}
          required
        >
          <input
            value={draft.name}
            onChange={(event) => onChange("name", event.target.value)}
            minLength={2}
            maxLength={120}
            required
          />
        </Field>

        <Field label="Razão social">
          <input
            value={draft.legalName}
            onChange={(event) => onChange("legalName", event.target.value)}
            maxLength={160}
          />
        </Field>

        <div className={styles.fieldRow}>
          <Field label="CNPJ">
            <input
              value={draft.cnpj}
              onChange={(event) => onChange("cnpj", event.target.value)}
              maxLength={30}
            />
          </Field>

          <Field label="Telefone">
            <input
              value={draft.phone}
              onChange={(event) => onChange("phone", event.target.value)}
              maxLength={40}
            />
          </Field>
        </div>

        <Field label="E-mail institucional">
          <input
            type="email"
            value={draft.email}
            onChange={(event) => onChange("email", event.target.value)}
          />
        </Field>

        <Field label="Descrição">
          <textarea
            rows={4}
            maxLength={500}
            value={draft.description}
            onChange={(event) => onChange("description", event.target.value)}
          />
        </Field>

        <div className={styles.fieldRow}>
          <Field label="Cidade">
            <input
              value={draft.city}
              onChange={(event) => onChange("city", event.target.value)}
              maxLength={80}
            />
          </Field>

          <Field label="UF">
            <input
              value={draft.state}
              onChange={(event) =>
                onChange("state", event.target.value.toUpperCase())
              }
              maxLength={2}
              placeholder="SP"
            />
          </Field>
        </div>
      </div>

      <div className={styles.panelActions}>
        <button
          type="submit"
          className={styles.primaryButton}
          disabled={saving}
        >
          {saving ? (
            <LoaderCircle className={styles.spinner} aria-hidden="true" />
          ) : (
            <Building2 aria-hidden="true" />
          )}

          {saving ? "Cadastrando..." : "Cadastrar e continuar"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={styles.field}>
      <span>
        {label}

        {required && <strong>*</strong>}
      </span>

      {children}

      {hint && <small>{hint}</small>}
    </label>
  );
}
