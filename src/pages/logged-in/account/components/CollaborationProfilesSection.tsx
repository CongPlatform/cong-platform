import { useMemo, useState } from "react";

import {
  Check,
  ChevronDown,
  ChevronRight,
  Code2,
  Languages,
  LoaderCircle,
  Palette,
  Pencil,
  Plus,
  UserRound,
  X,
} from "lucide-react";

import { useAuth } from "../../../../contexts/auth-context";
import type {
  CollaborationProfile,
  CollaborationRole,
} from "../../../../services/collaborationProfileService";

import CollaborationProfileEditor from "./CollaborationProfileEditor";
import styles from "./CollaborationProfilesSection.module.css";

const ALL_ROLES: CollaborationRole[] = [
  "developer",
  "designer",
  "translator",
  "volunteer",
];

const ROLE_META: Record<
  CollaborationRole,
  {
    label: string;
    description: string;
    icon: typeof Code2;
  }
> = {
  developer: {
    label: "Desenvolvedor",
    description: "Tecnologias, experiência e contribuições em desenvolvimento.",
    icon: Code2,
  },
  designer: {
    label: "Designer",
    description: "Especialidades, ferramentas e contribuições em design.",
    icon: Palette,
  },
  translator: {
    label: "Tradução e acessibilidade",
    description:
      "Idiomas e recursos de acessibilidade com que você pode colaborar.",
    icon: Languages,
  },
  volunteer: {
    label: "Voluntário",
    description: "Causas, atividades, disponibilidade e região de atuação.",
    icon: UserRound,
  },
};

