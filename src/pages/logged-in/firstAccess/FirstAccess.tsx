import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import {
  ArrowRight,
  AtSign,
  Check,
  ChevronRight,
  LogOut,
  UserRound,
  LoaderCircle,
  X,
} from "lucide-react";

import { Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../../contexts/auth-context";
import { ApiError } from "../../../services/api";
import { saveOnboardingIdentity } from "../../../services/onboardingService";
import { checkUsernameAvailability } from "../../../services/accountService";

import logo from "../../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../../assets/mascot/cong-thinking.webp";
import styles from "./FirstAccess.module.css";

const PRONOUN_OPTIONS = [
  { id: "he", label: "Ele/dele", value: "ele/dele" },
  { id: "she", label: "Ela/dela", value: "ela/dela" },
  { id: "they", label: "Elu/delu", value: "elu/delu" },
  { id: "skip", label: "Prefiro não informar", value: null },
] as const;

const USERNAME_PATTERN = /^[A-Za-z0-9._]+$/;

type UsernameAvailabilityState =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; username: string }
  | { state: "unavailable"; username: string }
  | { state: "error" };

function getSuggestedFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

function getIdentityErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    console.error("Erro desconhecido no onboarding:", error);
    return "Não foi possível salvar suas informações.";
  }

  if (error.status === 409 && error.code === "USERNAME_ALREADY_IN_USE") {
    return "Esse @ já está sendo usado. Tente outro nome de usuário.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  return error.message || "Não foi possível continuar agora.";
}

type FirstAccessAccount = NonNullable<ReturnType<typeof useAuth>["account"]>;

export default function FirstAccess() {
  const { account, accountLoading } = useAuth();

  if (accountLoading && !account) {
    return (
      <main className={styles.loadingPage}>
        <p>Preparando seu primeiro acesso...</p>
      </main>
    );
  }

  if (!account) {
    return null;
  }

  if (account.onboardingStep === "roles") {
    return <Navigate to="/app/escolher-funcao" replace />;
  }

  if (account.onboardingStep === "profiles") {
    const firstRole = account.onboardingRoles[0];

    return (
      <Navigate
        to={
          firstRole ? `/app/criar-perfil/${firstRole}` : "/app/escolher-funcao"
        }
        replace
      />
    );
  }

  if (account.onboardingStep === "completed") {
    return <Navigate to="/app/comunidade" replace />;
  }

  return <FirstAccessIdentity account={account} />;
}

