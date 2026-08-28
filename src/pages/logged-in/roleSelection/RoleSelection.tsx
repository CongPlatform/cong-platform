import { type DragEvent, useMemo, useState } from "react";

import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  Check,
  Code2,
  GripVertical,
  HandHeart,
  Info,
  Languages,
  LogOut,
  Palette,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../../contexts/auth-context";

import {
  collaborationRoles,
  type CollaborationRole,
} from "../../../services/collaborationProfileService";

import {
  saveOnboardingParticipation,
  type OnboardingRepresentation,
} from "../../../services/onboardingService";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../../assets/mascot/cong-happy.webp";

import styles from "./RoleSelection.module.css";

/* ==================================================
   TIPOS
   ================================================== */

type RoleDefinition = {
  id: CollaborationRole;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Code2;
};

type RepresentationDefinition = {
  id: OnboardingRepresentation;
  label: string;
  shortLabel: string;
  description: string;
  icon: typeof Building2;
};

type ParticipationSelection = CollaborationRole | OnboardingRepresentation;

type RoleSelectionAccount = NonNullable<ReturnType<typeof useAuth>["account"]>;

/* ==================================================
   OPÇÕES
   ================================================== */

const ROLE_DEFINITIONS: readonly RoleDefinition[] = [
  {
    id: "developer",
    label: "Desenvolvedor",
    shortLabel: "Desenvolvedor",
    description: "Contribua com código, módulos e melhorias técnicas.",
    icon: Code2,
  },
  {
    id: "designer",
    label: "Designer",
    shortLabel: "Designer",
    description: "Ajude com interfaces, experiências e templates.",
    icon: Palette,
  },
  {
    id: "translator",
    label: "Tradução e acessibilidade",
    shortLabel: "Tradução",
    description: "Amplie o acesso traduzindo conteúdos e recursos.",
    icon: Languages,
  },
  {
    id: "volunteer",
    label: "Voluntário",
    shortLabel: "Voluntário",
    description: "Participe de ações e encontre formas práticas de ajudar.",
    icon: HandHeart,
  },
];

const REPRESENTATION_DEFINITIONS: readonly RepresentationDefinition[] = [
  {
    id: "ngo",
    label: "ONG ou projeto social",
    shortLabel: "ONG",
    description:
      "Represente uma organização existente ou cadastre uma nova na CONG.",
    icon: Building2,
  },
  {
    id: "company",
    label: "Empresa apoiadora",
    shortLabel: "Empresa",
    description:
      "Represente uma empresa interessada em apoiar organizações e iniciativas.",
    icon: BriefcaseBusiness,
  },
];

const DRAG_TYPE = "application/x-cong-participation";

/* ==================================================
   HELPERS
   ================================================== */

function isCollaborationRole(value: string): value is CollaborationRole {
  return collaborationRoles.includes(value as CollaborationRole);
}

function isRepresentation(value: string): value is OnboardingRepresentation {
  return value === "ngo" || value === "company";
}

/* ==================================================
   PÁGINA
   ================================================== */

export default function RoleSelection() {
  const { account, accountLoading } = useAuth();

  if (accountLoading && !account) {
    return (
      <main className={styles.loadingPage}>
        <p>Preparando as opções...</p>
      </main>
    );
  }

  if (!account) {
    return null;
  }

  if (account.onboardingStep === "identity") {
    return <Navigate to="/app/primeiro-acesso" replace />;
  }

  if (account.onboardingStep === "completed") {
    return <Navigate to="/app/comunidade" replace />;
  }

  return <RoleSelectionWorkspace account={account} />;
}

/* ==================================================
   WORKSPACE
   ================================================== */

