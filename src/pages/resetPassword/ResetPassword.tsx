import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, KeyRound, LogIn, ShieldCheck, Sparkles } from "lucide-react";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";
import PasswordFields from "../../components/passwordFields/PasswordFields";
import type { BreachStatus } from "../../components/passwordFields/passwordUtils";

import { supabase } from "../../services/supabase";

import logo from "../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../assets/mascot/cong-default.webp";

import styles from "./ResetPassword.module.css";

type PasswordForm = {
  password: string;
  confirmPassword: string;
};

export default function ResetPassword() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState<PasswordForm>({
    password: "",
    confirmPassword: "",
  });

  const [checkingSession, setCheckingSession] = useState(true);
  const [validSession, setValidSession] = useState(false);
  const [updated, setUpdated] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");

  const [breachStatus] = useState<BreachStatus>({
    state: "idle",
  });

  useEffect(() => {
    let mounted = true;

    const checkRecoverySession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!mounted) return;

      setValidSession(Boolean(session));
      setCheckingSession(false);
    };

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY") {
        setValidSession(Boolean(session));
        setCheckingSession(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = (value: string) => {
    setFormData((current) => ({
      ...current,
      password: value,
    }));

    setPasswordError("");
    setErrorMessage("");
  };

  const updateConfirmPassword = (value: string) => {
    setFormData((current) => ({
      ...current,
      confirmPassword: value,
    }));

    setConfirmPasswordError("");
    setErrorMessage("");
  };

  const validate = () => {
    let valid = true;

    if (formData.password.length < 10) {
      setPasswordError("A senha deve ter pelo menos 10 caracteres.");
      valid = false;
    } else {
      setPasswordError("");
    }

    if (!formData.confirmPassword) {
      setConfirmPasswordError("Confirme sua nova senha.");
      valid = false;
    } else if (formData.password !== formData.confirmPassword) {
      setConfirmPasswordError("As senhas não coincidem.");
      valid = false;
    } else {
      setConfirmPasswordError("");
    }

    return valid;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setErrorMessage("");

    if (!validate()) return;

    if (breachStatus.state === "compromised") {
      setPasswordError(
        "Esta senha apareceu em vazamentos conhecidos. Escolha outra.",
      );
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setValidSession(false);
      setErrorMessage(
        "Este link de recuperação é inválido ou já expirou. Solicite uma nova recuperação de senha.",
      );
      return;
    }

    setCheckingSession(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) {
        setErrorMessage(
          "Não foi possível atualizar sua senha. Solicite um novo link e tente novamente.",
        );
        return;
      }

      setUpdated(true);
    } catch (error) {
      console.error("Password update failed:", error);

      setErrorMessage("Não foi possível atualizar sua senha. Tente novamente.");
    } finally {
      setCheckingSession(false);
    }
  };

  const handleBack = () => {
    navigate("/login");
  };

  if (checkingSession) {
    return (
      <main className={styles.recoveryPage}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.headerButton}
            onClick={handleBack}
          >
            <LogIn aria-hidden="true" />
            <span>Voltar para login</span>
          </button>

          <TransitionLink to="/" className={styles.logo}>
            <img src={logo} alt="CONG" />
          </TransitionLink>

          <div />
        </header>

        <section className={styles.content}>
          <div className={styles.cardWrapper}>
            <span className={styles.tape} />

            <article className={styles.card}>
              <div className={styles.stepLabel}>
                <span>03</span>
                <strong>RECUPERAÇÃO DE CONTA</strong>
              </div>

              <div className={styles.heading}>
                <span className={styles.eyebrow}>AGUARDE UM MOMENTO</span>

                <h1>
                  Verificando o acesso
                  <span />
                </h1>

                <p>Estamos verificando o link de recuperação da sua conta.</p>
              </div>

              <div className={styles.loadingStatus}>
                <KeyRound aria-hidden="true" />
                <span>Verificando seu acesso...</span>
              </div>
            </article>
          </div>

          <aside className={styles.visual} aria-hidden="true">
            <div className={styles.visualBackdrop} />

            <div className={styles.mascotStage}>
              <span className={styles.mascotHalo} />
              <img className={styles.mascot} src={mascot} alt="" />
            </div>

            <div className={styles.notePaper}>
              <strong>quase lá!</strong>
              <span>vamos conferir</span>
            </div>

            <div className={styles.keyDecoration}>
              <KeyRound aria-hidden="true" />
            </div>
          </aside>
        </section>

        <footer className={styles.footer}>
          <span>© 2026 CONG</span>
          <span>Tecnologia para impacto social</span>
        </footer>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className={styles.recoveryPage}>
        <header className={styles.header}>
          <button
            type="button"
            className={styles.headerButton}
            onClick={handleBack}
          >
            <LogIn aria-hidden="true" />
            <span>Voltar para login</span>
          </button>

          <TransitionLink to="/" className={styles.logo}>
            <img src={logo} alt="CONG" />
          </TransitionLink>

          <div />
        </header>

        <section className={styles.content}>
          <div className={styles.cardWrapper}>
            <span className={styles.tape} />

            <article className={styles.card}>
              <div className={styles.stepLabel}>
                <span>03</span>
                <strong>RECUPERAÇÃO DE CONTA</strong>
              </div>

              <div className={styles.heading}>
                <span className={styles.eyebrow}>LINK INVÁLIDO</span>

                <h1>
                  Esse link não está mais disponível.
                  <span />
                </h1>

                <p>
                  O link de recuperação pode ter expirado ou já ter sido
                  utilizado. Solicite uma nova recuperação de senha para
                  continuar.
                </p>
              </div>

              <div className={styles.warningStatus}>
                <KeyRound aria-hidden="true" />
                <span>
                  Solicite um novo link pela página de recuperação de senha.
                </span>
              </div>

              <TransitionLink
                to="/recuperar-senha"
                className={styles.primaryButton}
              >
                Recuperar senha
              </TransitionLink>
            </article>
          </div>

          <aside className={styles.visual} aria-hidden="true">
            <div className={styles.visualBackdrop} />

            <div className={styles.mascotStage}>
              <span className={styles.mascotHalo} />
              <img className={styles.mascot} src={mascot} alt="" />
            </div>

            <div className={styles.notePaper}>
              <strong>recuperação</strong>
              <span>acesse novamente</span>
            </div>

            <div className={styles.keyDecoration}>
              <KeyRound aria-hidden="true" />
            </div>
          </aside>
        </section>

        <footer className={styles.footer}>
          <span>© 2026 CONG</span>
          <span>Tecnologia para impacto social</span>
        </footer>
      </main>
    );
  }

  if (updated) {
    return (
      <main className={styles.recoveryPage}>
        <header className={styles.header}>
          <div />

          <TransitionLink to="/" className={styles.logo}>
            <img src={logo} alt="CONG" />
          </TransitionLink>

          <TransitionLink to="/login" className={styles.loginLink}>
            Entrar
          </TransitionLink>
        </header>

        <section className={styles.content}>
          <div className={styles.cardWrapper}>
            <span className={styles.tape} />

            <article className={`${styles.card} ${styles.cardConfirmed}`}>
              <div className={styles.stepLabel}>
                <span>03</span>
                <strong>RECUPERAÇÃO DE CONTA</strong>
              </div>

              <div className={styles.heading}>
                <span className={styles.eyebrow}>TUDO CERTO</span>

                <h1>
                  Senha atualizada!
                  <span />
                </h1>

                <p>
                  Sua nova senha já está ativa. Agora você pode entrar novamente
                  na sua conta.
                </p>
              </div>

              <div className={styles.successStatus}>
                <Check aria-hidden="true" />
                <span>Sua senha foi alterada com sucesso.</span>
              </div>

              <TransitionLink to="/login" className={styles.primaryButton}>
                <LogIn aria-hidden="true" />
                Entrar na conta
              </TransitionLink>
            </article>
          </div>

          <aside className={styles.visual} aria-hidden="true">
            <div className={styles.visualBackdrop} />

            <div className={styles.mascotStage}>
              <span className={styles.mascotHalo} />
              <img className={styles.mascot} src={mascot} alt="" />
            </div>

            <div className={styles.notePaper}>
              <strong>pronto!</strong>
              <span>acesso recuperado</span>
            </div>
          </aside>
        </section>

        <footer className={styles.footer}>
          <span>© 2026 CONG</span>
          <span>Tecnologia para impacto social</span>
        </footer>
      </main>
    );
  }

  return (
    <main className={styles.recoveryPage}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.headerButton}
          onClick={handleBack}
        >
          <LogIn aria-hidden="true" />
          <span>Voltar para login</span>
        </button>

        <TransitionLink to="/" className={styles.logo}>
          <img src={logo} alt="CONG" />
        </TransitionLink>

        <p className={styles.loginLink}>
          Já tem acesso? <TransitionLink to="/login">Entrar</TransitionLink>
        </p>
      </header>

      <section className={styles.content}>
        <div className={styles.cardWrapper}>
          <span className={styles.tape} />

          <article className={styles.card}>
            <div className={styles.stepLabel}>
              <span>03</span>
              <strong>RECUPERAÇÃO DE CONTA</strong>
            </div>

            <div className={styles.heading}>
              <span className={styles.eyebrow}>NOVO ACESSO</span>

              <h1>
                Crie uma nova{" "}
                <span className={styles.titleHighlight}>senha</span>.
              </h1>

              <p>Escolha uma senha nova para recuperar o acesso à sua conta.</p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              <PasswordFields
                password={formData.password}
                confirmPassword={formData.confirmPassword}
                passwordError={passwordError}
                confirmPasswordError={confirmPasswordError}
                passwordTouched={Boolean(formData.password)}
                confirmPasswordTouched={Boolean(formData.confirmPassword)}
                breachStatus={breachStatus}
                onPasswordChange={updatePassword}
                onConfirmPasswordChange={updateConfirmPassword}
                passwordId="reset-password"
                confirmPasswordId="reset-confirm-password"
                passwordErrorId="reset-password-error"
                confirmPasswordErrorId="reset-confirm-password-error"
              />

              {errorMessage && (
                <div className={styles.errorMessage} role="alert">
                  <KeyRound aria-hidden="true" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className={styles.submitButton}
                disabled={checkingSession}
              >
                {checkingSession ? "Salvando..." : "Criar nova senha"}
              </button>
            </form>

            <div className={styles.securityNote}>
              <ShieldCheck aria-hidden="true" />

              <p>
                Use uma senha com pelo menos 10 caracteres e evite reutilizar
                uma senha antiga.
              </p>
            </div>
          </article>
        </div>

        <aside className={styles.visual} aria-hidden="true">
          <div className={styles.visualBackdrop} />

          <div className={styles.mascotStage}>
            <span className={styles.mascotHalo} />
            <img className={styles.mascot} src={mascot} alt="" />
          </div>

          <div className={styles.notePaper}>
            <Sparkles aria-hidden="true" />
            <strong>quase lá!</strong>
            <span>uma senha nova</span>
          </div>

          <div className={styles.keyDecoration}>
            <KeyRound aria-hidden="true" />
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 CONG</span>
        <span>Tecnologia para impacto social</span>
      </footer>
    </main>
  );
}
