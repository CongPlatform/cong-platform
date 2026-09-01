import { useEffect, useState, type SubmitEvent } from "react";
import {
  Building2,
  BriefcaseBusiness,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  LoaderCircle,
  Plus,
  Search,
  X,
} from "lucide-react";

import InstitutionRepresentationForm, {
  type RepresentationDraft,
} from "../../../../components/profileForms/InstitutionRepresentationForm";
import { useAuth } from "../../../../contexts/auth-context";
import type { OnboardingRepresentation } from "../../../../services/onboardingService";
import {
  searchRepresentationOrganizations,
  type OrganizationSearchResult,
  type RepresentationStatus,
} from "../../../../services/representationService";
import styles from "./RepresentationsSection.module.css";

type AddMode = "choose" | "search" | "create";
interface RepresentationsSectionProps {
  compact?: boolean;
  onViewAll?: () => void;
}

const TYPE_META: Record<
  OnboardingRepresentation,
  { label: string; description: string; icon: typeof Building2 }
> = {
  ngo: {
    label: "ONG ou projeto social",
    description: "Organizações sociais, coletivos e iniciativas de impacto.",
    icon: Building2,
  },
  company: {
    label: "Empresa apoiadora",
    description:
      "Empresas que apoiam, patrocinam ou colaboram com iniciativas.",
    icon: BriefcaseBusiness,
  },
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
  return { ...EMPTY_REPRESENTATION, areas: [], supportTypes: [] };
}

function optionalText(value: string): string | undefined {
  const normalized = value.trim();
  return normalized || undefined;
}

function statusLabel(status: RepresentationStatus): string {
  if (status === "active") return "Vínculo ativo";
  if (status === "pending") return "Solicitação pendente";
  return "Vínculo suspenso";
}

function membershipLabel(status: RepresentationStatus | null): string {
  if (status === "active") return "Você já representa esta organização";
  if (status === "pending") return "Solicitação já enviada";
  if (status === "suspended") return "Vínculo suspenso";
  return "Solicitar vínculo";
}

function statusClass(status: RepresentationStatus): string {
  if (status === "active") return styles.statusActive;
  if (status === "pending") return styles.statusPending;
  return styles.statusSuspended;
}