function RoleSelectionWorkspace({
  account,
}: {
  account: RoleSelectionAccount;
}) {
  const navigate = useNavigate();

  const { refreshAccount, logout } = useAuth();

  const isReviewing = account.onboardingStep === "profiles";

  const [selectedRoles, setSelectedRoles] = useState<CollaborationRole[]>(
    () => account.onboardingRoles ?? [],
  );

  const [selectedRepresentations, setSelectedRepresentations] = useState<
    OnboardingRepresentation[]
  >(() => account.onboardingRepresentations ?? []);

  const [draggedItem, setDraggedItem] = useState<ParticipationSelection | null>(
    null,
  );

  const [dropActive, setDropActive] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  const [errorMessage, setErrorMessage] = useState("");

  /* ==================================================
     SELEÇÃO DERIVADA
     ================================================== */

  const selectedItems = useMemo(() => {
    const personal = selectedRoles
      .map((role) => ROLE_DEFINITIONS.find((item) => item.id === role))
      .filter((item): item is RoleDefinition => Boolean(item))
      .map((item) => ({
        type: "role" as const,
        item,
      }));

    const institutional = selectedRepresentations
      .map((representation) =>
        REPRESENTATION_DEFINITIONS.find((item) => item.id === representation),
      )
      .filter((item): item is RepresentationDefinition => Boolean(item))
      .map((item) => ({
        type: "representation" as const,
        item,
      }));

    return [...personal, ...institutional];
  }, [selectedRoles, selectedRepresentations]);

  const totalSelected = selectedItems.length;

  /* ==================================================
     PERFIS PESSOAIS
     ================================================== */

  const addRole = (role: CollaborationRole) => {
    setSelectedRoles((current) =>
      current.includes(role) ? current : [...current, role],
    );

    setErrorMessage("");
  };

  const removeRole = (role: CollaborationRole) => {
    setSelectedRoles((current) => current.filter((item) => item !== role));

    setErrorMessage("");
  };

  const toggleRole = (role: CollaborationRole) => {
    if (selectedRoles.includes(role)) {
      removeRole(role);

      return;
    }

    addRole(role);
  };

  /* ==================================================
     REPRESENTAÇÕES
     ================================================== */

  const addRepresentation = (representation: OnboardingRepresentation) => {
    setSelectedRepresentations((current) =>
      current.includes(representation) ? current : [...current, representation],
    );

    setErrorMessage("");
  };

  const removeRepresentation = (representation: OnboardingRepresentation) => {
    setSelectedRepresentations((current) =>
      current.filter((item) => item !== representation),
    );

    setErrorMessage("");
  };

  const toggleRepresentation = (representation: OnboardingRepresentation) => {
    if (selectedRepresentations.includes(representation)) {
      removeRepresentation(representation);

      return;
    }

    addRepresentation(representation);
  };

  /* ==================================================
     DRAG AND DROP
     ================================================== */

  const handleDragStart = (
    event: DragEvent<HTMLButtonElement>,
    selection: ParticipationSelection,
  ) => {
    event.dataTransfer.effectAllowed = "copy";

    event.dataTransfer.setData(DRAG_TYPE, selection);

    event.dataTransfer.setData("text/plain", selection);

    setDraggedItem(selection);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    const selection =
      event.dataTransfer.getData(DRAG_TYPE) ||
      event.dataTransfer.getData("text/plain") ||
      draggedItem ||
      "";

    if (isCollaborationRole(selection)) {
      addRole(selection);
    } else if (isRepresentation(selection)) {
      addRepresentation(selection);
    }

    setDraggedItem(null);
    setDropActive(false);
  };

  /* ==================================================
     LIMPAR
     ================================================== */

  const clearSelection = () => {
    setSelectedRoles([]);

    setSelectedRepresentations([]);

    setErrorMessage("");
  };

  /* ==================================================
     CONFIRMAR
     ================================================== */

  const handleConfirm = async () => {
    if (totalSelected === 0) {
      setErrorMessage(
        "Escolha pelo menos uma forma de participar para continuar.",
      );

      return;
    }

    if (isSaving) {
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      await saveOnboardingParticipation({
        roles: selectedRoles,

        representations: selectedRepresentations,
      });

      await refreshAccount();

      navigate("/app/completar-perfis", {
        replace: true,
      });
    } catch (error) {
      console.error("Não foi possível salvar a participação escolhida:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar suas escolhas. Tente novamente.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /* ==================================================
     LOGOUT
     ================================================== */

  const handleLogout = async () => {
    await logout();

    navigate("/login", {
      replace: true,
    });
  };

  /* ==================================================
     RENDER
     ================================================== */

  return (
    <main className={styles.page}>
      <header className={styles.topbar}>
        <img src={logo} alt="CONG" className={styles.logo} />

        <button
          type="button"
          className={styles.logoutButton}
          onClick={() => void handleLogout()}
          disabled={isSaving}
        >
          <LogOut aria-hidden="true" />

          <span>Sair</span>
        </button>
      </header>

      <section className={styles.content}>
        {/* ==================================================
            HERO
            ================================================== */}

        <div className={styles.hero}>
          <div className={styles.stepBadge}>2 de 2</div>

          <div className={styles.eyebrow}>
            <Sparkles aria-hidden="true" />
            Seu lugar no bando
          </div>

          <h1>
            Como você quer participar da <span>CONG?</span>
          </h1>

          <p className={styles.heroText}>
            Você pode fazer parte do bando de mais de uma forma. Escolha perfis
            pessoais, represente uma instituição ou combine os dois.
          </p>

          <div className={styles.notice}>
            <span className={styles.noticeIcon}>
              <Info aria-hidden="true" />
            </span>

            <p>
              <strong>Você poderá adicionar outras formas depois.</strong>
              Para continuar agora, escolha pelo menos uma.
            </p>
          </div>
        </div>

        {/* ==================================================
            SELETOR PRINCIPAL
            ================================================== */}

        <div className={styles.selectionLayout}>
          {/* ==================================================
              OPÇÕES
              ================================================== */}

          <section className={styles.optionsCard}>
            {/* COMO PESSOA */}

            <div className={styles.optionGroup}>
              <div className={styles.groupHeading}>
                <span>Como pessoa</span>

                <small>Arraste ou clique</small>
              </div>

              <div className={styles.optionGrid}>
                {ROLE_DEFINITIONS.map((role) => {
                  const Icon = role.icon;

                  const selected = selectedRoles.includes(role.id);

                  return (
                    <button
                      key={role.id}
                      type="button"
                      draggable
                      aria-pressed={selected}
                      className={`${styles.optionCard} ${
                        selected ? styles.optionCardSelected : ""
                      } ${
                        draggedItem === role.id ? styles.optionCardDragging : ""
                      }`}
                      onClick={() => toggleRole(role.id)}
                      onDragStart={(event) => handleDragStart(event, role.id)}
                      onDragEnd={() => {
                        setDraggedItem(null);

                        setDropActive(false);
                      }}
                    >
                      <GripVertical
                        className={styles.dragHandle}
                        aria-hidden="true"
                      />

                      <span className={styles.optionIcon}>
                        <Icon aria-hidden="true" />
                      </span>

                      <span className={styles.optionCopy}>
                        <strong>{role.label}</strong>

                        <small>{role.description}</small>
                      </span>

                      <span
                        className={`${styles.checkCircle} ${
                          selected ? styles.checkCircleSelected : ""
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <Check />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* INSTITUIÇÕES */}

            <div className={styles.optionGroup}>
              <div className={styles.groupHeading}>
                <span>Representando uma instituição</span>

                <small>Arraste ou clique</small>
              </div>

              <div className={styles.optionGrid}>
                {REPRESENTATION_DEFINITIONS.map((representation) => {
                  const Icon = representation.icon;

                  const selected = selectedRepresentations.includes(
                    representation.id,
                  );

                  return (
                    <button
                      key={representation.id}
                      type="button"
                      draggable
                      aria-pressed={selected}
                      className={`${styles.optionCard} ${
                        selected ? styles.optionCardSelected : ""
                      } ${
                        draggedItem === representation.id
                          ? styles.optionCardDragging
                          : ""
                      }`}
                      onClick={() => toggleRepresentation(representation.id)}
                      onDragStart={(event) =>
                        handleDragStart(event, representation.id)
                      }
                      onDragEnd={() => {
                        setDraggedItem(null);

                        setDropActive(false);
                      }}
                    >
                      <GripVertical
                        className={styles.dragHandle}
                        aria-hidden="true"
                      />

                      <span className={styles.optionIcon}>
                        <Icon aria-hidden="true" />
                      </span>

                      <span className={styles.optionCopy}>
                        <strong>{representation.label}</strong>

                        <small>{representation.description}</small>
                      </span>

                      <span
                        className={`${styles.checkCircle} ${
                          selected ? styles.checkCircleSelected : ""
                        }`}
                        aria-hidden="true"
                      >
                        {selected && <Check />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* ==================================================
              SUA PARTICIPAÇÃO
              ================================================== */}

          <aside
            className={`${styles.selectionCard} ${
              dropActive ? styles.selectionCardDrop : ""
            }`}
            onDragEnter={(event) => {
              event.preventDefault();

              setDropActive(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();

              event.dataTransfer.dropEffect = "copy";

              setDropActive(true);
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              ) {
                setDropActive(false);
              }
            }}
            onDrop={handleDrop}
          >
            <div className={styles.selectionHeading}>
              <div>
                <span className={styles.selectionEyebrow}>
                  Sua participação
                </span>

                <strong>
                  {totalSelected === 0
                    ? "Nenhuma escolha ainda"
                    : `${totalSelected} ${
                        totalSelected === 1
                          ? "escolha selecionada"
                          : "escolhas selecionadas"
                      }`}
                </strong>
              </div>

              {totalSelected > 0 && (
                <button
                  type="button"
                  className={styles.clearButton}
                  onClick={clearSelection}
                >
                  <RotateCcw aria-hidden="true" />
                  Limpar
                </button>
              )}
            </div>

            {totalSelected === 0 ? (
              <div className={styles.emptySelection}>
                <div className={styles.emptyIcon}>
                  <GripVertical aria-hidden="true" />
                </div>

                <strong>Escolha seu lugar no bando</strong>

                <span>Clique em uma opção ao lado ou arraste para cá.</span>
              </div>
            ) : (
              <div className={styles.selectedList}>
                {selectedItems.map(({ type, item }, index) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={`${type}-${item.id}`}
                      className={styles.selectedItem}
                    >
                      <span className={styles.selectedOrder}>{index + 1}</span>

                      <Icon
                        className={styles.selectedIcon}
                        aria-hidden="true"
                      />

                      <strong>{item.shortLabel}</strong>

                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => {
                          if (type === "role") {
                            removeRole(item.id as CollaborationRole);
                          } else {
                            removeRepresentation(
                              item.id as OnboardingRepresentation,
                            );
                          }
                        }}
                        aria-label={`Remover ${item.shortLabel}`}
                      >
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className={styles.selectionSpacer} />

            <div className={styles.mascotNote}>
              <img src={mascot} alt="" aria-hidden="true" />

              <p>
                <strong>Seu bando pode crescer com você.</strong>
                Novos perfis poderão ser adicionados mais tarde.
              </p>
            </div>

            {errorMessage && (
              <div className={styles.error} role="alert">
                {errorMessage}
              </div>
            )}

            <button
              type="button"
              className={styles.confirmButton}
              disabled={totalSelected === 0 || isSaving}
              onClick={() => void handleConfirm()}
            >
              {isSaving
                ? "Salvando..."
                : isReviewing
                  ? "Salvar escolhas"
                  : "Continuar"}

              <ArrowRight aria-hidden="true" />
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