interface CollaborationProfilesSectionProps {
  compact?: boolean;
  onViewAll?: () => void;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function CollaborationProfilesSection({
  compact = false,
  onViewAll,
}: CollaborationProfilesSectionProps) {
  const {
    collaborationProfiles,
    collaborationProfilesLoading,
    activateCollaborationProfile,
    refreshCollaborationProfiles,
  } = useAuth();

  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(
    collaborationProfiles.find((profile) => profile.isActive)?.id ?? null,
  );
  const [switchingProfileId, setSwitchingProfileId] = useState<string | null>(
    null,
  );
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [creatingRole, setCreatingRole] = useState<CollaborationRole | null>(
    null,
  );
  const [rolePickerOpen, setRolePickerOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const editingProfile =
    collaborationProfiles.find((profile) => profile.id === editingProfileId) ??
    null;

  const availableRoles = useMemo(() => {
    const existingRoles = new Set(
      collaborationProfiles.map((profile) => profile.role),
    );
    return ALL_ROLES.filter((role) => !existingRoles.has(role));
  }, [collaborationProfiles]);

  function clearFeedback(): void {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function openRolePicker(): void {
    clearFeedback();
    setEditingProfileId(null);
    setCreatingRole(null);
    setRolePickerOpen(true);
  }

  function closeCreation(): void {
    setCreatingRole(null);
    setRolePickerOpen(false);
  }

  function chooseRole(role: CollaborationRole): void {
    clearFeedback();
    setEditingProfileId(null);
    setRolePickerOpen(false);
    setCreatingRole(role);
  }

  async function handleActivate(profile: CollaborationProfile): Promise<void> {
    if (
      profile.isActive ||
      switchingProfileId ||
      collaborationProfilesLoading
    ) {
      return;
    }

    setSwitchingProfileId(profile.id);
    clearFeedback();

    try {
      await activateCollaborationProfile(profile.id);
      setExpandedProfileId(profile.id);
      setSuccessMessage(
        `${ROLE_META[profile.role].label} agora é seu perfil atual.`,
      );
    } catch (error) {
      console.error("Erro ao trocar perfil ativo:", error);
      setErrorMessage(
        "Não foi possível trocar seu perfil agora. Tente novamente.",
      );
    } finally {
      setSwitchingProfileId(null);
    }
  }

  function handleEdit(profile: CollaborationProfile): void {
    if (compact && onViewAll) {
      onViewAll();
      return;
    }

    clearFeedback();
    setRolePickerOpen(false);
    setCreatingRole(null);
    setEditingProfileId(profile.id);
    setExpandedProfileId(profile.id);
  }

  async function handleProfileSaved(
    profile: CollaborationProfile,
    created: boolean,
  ): Promise<void> {
    await refreshCollaborationProfiles();
    setEditingProfileId(null);
    setCreatingRole(null);
    setRolePickerOpen(false);
    setExpandedProfileId(profile.id);
    setErrorMessage("");
    setSuccessMessage(
      created
        ? `Perfil de ${ROLE_META[profile.role].label.toLowerCase()} adicionado com sucesso.`
        : `Perfil de ${ROLE_META[profile.role].label.toLowerCase()} atualizado com sucesso.`,
    );
  }

  if (collaborationProfilesLoading && collaborationProfiles.length === 0) {
    return (
      <div className={styles.skeletonList} aria-label="Carregando perfis">
        <span />
        <span />
        <span />
      </div>
    );
  }

  return (
    <div className={`${styles.section} ${compact ? styles.compact : ""}`}>
      {!compact && (
        <div className={styles.toolbar}>
          <span className={styles.count}>
            {collaborationProfiles.length}{" "}
            {collaborationProfiles.length === 1 ? "perfil" : "perfis"}
          </span>

          {availableRoles.length > 0 && (
            <button
              type="button"
              className={styles.addButton}
              onClick={openRolePicker}
            >
              <Plus aria-hidden="true" />
              Adicionar perfil
            </button>
          )}
        </div>
      )}

      {errorMessage && (
        <div className={styles.error} role="alert">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className={styles.success} role="status">
          <Check aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {!compact && rolePickerOpen && availableRoles.length > 0 && (
        <div className={styles.rolePicker}>
          <div className={styles.rolePickerHeader}>
            <div>
              <strong>Adicionar outro perfil</strong>
              <span>
                Escolha uma forma de participação que ainda não está na sua
                conta.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setRolePickerOpen(false)}
              aria-label="Fechar seleção"
            >
              <X aria-hidden="true" />
            </button>
          </div>

          <div className={styles.roleOptions}>
            {availableRoles.map((role) => {
              const meta = ROLE_META[role];
              const Icon = meta.icon;

              return (
                <button
                  key={role}
                  type="button"
                  className={styles.roleOption}
                  onClick={() => chooseRole(role)}
                >
                  <span className={styles.roleIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{meta.label}</strong>
                    <small>{meta.description}</small>
                  </span>
                  <Plus aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {collaborationProfiles.length === 0 ? (
        <div className={styles.emptyState}>
          <UserRound aria-hidden="true" />
          <div>
            <strong>Você ainda não criou um perfil de colaboração.</strong>
            <p>
              Adicione um perfil quando quiser participar da comunidade com uma
              habilidade específica.
            </p>
          </div>
          <button type="button" onClick={openRolePicker}>
            Adicionar primeiro perfil
          </button>
        </div>
      ) : (
        <div className={styles.list}>
          {collaborationProfiles.map((profile) => {
            const meta = ROLE_META[profile.role];
            const Icon = meta.icon;
            const expanded = expandedProfileId === profile.id;
            const switching = switchingProfileId === profile.id;

            return (
              <article
                key={profile.id}
                className={`${styles.row} ${expanded ? styles.rowExpanded : ""}`}
              >
                <button
                  type="button"
                  className={styles.rowSummary}
                  aria-expanded={expanded}
                  onClick={() =>
                    setExpandedProfileId(expanded ? null : profile.id)
                  }
                >
                  <span className={styles.roleIcon}>
                    <Icon aria-hidden="true" />
                  </span>
                  <span className={styles.rowTitle}>
                    <strong>{meta.label}</strong>
                    <small>{meta.description}</small>
                  </span>
                  {profile.isActive && (
                    <span className={styles.activeText}>
                      <Check aria-hidden="true" /> Perfil atual
                    </span>
                  )}
                  {expanded ? (
                    <ChevronDown aria-hidden="true" />
                  ) : (
                    <ChevronRight aria-hidden="true" />
                  )}
                </button>

                {expanded && (
                  <div className={styles.rowDetails}>
                    <dl>
                      <div>
                        <dt>Última atualização</dt>
                        <dd>{formatUpdatedAt(profile.updatedAt)}</dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>
                          {profile.isActive
                            ? "Perfil em uso"
                            : "Perfil disponível"}
                        </dd>
                      </div>
                    </dl>

                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.textButton}
                        onClick={() => handleEdit(profile)}
                      >
                        <Pencil aria-hidden="true" /> Editar detalhes
                      </button>

                      {!profile.isActive && (
                        <button
                          type="button"
                          className={styles.primaryAction}
                          disabled={
                            collaborationProfilesLoading ||
                            Boolean(switchingProfileId)
                          }
                          onClick={() => void handleActivate(profile)}
                        >
                          {switching ? (
                            <LoaderCircle
                              className={styles.spinner}
                              aria-hidden="true"
                            />
                          ) : null}
                          {switching ? "Alterando" : "Usar este perfil"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {compact && onViewAll && collaborationProfiles.length > 0 && (
        <button
          type="button"
          className={styles.viewAllButton}
          onClick={onViewAll}
        >
          Ver todos os perfis
        </button>
      )}

      {!compact && editingProfile && (
        <CollaborationProfileEditor
          key={`edit:${editingProfile.id}`}
          role={editingProfile.role}
          profile={editingProfile}
          onClose={() => setEditingProfileId(null)}
          onSaved={(profile) => handleProfileSaved(profile, false)}
        />
      )}

      {!compact && creatingRole && (
        <CollaborationProfileEditor
          key={`create:${creatingRole}`}
          role={creatingRole}
          onClose={closeCreation}
          onSaved={(profile) => handleProfileSaved(profile, true)}
        />
      )}
    </div>
  );
}
