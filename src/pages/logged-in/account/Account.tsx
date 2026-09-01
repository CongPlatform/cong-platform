import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import {
  FiAlertCircle,
  FiCalendar,
  FiCamera,
  FiCheck,
  FiEdit2,
  FiLoader,
  FiMail,
  FiUser,
  FiUsers,
  FiX,
} from "react-icons/fi";

import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../contexts/auth-context";
import { checkUsernameAvailability } from "../../../services/accountService";
import { ApiError } from "../../../services/api";
import { buildDefaultAvatarUrl } from "../../../utils/avatar";

import AvatarUploader from "./components/AvatarUploader";
import CollaborationProfilesSection from "./components/CollaborationProfilesSection";
import RepresentationsSection from "./components/RepresentationsSection";

import styles from "./Account.module.css";

const PRONOUN_OPTIONS = [
  {
    id: "he",
    label: "Ele/dele",
    value: "ele/dele",
  },
  {
    id: "she",
    label: "Ela/dela",
    value: "ela/dela",
  },
  {
    id: "they",
    label: "Elu/delu",
    value: "elu/delu",
  },
  {
    id: "skip",
    label: "Prefiro não informar",
    value: null,
  },
] as const;

const USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

const SETTINGS_SECTIONS = [
  {
    id: "overview",
    label: "Perfil",
    icon: FiUser,
  },
  {
    id: "profiles",
    label: "Participação",
    icon: FiUsers,
  },
  {
    id: "representations",
    label: "Representações",
    icon: FiMail,
  },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

type PresetPronouns = "ele/dele" | "ela/dela" | "elu/delu" | null;

interface AccountDraft {
  name: string;
  displayName: string;
  pronouns: PresetPronouns | undefined;
  customPronouns: string;
  useCustomPronouns: boolean;
  username: string;
  bio: string;
}

type UsernameAvailabilityState =
  | {
      state: "idle";
    }
  | {
      state: "checking";
    }
  | {
      state: "available";
      username: string;
    }
  | {
      state: "unavailable";
      username: string;
    }
  | {
      state: "error";
    };

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

function isPresetPronouns(value: string | null): value is PresetPronouns {
  return PRONOUN_OPTIONS.some((option) => option.value === value);
}

function normalizeUsername(value: string): string {
  return value.trim().replace(/^@+/, "").toLowerCase();
}

function getAccountUpdateErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    console.error("Erro desconhecido ao atualizar conta:", error);

    return "Não foi possível atualizar seu perfil.";
  }

  if (error.status === 409 && error.code === "USERNAME_ALREADY_IN_USE") {
    return "Esse @ já está sendo usado. Tente outro nome de usuário.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  return error.message || "Não foi possível atualizar seu perfil.";
}