function FirstAccessIdentity({ account }: { account: FirstAccessAccount }) {
  const navigate = useNavigate();
  const { refreshAccount, logout } = useAuth();

  const accountPronouns = account.pronouns ?? "";
  const accountUsesPresetPronouns =
    accountPronouns.length > 0 &&
    PRONOUN_OPTIONS.some((option) => option.value === accountPronouns);

  const [displayName, setDisplayName] = useState(account.displayName ?? "");
  const [usernameAvailability, setUsernameAvailability] =
    useState<UsernameAvailabilityState>({
      state: "idle",
    });

  const usernameCheckIdRef = useRef(0);
  const [username, setUsername] = useState(account.username ?? "");
  const [pronouns, setPronouns] = useState<string | null | undefined>(
    accountUsesPresetPronouns ? accountPronouns : undefined,
  );
  const [customPronouns, setCustomPronouns] = useState(
    accountPronouns && !accountUsesPresetPronouns ? accountPronouns : "",
  );
  const [useCustomPronouns, setUseCustomPronouns] = useState(
    Boolean(accountPronouns && !accountUsesPresetPronouns),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [introReady, setIntroReady] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIntroReady(true);
    }, 180);

    return () => window.clearTimeout(timeout);
  }, []);

  const normalizedUsername = username.trim().replace(/^@+/, "").toLowerCase();
  const usernameHasValidFormat =
    normalizedUsername.length >= 3 &&
    normalizedUsername.length <= 30 &&
    USERNAME_PATTERN.test(normalizedUsername);

  const finalPronouns = useCustomPronouns
    ? customPronouns.trim() || null
    : pronouns === undefined
      ? undefined
      : pronouns;

  const displayArticle = useMemo(() => {
    if (useCustomPronouns) {
      return "";
    }

    if (pronouns === "ele/dele") {
      return "o";
    }

    if (pronouns === "ela/dela") {
      return "a";
    }

    return "";
  }, [pronouns, useCustomPronouns]);

  const validationMessage = useMemo(() => {
    const name = displayName.trim();

    if (!name) {
      return "Digite como você gostaria de ser chamado.";
    }

    if (name.length > 60) {
      return "Use no máximo 60 caracteres no nome de exibição.";
    }

    if (finalPronouns === undefined) {
      return "Escolha seus pronomes ou marque que prefere não informar.";
    }

    if (finalPronouns && finalPronouns.length > 60) {
      return "Use no máximo 60 caracteres nos pronomes.";
    }

    if (normalizedUsername.length < 3) {
      return "Seu @ precisa ter pelo menos 3 caracteres.";
    }

    if (normalizedUsername.length > 30) {
      return "Seu @ pode ter no máximo 30 caracteres.";
    }

    if (!USERNAME_PATTERN.test(normalizedUsername)) {
      return "No @, use apenas letras, números, ponto e underline.";
    }

    if (
      usernameAvailability.state === "unavailable" &&
      usernameAvailability.username === normalizedUsername
    ) {
      return "Esse @ já está sendo usado. Tente outro nome de usuário.";
    }

    return "";
  }, [displayName, finalPronouns, normalizedUsername, usernameAvailability]);

  useEffect(() => {
    if (!usernameHasValidFormat) {
      return;
    }

    const usernameToCheck = normalizedUsername;
    const requestId = ++usernameCheckIdRef.current;

    const timeout = window.setTimeout(async () => {
      setUsernameAvailability({
        state: "checking",
      });

      try {
        const result = await checkUsernameAvailability(usernameToCheck);

        if (requestId !== usernameCheckIdRef.current) {
          return;
        }

        setUsernameAvailability(
          result.available
            ? {
                state: "available",
                username: result.username,
              }
            : {
                state: "unavailable",
                username: result.username,
              },
        );
      } catch (error) {
        if (requestId !== usernameCheckIdRef.current) {
          return;
        }

        console.error("Não foi possível verificar o @:", error);

        setUsernameAvailability({
          state: "error",
        });
      }
    }, 500);

    return () => {
      window.clearTimeout(timeout);

      /*
       * Invalida qualquer resposta antiga
       * que ainda esteja viajando pela rede.
       */
      usernameCheckIdRef.current += 1;
    };
  }, [normalizedUsername, usernameHasValidFormat]);

  const suggestedFirstName = getSuggestedFirstName(account.name);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (validationMessage || isSaving) {
      setErrorMessage(validationMessage);
      return;
    }

    setErrorMessage("");
    setIsSaving(true);

    try {
      await saveOnboardingIdentity({
        displayName: displayName.trim(),
        pronouns: finalPronouns ?? null,
        username: normalizedUsername,
      });

      await refreshAccount();

      navigate("/app/escolher-funcao", {
        replace: true,
      });
    } catch (error) {
      setErrorMessage(getIdentityErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

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

      <section className={styles.stage}>
        <div className={styles.decorGrid} aria-hidden="true" />

        <div className={styles.leftPane}>
          <div
            className={`${styles.intro} ${introReady ? styles.introReady : ""}`}
          >
            <p className={styles.kicker}>Primeiro acesso</p>

            <div className={styles.helloLine}>
              <span className={styles.helloText}>
                Oi, eu sou{displayArticle && ` ${displayArticle}`}
              </span>

              <label className={styles.nameSlot}>
                <span className={styles.srOnly}>
                  Como você gostaria de ser chamado?
                </span>

                <input
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="seu nome aqui"
                  maxLength={60}
                  autoComplete="nickname"
                  autoFocus
                />

                <span className={styles.nameUnderline} aria-hidden="true" />
              </label>
            </div>

            {!displayName.trim() && (
              <p className={styles.nameHint}>
                <ChevronRight aria-hidden="true" />
                Digite o nome que você quer usar na CONG.
              </p>
            )}

            <p className={styles.registeredName}>
              Seu cadastro continua vinculado a <strong>{account.name}</strong>.
              {suggestedFirstName && (
                <> Aqui você escolhe apenas como quer aparecer.</>
              )}
              <>
                {" "}
                Seu nome de exibição pode se repetir; o @ é o identificador
                único da sua conta.
              </>
            </p>
          </div>

          <div className={styles.bandMoment}>
            <span className={styles.bandDot} aria-hidden="true" />
            <span>Seu lugar no bando CONG começa aqui.</span>
          </div>

          <img
            src={mascot}
            alt="Mascote Cong observando o primeiro acesso"
            className={styles.mascot}
          />
        </div>

        <form
          className={styles.formCard}
          onSubmit={(event) => void handleSubmit(event)}
        >
          <div className={styles.formHeading}>
            <span className={styles.stepBadge}>1 de 2</span>
            <div>
              <h1>Antes de começar</h1>
              <p>
                Três escolhas rápidas para deixar seu perfil com a sua cara.
              </p>
            </div>
          </div>

          <fieldset className={styles.fieldset}>
            <legend>Quais pronomes você usa?</legend>

            <div className={styles.chipGrid}>
              {PRONOUN_OPTIONS.map((option) => {
                const selected =
                  !useCustomPronouns &&
                  pronouns !== undefined &&
                  pronouns === option.value;

                return (
                  <button
                    key={option.id}
                    type="button"
                    className={`${styles.choiceChip} ${
                      selected ? styles.choiceChipSelected : ""
                    }`}
                    aria-pressed={selected}
                    onClick={() => {
                      setUseCustomPronouns(false);
                      setPronouns(option.value);
                      setErrorMessage("");
                    }}
                  >
                    {selected && <Check aria-hidden="true" />}
                    {option.label}
                  </button>
                );
              })}

              <button
                type="button"
                className={`${styles.choiceChip} ${
                  useCustomPronouns ? styles.choiceChipSelected : ""
                }`}
                aria-pressed={useCustomPronouns}
                onClick={() => {
                  setUseCustomPronouns(true);
                  setPronouns(undefined);
                  setErrorMessage("");
                }}
              >
                {useCustomPronouns && <Check aria-hidden="true" />}
                Outro
              </button>
            </div>

            {useCustomPronouns && (
              <label className={styles.customPronouns}>
                <span>Como devemos mostrar?</span>
                <input
                  value={customPronouns}
                  onChange={(event) => {
                    setCustomPronouns(event.target.value);
                    setErrorMessage("");
                  }}
                  placeholder="Ex.: ela/dela"
                  maxLength={60}
                />
              </label>
            )}
          </fieldset>

          <div className={styles.fieldBlock}>
            <label htmlFor="onboarding-username">Escolha seu @</label>
            <p>Ele identifica seu perfil público na comunidade.</p>

            <div className={styles.usernameField}>
              <AtSign aria-hidden="true" />
              <input
                id="onboarding-username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value.replace(/^@+/, ""));

                  usernameCheckIdRef.current += 1;

                  setUsernameAvailability({
                    state: "idle",
                  });

                  setErrorMessage("");
                }}
                placeholder="seu.usuario"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={30}
              />
            </div>

            <div className={styles.usernameStatus} aria-live="polite">
              {usernameAvailability.state === "checking" && (
                <span className={styles.usernameChecking}>
                  <LoaderCircle
                    className={styles.usernameSpinner}
                    aria-hidden="true"
                  />
                  Verificando disponibilidade...
                </span>
              )}

              {usernameAvailability.state === "available" && (
                <span className={styles.usernameAvailable}>
                  <Check aria-hidden="true" />@{usernameAvailability.username}{" "}
                  está disponível.
                </span>
              )}

              {usernameAvailability.state === "unavailable" && (
                <span className={styles.usernameUnavailable}>
                  <X aria-hidden="true" />@{usernameAvailability.username} já
                  está em uso.
                </span>
              )}

              {usernameAvailability.state === "error" && (
                <span className={styles.usernameCheckError}>
                  Não foi possível verificar agora.
                </span>
              )}
            </div>

            <span className={styles.fieldFootnote}>
              Letras, números, ponto e underline. Você poderá editar depois.
            </span>
          </div>

          {errorMessage && (
            <div className={styles.error} role="alert">
              <UserRound aria-hidden="true" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            className={styles.continueButton}
            disabled={isSaving}
          >
            <span>{isSaving ? "Salvando..." : "Continuar"}</span>
            <ArrowRight aria-hidden="true" />
          </button>
        </form>
      </section>
    </main>
  );
}