export default function RepresentationsSection({
  compact = false,
  onViewAll,
}: RepresentationsSectionProps) {
  const {
    representations,
    representationsLoading,
    createRepresentation,
    requestRepresentation,
    cancelRepresentationRequest,
  } = useAuth();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [selectedType, setSelectedType] =
    useState<OnboardingRepresentation | null>(null);
  const [mode, setMode] = useState<AddMode>("choose");
  const [draft, setDraft] = useState<RepresentationDraft>(() =>
    createEmptyRepresentationDraft(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    OrganizationSearchResult[]
  >([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  function clearFeedback(): void {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function closeAddFlow(): void {
    setAddOpen(false);
    setSelectedType(null);
    setMode("choose");
    setDraft(createEmptyRepresentationDraft());
    setSearchQuery("");
    setSearchResults([]);
    setSearching(false);
    setErrorMessage("");
  }

  function openAddFlow(): void {
    clearFeedback();
    setAddOpen(true);
    setSelectedType(null);
    setMode("choose");
    setDraft(createEmptyRepresentationDraft());
    setSearchQuery("");
    setSearchResults([]);
  }

  function chooseType(type: OnboardingRepresentation): void {
    setSelectedType(type);
    setMode("choose");
    setDraft(createEmptyRepresentationDraft());
    setSearchQuery("");
    setSearchResults([]);
    setErrorMessage("");
  }

  useEffect(() => {
    if (!addOpen || mode !== "search" || !selectedType) return;

    const query = searchQuery.trim();
    if (query.length < 2) return;

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setSearching(true);

      void searchRepresentationOrganizations(selectedType, query)
        .then((results) => {
          if (!cancelled) setSearchResults(results);
        })
        .catch((error) => {
          if (cancelled) return;
          console.error("Erro ao buscar organizações:", error);
          setSearchResults([]);
          setErrorMessage("Não foi possível pesquisar organizações agora.");
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 320);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [addOpen, mode, searchQuery, selectedType]);

  async function handleSearch(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType || searchQuery.trim().length < 2 || searching) return;

    setSearching(true);
    setErrorMessage("");

    try {
      setSearchResults(
        await searchRepresentationOrganizations(
          selectedType,
          searchQuery.trim(),
        ),
      );
    } catch (error) {
      console.error("Erro ao buscar organizações:", error);
      setSearchResults([]);
      setErrorMessage("Não foi possível pesquisar organizações agora.");
    } finally {
      setSearching(false);
    }
  }

  async function handleRequest(organization: OrganizationSearchResult) {
    if (saving || organization.membershipStatus) return;

    setSaving(true);
    setErrorMessage("");

    try {
      await requestRepresentation(organization.id);
      closeAddFlow();
      setSuccessMessage(`Solicitação enviada para ${organization.name}.`);
    } catch (error) {
      console.error("Erro ao solicitar vínculo:", error);
      setErrorMessage("Não foi possível enviar a solicitação de vínculo.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreate(): Promise<void> {
    if (!selectedType || saving) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const representation = await createRepresentation({
        organizationType: selectedType,
        name: draft.name.trim(),
        legalName: optionalText(draft.legalName),
        cnpj: optionalText(draft.cnpj),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        description: draft.description.trim(),
        cep: draft.cep.trim(),
        street: draft.street.trim(),
        district: draft.district.trim(),
        number: draft.number.trim(),
        complement: optionalText(draft.complement),
        city: draft.city.trim(),
        state: draft.state.trim(),
        initiativeKind:
          selectedType === "company" ? "formal" : draft.initiativeKind,
        areas: draft.areas,
        supportTypes: selectedType === "company" ? draft.supportTypes : [],
      });

      closeAddFlow();
      setSuccessMessage(
        `${representation.organizationName} foi vinculada à sua conta.`,
      );
    } catch (error) {
      console.error("Erro ao cadastrar organização:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível cadastrar esta organização.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelRequest(representationId: string): Promise<void> {
    if (cancellingId || representationsLoading) return;

    setCancellingId(representationId);
    clearFeedback();

    try {
      await cancelRepresentationRequest(representationId);
      setExpandedId(null);
      setSuccessMessage("Solicitação de vínculo cancelada.");
    } catch (error) {
      console.error("Erro ao cancelar solicitação de vínculo:", error);
      setErrorMessage("Não foi possível cancelar a solicitação agora.");
    } finally {
      setCancellingId(null);
    }
  }

  const selectedMeta = selectedType ? TYPE_META[selectedType] : null;

  return (
    <div className={`${styles.section} ${compact ? styles.compact : ""}`}>
      {!compact && (
        <div className={styles.toolbar}>
          <span>
            {representations.length}{" "}
            {representations.length === 1 ? "vínculo" : "vínculos"}
          </span>
          <button
            type="button"
            className={styles.addButton}
            onClick={openAddFlow}
          >
            <Plus aria-hidden="true" />
            Adicionar representação
          </button>
        </div>
      )}

      {errorMessage && (
        <div className={styles.error} role="alert">
          <CircleAlert aria-hidden="true" /> {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className={styles.success} role="status">
          <Check aria-hidden="true" /> {successMessage}
        </div>
      )}

      {!compact && addOpen && (
        <div className={styles.addPanel}>
          <div className={styles.addPanelHeader}>
            <div>
              <span>Nova representação</span>
              <strong>
                {selectedMeta
                  ? selectedMeta.label
                  : "Que tipo de organização você representa?"}
              </strong>
            </div>
            <button type="button" onClick={closeAddFlow} aria-label="Fechar">
              <X aria-hidden="true" />
            </button>
          </div>

          {!selectedType && (
            <div className={styles.typeGrid}>
              {(Object.keys(TYPE_META) as OnboardingRepresentation[]).map(
                (type) => {
                  const meta = TYPE_META[type];
                  const Icon = meta.icon;

                  return (
                    <button
                      key={type}
                      type="button"
                      className={styles.typeOption}
                      onClick={() => chooseType(type)}
                    >
                      <span className={styles.typeIcon}>
                        <Icon aria-hidden="true" />
                      </span>
                      <span>
                        <strong>{meta.label}</strong>
                        <small>{meta.description}</small>
                      </span>
                      <ChevronRight aria-hidden="true" />
                    </button>
                  );
                },
              )}
            </div>
          )}

          {selectedType && mode === "choose" && (
            <div className={styles.modeGrid}>
              <button
                type="button"
                className={styles.modeOption}
                onClick={() => setMode("search")}
              >
                <Search aria-hidden="true" />
                <span>
                  <strong>Vincular organização existente</strong>
                  <small>
                    Procure pelo nome e envie uma solicitação de vínculo.
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.modeOption}
                onClick={() => setMode("create")}
              >
                <Plus aria-hidden="true" />
                <span>
                  <strong>Cadastrar nova organização</strong>
                  <small>
                    Use quando ela ainda não estiver cadastrada na CONG.
                  </small>
                </span>
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          )}

          {selectedType && mode === "search" && (
            <div className={styles.searchArea}>
              <button
                type="button"
                className={styles.backLink}
                onClick={() => setMode("choose")}
              >
                Voltar às opções
              </button>

              <form className={styles.searchForm} onSubmit={handleSearch}>
                <div className={styles.searchInput}>
                  <Search aria-hidden="true" />
                  <input
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                      setErrorMessage("");
                    }}
                    placeholder="Busque pelo nome da organização"
                    aria-label="Buscar organização"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searchQuery.trim().length < 2 || searching}
                >
                  {searching ? (
                    <LoaderCircle
                      className={styles.spinner}
                      aria-hidden="true"
                    />
                  ) : (
                    "Buscar"
                  )}
                </button>
              </form>

              {searchQuery.trim().length >= 2 &&
                !searching &&
                searchResults.length === 0 && (
                  <p className={styles.searchEmpty}>
                    Nenhuma organização encontrada com essa busca.
                  </p>
                )}

              {searchResults.length > 0 && (
                <div className={styles.results}>
                  {searchResults.map((organization) => (
                    <article key={organization.id} className={styles.resultRow}>
                      <div>
                        <strong>{organization.name}</strong>
                        {(organization.city || organization.state) && (
                          <span>
                            {[organization.city, organization.state]
                              .filter(Boolean)
                              .join(" – ")}
                          </span>
                        )}
                        {organization.description && (
                          <p>{organization.description}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={
                          Boolean(organization.membershipStatus) || saving
                        }
                        onClick={() => void handleRequest(organization)}
                      >
                        {membershipLabel(organization.membershipStatus)}
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}

          {selectedType && mode === "create" && (
            <InstitutionRepresentationForm
              type={selectedType}
              draft={draft}
              saving={saving || representationsLoading}
              submitLabel="Cadastrar organização"
              onBack={() => setMode("choose")}
              onChange={(field, value) => {
                setDraft((current) => ({ ...current, [field]: value }));
                setErrorMessage("");
              }}
              onSubmit={handleCreate}
            />
          )}
        </div>
      )}

      {representationsLoading && representations.length === 0 ? (
        <div
          className={styles.loadingRows}
          aria-label="Carregando representações"
        >
          <span />
          <span />
        </div>
      ) : representations.length === 0 ? (
        <div className={styles.emptyState}>
          <Building2 aria-hidden="true" />
          <div>
            <strong>Você ainda não possui vínculos institucionais.</strong>
            <p>
              ONGs, projetos sociais e empresas apoiadoras podem aparecer aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {representations.map((representation) => {
            const meta = TYPE_META[representation.organizationType];
            const Icon = meta.icon;
            const expanded = expandedId === representation.id;

            return (
              <article key={representation.id} className={styles.row}>
                <button
                  type="button"
                  className={styles.rowSummary}
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedId(expanded ? null : representation.id)
                  }
                >
                  <span className={styles.cardIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className={styles.rowTitle}>
                    <small>{meta.label}</small>
                    <strong>{representation.organizationName}</strong>
                    <span>{representation.roleName}</span>
                  </span>
                  <span
                    className={`${styles.statusText} ${statusClass(representation.status)}`}
                  >
                    <i aria-hidden="true" />
                    {statusLabel(representation.status)}
                  </span>
                  {expanded ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </button>

                {expanded && (
                  <div className={styles.rowDetails}>
                    <div>
                      <span className={styles.detailLabel}>
                        Tipo de vínculo
                      </span>
                      <strong>{representation.roleName}</strong>
                      {representation.roleCode && (
                        <small>{representation.roleCode}</small>
                      )}
                    </div>

                    {representation.status === "pending" && (
                      <div className={styles.pendingExplanation}>
                        <strong>Solicitação enviada</strong>
                        <p>
                          A organização ainda precisa aprovar sua representação.
                        </p>
                      </div>
                    )}

                    {representation.status === "pending" && (
                      <button
                        type="button"
                        className={styles.cancelButton}
                        disabled={
                          Boolean(cancellingId) || representationsLoading
                        }
                        onClick={() =>
                          void handleCancelRequest(representation.id)
                        }
                      >
                        {cancellingId === representation.id ? (
                          <LoaderCircle
                            className={styles.spinner}
                            aria-hidden="true"
                          />
                        ) : null}
                        Cancelar solicitação
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {compact && onViewAll && representations.length > 0 && (
        <button
          type="button"
          className={styles.viewAllButton}
          onClick={onViewAll}
        >
          Ver todas as representações
        </button>
      )}
    </div>
  );
}