export default function Account() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    account,
    accountLoading,
    refreshAccount,
    updateAccount,
    uploadAvatar,
    removeAvatar,
  } = useAuth();

  const requestedSection = searchParams.get("tab");
  const activeSection: SettingsSectionId =
    requestedSection === "profiles" || requestedSection === "representations"
      ? requestedSection
      : "overview";
  const [avatarUploaderOpen, setAvatarUploaderOpen] = useState(false);
  const [draft, setDraft] = useState<AccountDraft | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft>({
    type: "unchanged",
  });
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailabilityState>({
      state: "idle",
    });

  const avatarPreviewUrlRef = useRef<string | null>(null);
  const usernameCheckIdRef = useRef(0);

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
    setAvatarDraft({ type: "unchanged" });
  }, [clearAvatarPreview]);

  useEffect(() => {
    return () => {
      clearAvatarPreview();
    };
  }, [clearAvatarPreview]);

  const draftUsername = draft?.username ?? "";
  const persistedAccountUsername = account?.username ?? "";

  useEffect(() => {
    if (!editing || !account) {
      return;
    }

    const normalizedUsername = normalizeUsername(draftUsername);
    const persistedUsername = normalizeUsername(persistedAccountUsername);

    if (normalizedUsername === persistedUsername) {
      return;
    }

    const validFormat =
      normalizedUsername.length >= 3 &&
      normalizedUsername.length <= 30 &&
      USERNAME_PATTERN.test(normalizedUsername);

    if (!validFormat) {
      return;
    }

    const usernameToCheck = normalizedUsername;
    const requestId = ++usernameCheckIdRef.current;

    const timeout = window.setTimeout(async () => {
      setUsernameAvailability({ state: "checking" });

      try {
        const result = await checkUsernameAvailability(usernameToCheck);

        if (requestId !== usernameCheckIdRef.current) {
          return;
        }

        setUsernameAvailability(
          result.available
            ? { state: "available", username: result.username }
            : { state: "unavailable", username: result.username },
        );
      } catch (error) {
        if (requestId !== usernameCheckIdRef.current) {
          return;
        }

        console.error("Não foi possível verificar o @:", error);
        setUsernameAvailability({ state: "error" });
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      usernameCheckIdRef.current += 1;
    };
  }, [editing, account, draftUsername, persistedAccountUsername]);

  function startEditing(): void {
    if (!account) {
      return;
    }

    const currentPronouns = account.pronouns;
    const usesPresetPronouns = isPresetPronouns(currentPronouns);
    const presetPronouns: PresetPronouns | undefined = usesPresetPronouns
      ? currentPronouns
      : undefined;

    setDraft({
      name: account.name,
      displayName: account.displayName ?? "",
      pronouns: presetPronouns,
      customPronouns:
        !usesPresetPronouns && currentPronouns ? currentPronouns : "",
      useCustomPronouns: !usesPresetPronouns && Boolean(currentPronouns),
      username: account.username ?? "",
      bio: account.bio ?? "",
    });

    setUsernameAvailability({ state: "idle" });
    resetAvatarDraft();
    setSaveError("");
    setSaveSuccess("");
  }

  function cancelEditing(): void {
    usernameCheckIdRef.current += 1;
    setUsernameAvailability({ state: "idle" });
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
    setAvatarDraft({ type: "default" });
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (!draft || !account || saving) {
      return;
    }

    const normalizedName = draft.name.trim();
    const normalizedDisplayName = draft.displayName.trim();
    const normalizedUsername = normalizeUsername(draft.username);
    const persistedUsername = normalizeUsername(account.username ?? "");
    const usernameChanged = normalizedUsername !== persistedUsername;

    const finalPronouns = draft.useCustomPronouns
      ? draft.customPronouns.trim()
      : draft.pronouns;

    if (normalizedName.length < 2) {
      setSaveError("Informe seu nome completo.");
      return;
    }

    if (normalizedName.length > 100) {
      setSaveError("Seu nome completo pode ter no máximo 100 caracteres.");
      return;
    }

    if (!normalizedDisplayName) {
      setSaveError("Informe como você gostaria de aparecer na CONG.");
      return;
    }

    if (normalizedDisplayName.length > 60) {
      setSaveError("Seu nome de exibição pode ter no máximo 60 caracteres.");
      return;
    }

    if (finalPronouns === undefined) {
      setSaveError("Escolha seus pronomes ou marque que prefere não informar.");
      return;
    }

    if (draft.useCustomPronouns && !finalPronouns) {
      setSaveError("Informe os pronomes personalizados.");
      return;
    }

    if (finalPronouns && finalPronouns.length > 60) {
      setSaveError("Os pronomes podem ter no máximo 60 caracteres.");
      return;
    }

    if (normalizedUsername.length < 3) {
      setSaveError("Seu @ precisa ter pelo menos 3 caracteres.");
      return;
    }

    if (normalizedUsername.length > 30) {
      setSaveError("Seu @ pode ter no máximo 30 caracteres.");
      return;
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      setSaveError("No @, use apenas letras, números, ponto e underline.");
      return;
    }

    if (usernameChanged && usernameAvailability.state === "unavailable") {
      setSaveError("Esse @ já está sendo usado. Tente outro nome de usuário.");
      return;
    }

    if (
      usernameChanged &&
      (usernameAvailability.state === "idle" ||
        usernameAvailability.state === "checking")
    ) {
      setSaveError("Aguarde a verificação do novo @.");
      return;
    }

    if (usernameChanged && usernameAvailability.state === "error") {
      setSaveError("Não foi possível verificar a disponibilidade do novo @.");
      return;
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      await updateAccount({
        name: normalizedName,
        displayName: normalizedDisplayName,
        pronouns: finalPronouns || null,
        username: normalizedUsername,
        bio: draft.bio,
      });

      if (avatarDraft.type === "upload") {
        await uploadAvatar(avatarDraft.file);
      }

      if (avatarDraft.type === "default" && account.avatarPath) {
        await removeAvatar();
      }

      resetAvatarDraft();
      setUsernameAvailability({ state: "idle" });
      setDraft(null);
      setAvatarUploaderOpen(false);
      setSaveSuccess("Perfil atualizado com sucesso.");
    } catch (error) {
      setSaveError(getAccountUpdateErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (accountLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingShell} aria-label="Carregando sua conta">
          <div className={styles.loadingHero}>
            <span className={styles.loadingAvatar} />
            <div className={styles.loadingIdentity}>
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className={styles.loadingBody}>
            <span />
            <span />
            <span />
          </div>
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className={styles.page}>
        <div className={styles.accountErrorState}>
          <strong>Não foi possível carregar sua conta.</strong>
          <p>Tente novamente para buscar os dados mais recentes.</p>
          <button type="button" onClick={() => void refreshAccount()}>
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  const persistedUsername = normalizeUsername(account.username ?? "");
  const normalizedDraftUsername = draft
    ? normalizeUsername(draft.username)
    : persistedUsername;

  const usernameChanged = Boolean(
    editing && draft && normalizedDraftUsername !== persistedUsername,
  );

  const usernameHasValidFormat =
    normalizedDraftUsername.length >= 3 &&
    normalizedDraftUsername.length <= 30 &&
    USERNAME_PATTERN.test(normalizedDraftUsername);

  const draftPronouns = draft?.useCustomPronouns
    ? draft.customPronouns.trim()
    : draft?.pronouns;

  const displayedName =
    editing && draft
      ? draft.displayName.trim() || account.displayName || account.name
      : account.displayName || account.name;

  const displayedUsername =
    editing && draft ? normalizedDraftUsername : account.username;
  const displayedPronouns = editing && draft ? draftPronouns : account.pronouns;

  const avatarSource =
    editing && draft
      ? {
          ...account,
          name: draft.name || account.name,
          username: normalizedDraftUsername || null,
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

  const memberSince = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(account.createdAt));

  const nameError =
    draft && draft.name.trim().length < 2
      ? "Informe seu nome completo."
      : draft && draft.name.trim().length > 100
        ? "Use no máximo 100 caracteres."
        : "";

  const displayNameError =
    draft && !draft.displayName.trim()
      ? "Informe como você quer aparecer na CONG."
      : draft && draft.displayName.trim().length > 60
        ? "Use no máximo 60 caracteres."
        : "";

  const pronounsError =
    draft?.useCustomPronouns && !draft.customPronouns.trim()
      ? "Informe os pronomes personalizados."
      : draftPronouns && draftPronouns.length > 60
        ? "Use no máximo 60 caracteres."
        : "";

  const usernameError =
    draft && normalizedDraftUsername.length < 3
      ? "Seu @ precisa ter pelo menos 3 caracteres."
      : draft && normalizedDraftUsername.length > 30
        ? "Seu @ pode ter no máximo 30 caracteres."
        : draft && !USERNAME_PATTERN.test(normalizedDraftUsername)
          ? "Use apenas letras, números, ponto e underline."
          : "";

  const usernameReady =
    !usernameChanged || usernameAvailability.state === "available";

  const formCanSubmit =
    Boolean(draft) &&
    !nameError &&
    !displayNameError &&
    !pronounsError &&
    !usernameError &&
    usernameHasValidFormat &&
    usernameReady &&
    !saving;
  function selectSection(section: SettingsSectionId): void {
    if (section === "overview") {
      setSearchParams({});
      return;
    }

    setSearchParams({ tab: section });
  }

  return (
    <>
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <h1>Meu perfil</h1>

          {!editing ? (
            <button
              type="button"
              className={styles.editButton}
              onClick={startEditing}
            >
              <FiEdit2 aria-hidden="true" />
              Editar perfil
            </button>
          ) : (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={cancelEditing}
              disabled={saving}
            >
              <FiX aria-hidden="true" />
              Cancelar edição
            </button>
          )}
        </header>

        <section className={styles.profileSurface}>
          <div className={styles.profileSummary}>
            <button
              type="button"
              className={styles.avatarButton}
              data-editing={editing ? "true" : undefined}
              disabled={!editing || saving}
              aria-label={editing ? "Alterar foto de perfil" : undefined}
              onClick={() => {
                if (editing) {
                  setAvatarUploaderOpen(true);
                }
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

            <div className={styles.profileIdentity}>
              <h2>{displayedName}</h2>

              <div className={styles.profileMeta}>
                <span>
                  {displayedUsername
                    ? `@${displayedUsername}`
                    : "Sem nome de usuário"}
                </span>

                <i aria-hidden="true">•</i>

                <span>{displayedPronouns || "Pronomes não informados"}</span>
              </div>

              <p
                className={
                  account.bio ? styles.summaryBio : styles.emptySummaryBio
                }
              >
                {account.bio ||
                  "Adicione uma bio para se apresentar melhor na comunidade."}
              </p>
            </div>

            <dl className={styles.summaryFacts}>
              <div className={styles.summaryFact}>
                <span className={styles.summaryFactIcon} aria-hidden="true">
                  <FiUser />
                </span>

                <div>
                  <dt>Nome completo</dt>
                  <dd>{account.name}</dd>
                </div>
              </div>

              <div className={styles.summaryFact}>
                <span className={styles.summaryFactIcon} aria-hidden="true">
                  <FiCalendar />
                </span>

                <div>
                  <dt>Membro desde</dt>
                  <dd>{memberSince}</dd>
                </div>
              </div>
            </dl>
          </div>

          {!editing && (
            <nav className={styles.sectionTabs} aria-label="Seções do perfil">
              {SETTINGS_SECTIONS.map((section) => {
                const Icon = section.icon;
                const selected = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`${styles.sectionTab} ${
                      selected ? styles.sectionTabActive : ""
                    }`}
                    aria-current={selected ? "page" : undefined}
                    onClick={() => selectSection(section.id)}
                  >
                    <Icon aria-hidden="true" />
                    {section.label}
                  </button>
                );
              })}
            </nav>
          )}
        </section>

        {saveSuccess && !editing && (
          <div className={styles.successMessage}>{saveSuccess}</div>
        )}

        {!editing && activeSection === "overview" && (
          <section className={styles.overviewSurface}>
            <div className={styles.profileOverviewColumn}>
              <section className={styles.aboutSection}>
                <h2>Sobre</h2>

                <p className={account.bio ? styles.bio : styles.emptyBio}>
                  {account.bio ||
                    "Sua bio ainda está vazia. Use a edição do perfil para contar um pouco sobre você."}
                </p>
              </section>

              <section className={styles.essentialSection}>
                <h2>Informações essenciais</h2>

                <dl className={styles.accountFacts}>
                  <div>
                    <span className={styles.factIcon} aria-hidden="true">
                      <FiUser />
                    </span>
                    <dt>Nome público</dt>
                    <dd>{account.displayName || account.name}</dd>
                  </div>

                  <div>
                    <span className={styles.factIcon} aria-hidden="true">
                      @
                    </span>
                    <dt>Nome de usuário</dt>
                    <dd>
                      {displayedUsername
                        ? `@${displayedUsername}`
                        : "Não definido"}
                    </dd>
                  </div>

                  <div>
                    <span className={styles.factIcon} aria-hidden="true">
                      <FiUsers />
                    </span>
                    <dt>Pronomes</dt>
                    <dd>{displayedPronouns || "Não informado"}</dd>
                  </div>

                  <div>
                    <span className={styles.factIcon} aria-hidden="true">
                      <FiCalendar />
                    </span>
                    <dt>Entrada na plataforma</dt>
                    <dd>{memberSince}</dd>
                  </div>
                </dl>
              </section>
            </div>

            <section className={styles.overviewModule}>
              <header className={styles.moduleHeader}>
                <FiUsers aria-hidden="true" />
                <h2>Participação</h2>
              </header>

              <CollaborationProfilesSection
                compact
                onViewAll={() => selectSection("profiles")}
              />
            </section>

            <section className={styles.overviewModule}>
              <header className={styles.moduleHeader}>
                <FiMail aria-hidden="true" />
                <h2>Representações</h2>
              </header>

              <RepresentationsSection
                compact
                onViewAll={() => selectSection("representations")}
              />
            </section>
          </section>
        )}

        {!editing && activeSection === "profiles" && (
          <section className={styles.tabContent}>
            <header className={styles.tabHeader}>
              <div>
                <h2>Participação</h2>
                <p>
                  Seus perfis mostram as diferentes formas como você participa
                  da comunidade.
                </p>
              </div>
            </header>

            <CollaborationProfilesSection />
          </section>
        )}

        {!editing && activeSection === "representations" && (
          <section className={styles.tabContent}>
            <header className={styles.tabHeader}>
              <div>
                <h2>Representações</h2>
                <p>
                  Organizações que você representa ou solicita representar
                  dentro da CONG.
                </p>
              </div>
            </header>

            <RepresentationsSection />
          </section>
        )}

        {editing && draft && (
          <form className={styles.editForm} onSubmit={handleSubmit} noValidate>
            <header className={styles.editHeader}>
              <span className={styles.sectionKicker}>Edição</span>
              <h2>Informações do perfil</h2>
              <p>
                Altere apenas os dados pessoais aqui. Participação e
                representações continuam em suas próprias seções.
              </p>
            </header>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="account-name">Nome completo</label>
                <input
                  id="account-name"
                  type="text"
                  value={draft.name}
                  maxLength={100}
                  required
                  disabled={saving}
                  autoComplete="name"
                  aria-invalid={Boolean(nameError)}
                  onChange={(event) => {
                    setDraft({ ...draft, name: event.target.value });
                    setSaveError("");
                  }}
                />
                {nameError ? (
                  <span className={styles.fieldErrorText}>{nameError}</span>
                ) : (
                  <small>Nome vinculado aos dados da sua conta.</small>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="account-display-name">Nome de exibição</label>
                <input
                  id="account-display-name"
                  type="text"
                  value={draft.displayName}
                  maxLength={60}
                  required
                  disabled={saving}
                  autoComplete="nickname"
                  aria-invalid={Boolean(displayNameError)}
                  onChange={(event) => {
                    setDraft({ ...draft, displayName: event.target.value });
                    setSaveError("");
                  }}
                />
                {displayNameError ? (
                  <span className={styles.fieldErrorText}>
                    {displayNameError}
                  </span>
                ) : (
                  <small>
                    É assim que seu nome aparece publicamente na CONG.
                  </small>
                )}
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
                    autoCorrect="off"
                    spellCheck={false}
                    aria-invalid={Boolean(
                      usernameError ||
                      usernameAvailability.state === "unavailable",
                    )}
                    onChange={(event) => {
                      usernameCheckIdRef.current += 1;
                      setUsernameAvailability({ state: "idle" });
                      setDraft({
                        ...draft,
                        username: event.target.value.replace(/^@+/, ""),
                      });
                      setSaveError("");
                    }}
                  />
                </div>

                {usernameError ? (
                  <span className={styles.fieldErrorText}>{usernameError}</span>
                ) : (
                  <div className={styles.usernameStatus} aria-live="polite">
                    {!usernameChanged && (
                      <span className={styles.usernameCurrent}>
                        Este é seu @ atual.
                      </span>
                    )}
                    {usernameChanged &&
                      usernameAvailability.state === "checking" && (
                        <span className={styles.usernameChecking}>
                          <FiLoader
                            className={styles.usernameSpinner}
                            aria-hidden="true"
                          />
                          Verificando disponibilidade...
                        </span>
                      )}
                    {usernameChanged &&
                      usernameAvailability.state === "available" && (
                        <span className={styles.usernameAvailable}>
                          <FiCheck aria-hidden="true" />@
                          {usernameAvailability.username} está disponível.
                        </span>
                      )}
                    {usernameChanged &&
                      usernameAvailability.state === "unavailable" && (
                        <span className={styles.usernameUnavailable}>
                          <FiX aria-hidden="true" />@
                          {usernameAvailability.username} já está em uso.
                        </span>
                      )}
                    {usernameChanged &&
                      usernameAvailability.state === "error" && (
                        <span className={styles.usernameCheckError}>
                          <FiAlertCircle aria-hidden="true" />
                          Não foi possível verificar agora.
                        </span>
                      )}
                    {usernameChanged &&
                      usernameHasValidFormat &&
                      usernameAvailability.state === "idle" && (
                        <span className={styles.usernameCurrent}>
                          Aguardando verificação...
                        </span>
                      )}
                  </div>
                )}
                <small>
                  3 a 30 caracteres. Letras, números, ponto e underline.
                </small>
              </div>

              <fieldset className={`${styles.field} ${styles.pronounsField}`}>
                <legend>Pronomes</legend>
                <div className={styles.pronounChoices}>
                  {PRONOUN_OPTIONS.map((option) => {
                    const selected =
                      !draft.useCustomPronouns &&
                      draft.pronouns === option.value;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        className={`${styles.pronounChoice} ${selected ? styles.pronounChoiceSelected : ""}`}
                        aria-pressed={selected}
                        disabled={saving}
                        onClick={() => {
                          setDraft({
                            ...draft,
                            useCustomPronouns: false,
                            pronouns: option.value,
                          });
                          setSaveError("");
                        }}
                      >
                        {selected && <FiCheck aria-hidden="true" />}
                        {option.label}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    className={`${styles.pronounChoice} ${draft.useCustomPronouns ? styles.pronounChoiceSelected : ""}`}
                    aria-pressed={draft.useCustomPronouns}
                    disabled={saving}
                    onClick={() => {
                      setDraft({
                        ...draft,
                        useCustomPronouns: true,
                        pronouns: undefined,
                      });
                      setSaveError("");
                    }}
                  >
                    {draft.useCustomPronouns && <FiCheck aria-hidden="true" />}
                    Outro
                  </button>
                </div>

                {draft.useCustomPronouns && (
                  <label className={styles.customPronouns}>
                    <span>Como devemos mostrar?</span>
                    <input
                      type="text"
                      value={draft.customPronouns}
                      maxLength={60}
                      disabled={saving}
                      placeholder="Ex.: ela/dela"
                      aria-invalid={Boolean(pronounsError)}
                      onChange={(event) => {
                        setDraft({
                          ...draft,
                          customPronouns: event.target.value,
                        });
                        setSaveError("");
                      }}
                    />
                  </label>
                )}

                {pronounsError && (
                  <span className={styles.fieldErrorText}>{pronounsError}</span>
                )}
              </fieldset>

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
                  onChange={(event) => {
                    setDraft({ ...draft, bio: event.target.value });
                    setSaveError("");
                  }}
                />
              </div>
            </div>

            {saveError && (
              <p className={styles.errorMessage} role="alert">
                {saveError}
              </p>
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
                disabled={!formCanSubmit}
              >
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </footer>
          </form>
        )}
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
