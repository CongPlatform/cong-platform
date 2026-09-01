import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaGithub,
  FaLock,
  FaSignInAlt,
  FaUser,
} from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";

import { useAuth } from "../../contexts/auth-context";
import { ApiError } from "../../services/api";
import { startOAuthLogin } from "../../services/oauthService";

import mascote from "../../assets/mascot/cong-default.webp";
import styles from "./Login.module.css";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail.")
    .pipe(
      z.email({
        message: "Digite um e-mail válido.",
      }),
    ),

  password: z
    .string()
    .min(1, "Informe sua senha.")
    .max(128, "A senha informada é muito longa."),

  remember: z.boolean(),
});

type LoginFormData = z.infer<typeof loginSchema>;

type SocialProvider = "google" | "github";

function getAuthenticationErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    console.error("Erro desconhecido no login:", error);

    return "Não foi possível entrar. Tente novamente.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  }

  if (error.status === 403 && error.code === "EMAIL_NOT_CONFIRMED") {
    return "Confirme seu e-mail antes de entrar na CONG.";
  }

  if (error.status === 403 && error.code === "USER_INACTIVE") {
    return "Esta conta está desativada.";
  }

  if (error.status === 401) {
    return "E-mail ou senha incorretos.";
  }

  if (error.status === 429) {
    return "Muitas tentativas de acesso. Aguarde alguns minutos.";
  }

  return (
    error.message ||
    "Não foi possível entrar. Confira os dados e tente novamente."
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login } = useAuth();

  const [showPassword, setShowPassword] = useState(false);

  const [authenticationError, setAuthenticationError] = useState("");

  const [socialProviderLoading, setSocialProviderLoading] =
    useState<SocialProvider | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },

    mode: "onBlur",
  });

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const authenticateUser: SubmitHandler<LoginFormData> = async (data) => {
    setAuthenticationError("");

    try {
      const result = await login(
        data.email.trim().toLowerCase(),
        data.password,
        data.remember,
      );

      const routeState = location.state as {
        from?: string;
      } | null;

      const requestedRoute = routeState?.from;

      /*
       * Enquanto o onboarding não terminou, o estado salvo no backend
       * sempre vence qualquer rota antiga que o navegador tenha guardado.
       */
      if (result.destination !== "/app/comunidade") {
        navigate(result.destination, {
          replace: true,
        });

        return;
      }

      /*
       * Com o onboarding concluído, uma rota protegida originalmente
       * solicitada pode ser restaurada normalmente.
       */
      if (requestedRoute?.startsWith("/app/")) {
        navigate(requestedRoute, {
          replace: true,
        });

        return;
      }

      navigate(result.destination, {
        replace: true,
      });
    } catch (error) {
      /*
       * Usuário existe, mas ainda
       * não confirmou o e-mail.
       */
      if (error instanceof ApiError && error.code === "EMAIL_NOT_CONFIRMED") {
        const email = data.email.trim().toLowerCase();

        sessionStorage.setItem("cong:pending-verification-email", email);

        navigate("/verifique-seu-email", {
          replace: true,
          state: {
            email,
            justRegistered: false,
          },
        });

        return;
      }

      setAuthenticationError(getAuthenticationErrorMessage(error));
    }
  };

  const handleGoogleLogin = async (): Promise<void> => {
    setAuthenticationError("");
    setSocialProviderLoading("google");

    try {
      const routeState = location.state as {
        from?: string;
      } | null;

      const requestedRoute = routeState?.from;

      const returnTo = requestedRoute?.startsWith("/app/")
        ? requestedRoute
        : "/app/comunidade";

      await startOAuthLogin("google", returnTo);
    } catch (error) {
      console.error("Erro ao iniciar login com Google:", error);

      setAuthenticationError(
        "Não foi possível iniciar o login com Google. Tente novamente.",
      );

      setSocialProviderLoading(null);
    }
  };

  const handleGithubLogin = async (): Promise<void> => {
    setAuthenticationError("");
    setSocialProviderLoading("github");

    try {
      const routeState = location.state as {
        from?: string;
      } | null;

      const requestedRoute = routeState?.from;

      const returnTo = requestedRoute?.startsWith("/app/")
        ? requestedRoute
        : "/app/comunidade";

      await startOAuthLogin("github", returnTo);
    } catch (error) {
      console.error("Erro ao iniciar login com GitHub:", error);

      setAuthenticationError(
        "Não foi possível iniciar o login com GitHub. Tente novamente.",
      );

      setSocialProviderLoading(null);
    }
  };

  const isAuthenticating = isSubmitting || socialProviderLoading !== null;

  return (
    <main className={styles.loginPage}>
      <button
        type="button"
        className={styles.backButton}
        onClick={handleBack}
        aria-label="Voltar para a página anterior"
      >
        <FaArrowLeft aria-hidden="true" />
        <span>Voltar</span>
      </button>

      <div className={styles.loginLayout}>
        <section
          className={styles.welcome}
          aria-labelledby="login-welcome-title"
        >
          <div className={styles.mascotArea}>
            <span className={styles.mascotGlow} aria-hidden="true" />

            <img
              src={mascote}
              alt="Mascote da CONG"
              className={styles.mascot}
            />
          </div>

          <div className={styles.welcomeText}>
            <span className={styles.welcomeEyebrow}>Acesso à plataforma</span>

            <h1 id="login-welcome-title">Bem-vindo de volta!</h1>

            <p>
              Faça login para continuar construindo <span>impacto real.</span>
            </p>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="login-title">
          <header className={styles.cardHeader}>
            <span className={styles.cardEyebrow}>CONG</span>

            <h2 id="login-title">Entrar na sua conta</h2>

            <p>Use seu e-mail e senha para acessar a plataforma.</p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit(authenticateUser)}
            noValidate
            aria-busy={isAuthenticating}
          >
            <div className={styles.field}>
              <label htmlFor="login-email">E-mail</label>

              <div
                className={`${styles.inputGroup} ${
                  errors.email ? styles.inputGroupError : ""
                }`}
              >
                <span className={styles.inputIcon}>
                  <FaUser aria-hidden="true" />
                </span>

                <input
                  id="login-email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  autoComplete="email"
                  disabled={isAuthenticating}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={
                    errors.email ? "login-email-error" : undefined
                  }
                  {...register("email", {
                    onChange: () => setAuthenticationError(""),
                  })}
                />
              </div>

              {errors.email && (
                <p
                  id="login-email-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password">Senha</label>

              <div
                className={`${styles.inputGroup} ${
                  errors.password ? styles.inputGroupError : ""
                }`}
              >
                <span className={styles.inputIcon}>
                  <FaLock aria-hidden="true" />
                </span>

                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  disabled={isAuthenticating}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={
                    errors.password ? "login-password-error" : undefined
                  }
                  {...register("password", {
                    onChange: () => setAuthenticationError(""),
                  })}
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  disabled={isAuthenticating}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <FaEyeSlash aria-hidden="true" />
                  ) : (
                    <FaEye aria-hidden="true" />
                  )}
                </button>
              </div>

              {errors.password && (
                <p
                  id="login-password-error"
                  className={styles.fieldError}
                  role="alert"
                >
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className={styles.options}>
              <label className={styles.rememberOption}>
                <input
                  type="checkbox"
                  disabled={isAuthenticating}
                  {...register("remember")}
                />

                <span>Lembrar de mim</span>
              </label>

              <TransitionLink to="/recuperar-senha">
                Esqueceu sua senha?
              </TransitionLink>
            </div>

            {authenticationError && (
              <p className={styles.fieldError} role="alert" aria-live="polite">
                {authenticationError}
              </p>
            )}

            <button
              type="submit"
              className={styles.loginButton}
              disabled={isAuthenticating}
            >
              <span>{isSubmitting ? "Entrando..." : "Entrar"}</span>

              <FaSignInAlt aria-hidden="true" />
            </button>
          </form>

          <div className={styles.divider}>
            <span>ou continue com</span>
          </div>

          <div className={styles.socials}>
            <button
              type="button"
              className={`${styles.socialButton} ${styles.githubButton}`}
              onClick={handleGithubLogin}
              disabled={isAuthenticating}
            >
              <FaGithub aria-hidden="true" />

              <span>GitHub</span>
            </button>

            <button
              type="button"
              className={`${styles.socialButton} ${styles.googleButton}`}
              onClick={handleGoogleLogin}
              disabled={isAuthenticating}
            >
              <FcGoogle aria-hidden="true" />

              <span>Google</span>
            </button>
          </div>

          <p className={styles.signup}>
            Ainda não tem uma conta?
            <TransitionLink to="/signup">Criar conta</TransitionLink>
          </p>
        </section>
      </div>
    </main>
  );
}
