import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  FiArrowLeft,
  FiCalendar,
  FiCamera,
  FiEdit2,
  FiMail,
  FiUser,
  FiX,
} from "react-icons/fi";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../contexts/auth-context";
import { buildDefaultAvatarUrl } from "../../../utils/avatar";

import AvatarUploader from "./components/AvatarUploader";

import styles from "./Account.module.css";

interface AccountDraft {
  name: string;
  username: string;
  bio: string;
}

type AvatarDraft =
  | {
      type: "unchanged";
    }
  | {
      type: "upload";
      file: File;
      previewUrl: string;
    }
  | {
      type: "default";
    };

export default function Account() {
  const navigate = useNavigate();

  const { account, accountLoading, updateAccount, uploadAvatar, removeAvatar } =
    useAuth();

  const [avatarUploaderOpen, setAvatarUploaderOpen] = useState(false);

  const [draft, setDraft] = useState<AccountDraft | null>(null);

  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>({
    type: "unchanged",
  });

  const avatarPreviewUrlRef = useRef<string | null>(null);

  const [saving, setSaving] = useState(false);

  const [saveError, setSaveError] = useState("");

  const [saveSuccess, setSaveSuccess] = useState("");

  const editing = draft !== null;

  const clearAvatarPreview = useCallback((): void => {
    if (!avatarPreviewUrlRef.current) {
      return;
    }

    URL.revokeObjectURL(avatarPreviewUrlRef.current);

    avatarPreviewUrlRef.current = null;
  }, []);

  const resetAvatarDraft = useCallback((): void => {
    clearAvatarPreview();

    setAvatarDraft({
      type: "unchanged",
    });
  }, [clearAvatarPreview]);

  useEffect(() => {
    return () => {
      clearAvatarPreview();
    };
  }, [clearAvatarPreview]);

  function startEditing(): void {
    if (!account) {
      return;
    }

    setDraft({
      name: account.name,
      username: account.username ?? "",
      bio: account.bio ?? "",
    });

    resetAvatarDraft();

    setSaveError("");
    setSaveSuccess("");
  }

  function cancelEditing(): void {
    resetAvatarDraft();

    setDraft(null);

    setAvatarUploaderOpen(false);

    setSaveError("");
  }

  function handleAvatarSelected(file: File): void {
    clearAvatarPreview();

    const previewUrl = URL.createObjectURL(file);

    avatarPreviewUrlRef.current = previewUrl;

    setAvatarDraft({
      type: "upload",
      file,
      previewUrl,
    });
  }

  function handleUseDefaultAvatar(): void {
    clearAvatarPreview();

    setAvatarDraft({
      type: "default",
    });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!draft || !account) {
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      await updateAccount({
        name: draft.name,
        username: draft.username,
        bio: draft.bio,
      });

      if (avatarDraft.type === "upload") {
        await uploadAvatar(avatarDraft.file);
      }

      if (avatarDraft.type === "default" && account.avatarPath) {
        await removeAvatar();
      }

      resetAvatarDraft();

      setDraft(null);

      setAvatarUploaderOpen(false);

      setSaveSuccess("Perfil atualizado com sucesso.");
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);

      setSaveError(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o perfil.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (accountLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>Carregando sua conta...</div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className={styles.page}>
        <div className={styles.state}>
          Não foi possível carregar os dados da conta.
        </div>
      </main>
    );
  }

  const avatarSource =
    editing && draft
      ? {
          ...account,
          name: draft.name,
          username: draft.username.trim() || null,
        }
      : account;

  const defaultAvatarUrl = buildDefaultAvatarUrl(avatarSource);

  const persistedAvatarUrl = account.avatarPath || defaultAvatarUrl;

  const displayedAvatarUrl =
    avatarDraft.type === "upload"
      ? avatarDraft.previewUrl
      : avatarDraft.type === "default"
        ? defaultAvatarUrl
        : persistedAvatarUrl;

  const defaultAvatarSelected =
    avatarDraft.type === "default" ||
    (avatarDraft.type === "unchanged" && !account.avatarPath);

  /*
   * Durante a edição, nome e @username
   * também são refletidos no cabeçalho.
   */
  const displayedName =
    editing && draft ? draft.name || account.name : account.name;

  const displayedUsername =
    editing && draft ? draft.username.trim() : account.username;

  const memberSince = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(account.createdAt));

  return (
    <>
      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.topbar}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/app/comunidade")}
            >
              <FiArrowLeft />
              Voltar para a comunidade
            </button>
          </div>

          <article className={styles.profileCard}>
            <header className={styles.profileHero}>
              <button
                type="button"
                className={styles.avatarButton}
                data-editing={editing ? "true" : undefined}
                disabled={!editing || saving}
                aria-label={editing ? "Alterar foto de perfil" : undefined}
                onClick={() => {
                  if (!editing) {
                    return;
                  }

                  setAvatarUploaderOpen(true);
                }}
              >
                <div className={styles.avatar}>
                  <div className={styles.avatarMedia}>
                    <img
                      src={displayedAvatarUrl}
                      alt={`Avatar de ${displayedName}`}
                    />
                  </div>

                  {editing && (
                    <span className={styles.avatarEditBadge} aria-hidden="true">
                      <FiCamera />
                    </span>
                  )}

                  {editing && (
                    <span className={styles.avatarOverlay} aria-hidden="true">
                      <FiCamera />

                      <span>Alterar</span>
                    </span>
                  )}
                </div>
              </button>

              <div className={styles.heroIdentity}>
                <span className={styles.heroEyebrow}>Perfil</span>

                <h1>{displayedName}</h1>

                <span className={styles.username}>
                  {displayedUsername
                    ? `@${displayedUsername}`
                    : "Sem nome de usuário"}
                </span>
              </div>

              <div className={styles.heroActions}>
                {!editing ? (
                  <button
                    type="button"
                    className={styles.editButton}
                    onClick={startEditing}
                  >
                    <FiEdit2 />
                    Editar perfil
                  </button>
                ) : (
                  <button
                    type="button"
                    className={styles.heroCancelButton}
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    <FiX />
                    Cancelar
                  </button>
                )}
              </div>
            </header>

            {!editing && (
              <div className={styles.profileContent}>
                {saveSuccess && (
                  <div className={styles.successMessage}>{saveSuccess}</div>
                )}

                <div className={styles.infoGrid}>
                  <section
                    className={`${styles.infoPanel} ${styles.aboutPanel}`}
                  >
                    <div className={styles.panelHeader}>
                      <span className={styles.panelIcon}>
                        <FiUser />
                      </span>

                      <div>
                        <span className={styles.panelEyebrow}>Perfil</span>

                        <h2>Sobre</h2>
                      </div>
                    </div>

                    <p className={account.bio ? styles.bio : styles.emptyBio}>
                      {account.bio || "Nenhuma bio adicionada."}
                    </p>
                  </section>

                  <section className={styles.infoPanel}>
                    <div className={styles.panelHeader}>
                      <span className={styles.panelIcon}>
                        <FiMail />
                      </span>

                      <div>
                        <span className={styles.panelEyebrow}>Informações</span>

                        <h2>Conta</h2>
                      </div>
                    </div>

                    <div className={styles.accountDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailIcon}>
                          <FiMail />
                        </span>

                        <div>
                          <span className={styles.detailLabel}>E-mail</span>

                          <strong>{account.email}</strong>
                        </div>
                      </div>

                      <div className={styles.detailRow}>
                        <span className={styles.detailIcon}>
                          <FiCalendar />
                        </span>

                        <div>
                          <span className={styles.detailLabel}>
                            Membro desde
                          </span>

                          <strong>{memberSince}</strong>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {editing && draft && (
              <form className={styles.editForm} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="account-name">Nome</label>

                    <input
                      id="account-name"
                      type="text"
                      value={draft.name}
                      maxLength={100}
                      required
                      disabled={saving}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          name: event.target.value,
                        })
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="account-username">Nome de usuário</label>

                    <div className={styles.usernameInput}>
                      <span>@</span>

                      <input
                        id="account-username"
                        type="text"
                        value={draft.username}
                        minLength={3}
                        maxLength={30}
                        required
                        disabled={saving}
                        autoCapitalize="none"
                        spellCheck={false}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            username: event.target.value,
                          })
                        }
                      />
                    </div>

                    <small>
                      3 a 30 caracteres. Letras, números, ponto e underline.
                    </small>
                  </div>

                  <div className={`${styles.field} ${styles.bioField}`}>
                    <div className={styles.fieldHeading}>
                      <label htmlFor="account-bio">Bio</label>

                      <span>{draft.bio.length}/300</span>
                    </div>

                    <textarea
                      id="account-bio"
                      value={draft.bio}
                      maxLength={300}
                      rows={5}
                      disabled={saving}
                      placeholder="Conte um pouco sobre você..."
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          bio: event.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {saveError && (
                  <p className={styles.errorMessage}>{saveError}</p>
                )}

                <footer className={styles.formActions}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={cancelEditing}
                    disabled={saving}
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    className={styles.primaryButton}
                    disabled={saving}
                  >
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </button>
                </footer>
              </form>
            )}
          </article>
        </div>
      </main>

      <AvatarUploader
        open={avatarUploaderOpen}
        currentAvatarUrl={displayedAvatarUrl}
        defaultAvatarUrl={defaultAvatarUrl}
        usingDefaultAvatar={defaultAvatarSelected}
        name={displayedName}
        onSelectFile={handleAvatarSelected}
        onUseDefault={handleUseDefaultAvatar}
        onClose={() => setAvatarUploaderOpen(false)}
      />
    </>
  );
}
