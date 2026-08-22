import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  useForm,
  type SubmitHandler,
} from "react-hook-form";
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
import ModalMensagem from "../../components/modalMensagem/ModalMensagem";

import { useAuth } from "../../contexts/auth-context";
import { ApiError } from "../../services/api";

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
    .max(
      128,
      "A senha informada é muito longa.",
    ),

  remember: z.boolean(),
});

type LoginFormData =
  z.infer<typeof loginSchema>;

function getAuthenticationErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof ApiError)) {
    console.error(
      "Erro desconhecido no login:",
      error,
    );

    return "Não foi possível entrar. Tente novamente.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor. Verifique sua internet.";
  }

  if (
    error.status === 403 &&
    error.code === "EMAIL_NOT_CONFIRMED"
  ) {
    return "Confirme seu e-mail antes de entrar na CONG.";
  }

  if (
    error.status === 403 &&
    error.code === "USER_INACTIVE"
  ) {
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
  const { login } = useAuth();

  const [
    postLoginRoute,
    setPostLoginRoute,
  ] = useState("/app/comunidade");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    authenticationError,
    setAuthenticationError,
  ] = useState("");

  const [
    confirmationModalOpen,
    setConfirmationModalOpen,
  ] = useState(false);

  const [
    collectedLoginData,
    setCollectedLoginData,
  ] = useState<
    Record<string, unknown> | null
  >(null);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
      isSubmitting,
    },
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
    if (
      (window.history.state?.idx ?? 0) > 0
    ) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  const authenticateUser: SubmitHandler<
    LoginFormData
  > = async (data) => {
    setAuthenticationError("");

    try {
      const session = await login(
        data.email
          .trim()
          .toLowerCase(),
        data.password,
        data.remember,
      );

      setPostLoginRoute(
        "/app/comunidade",
      );

      setCollectedLoginData({
        email: session.user.email,

        lembrarDeMim:
          data.remember,

        senha:
          "Não exibida por segurança",
      });

      setConfirmationModalOpen(true);
    } catch (error) {
      setAuthenticationError(
        getAuthenticationErrorMessage(
          error,
        ),
      );
    }
  };

  const finishLogin = () => {
    setConfirmationModalOpen(false);

    navigate(postLoginRoute, {
      replace: true,
    });
  };

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
          <div
            className={
              styles.mascotArea
            }
          >
            <span
              className={
                styles.mascotGlow
              }
              aria-hidden="true"
            />

            <img
              src={mascote}
              alt="Mascote da CONG"
              className={
                styles.mascot
              }
            />
          </div>

          <div
            className={
              styles.welcomeText
            }
          >
            <span
              className={
                styles.welcomeEyebrow
              }
            >
              Acesso à plataforma
            </span>

            <h1 id="login-welcome-title">
              Bem-vindo de volta!
            </h1>

            <p>
              Faça login para continuar
              construindo{" "}
              <span>
                impacto real.
              </span>
            </p>
          </div>
        </section>

        <section
          className={styles.card}
          aria-labelledby="login-title"
        >
          <header
            className={
              styles.cardHeader
            }
          >
            <span
              className={
                styles.cardEyebrow
              }
            >
              CONG
            </span>

            <h2 id="login-title">
              Entrar na sua conta
            </h2>

            <p>
              Use seu e-mail e senha
              para acessar a plataforma.
            </p>
          </header>

          <form
            className={styles.form}
            onSubmit={handleSubmit(
              authenticateUser,
            )}
            noValidate
            aria-busy={isSubmitting}
          >
            <div
              className={
                styles.field
              }
            >
              <label htmlFor="login-email">
                E-mail
              </label>

              <div
                className={`${
                  styles.inputGroup
                } ${
                  errors.email
                    ? styles.inputGroupError
                    : ""
                }`}
              >
                <span
                  className={
                    styles.inputIcon
                  }
                >
                  <FaUser
                    aria-hidden="true"
                  />
                </span>

                <input
                  id="login-email"
                  type="email"
                  placeholder="nome@exemplo.com"
                  autoComplete="email"
                  disabled={
                    isSubmitting
                  }
                  aria-invalid={Boolean(
                    errors.email,
                  )}
                  aria-describedby={
                    errors.email
                      ? "login-email-error"
                      : undefined
                  }
                  {...register(
                    "email",
                    {
                      onChange: () =>
                        setAuthenticationError(
                          "",
                        ),
                    },
                  )}
                />
              </div>

              {errors.email && (
                <p
                  id="login-email-error"
                  className={
                    styles.fieldError
                  }
                  role="alert"
                >
                  {
                    errors.email
                      .message
                  }
                </p>
              )}
            </div>

            <div
              className={
                styles.field
              }
            >
              <label htmlFor="login-password">
                Senha
              </label>

              <div
                className={`${
                  styles.inputGroup
                } ${
                  errors.password
                    ? styles.inputGroupError
                    : ""
                }`}
              >
                <span
                  className={
                    styles.inputIcon
                  }
                >
                  <FaLock
                    aria-hidden="true"
                  />
                </span>

                <input
                  id="login-password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Digite sua senha"
                  autoComplete="current-password"
                  disabled={
                    isSubmitting
                  }
                  aria-invalid={Boolean(
                    errors.password,
                  )}
                  aria-describedby={
                    errors.password
                      ? "login-password-error"
                      : undefined
                  }
                  {...register(
                    "password",
                    {
                      onChange: () =>
                        setAuthenticationError(
                          "",
                        ),
                    },
                  )}
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current,
                    )
                  }
                  disabled={
                    isSubmitting
                  }
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  aria-pressed={
                    showPassword
                  }
                >
                  {showPassword ? (
                    <FaEyeSlash
                      aria-hidden="true"
                    />
                  ) : (
                    <FaEye
                      aria-hidden="true"
                    />
                  )}
                </button>
              </div>

              {errors.password && (
                <p
                  id="login-password-error"
                  className={
                    styles.fieldError
                  }
                  role="alert"
                >
                  {
                    errors.password
                      .message
                  }
                </p>
              )}
            </div>

            <div
              className={
                styles.options
              }
            >
              <label
                className={
                  styles.rememberOption
                }
              >
                <input
                  type="checkbox"
                  disabled={
                    isSubmitting
                  }
                  {...register(
                    "remember",
                  )}
                />

                <span>
                  Lembrar de mim
                </span>
              </label>

              <TransitionLink to="/recuperar-senha">
                Esqueceu sua senha?
              </TransitionLink>
            </div>

            {authenticationError && (
              <p
                className={
                  styles.fieldError
                }
                role="alert"
                aria-live="polite"
              >
                {
                  authenticationError
                }
              </p>
            )}

            <button
              type="submit"
              className={
                styles.loginButton
              }
              disabled={
                isSubmitting
              }
            >
              <span>
                {isSubmitting
                  ? "Entrando..."
                  : "Entrar"}
              </span>

              <FaSignInAlt
                aria-hidden="true"
              />
            </button>
          </form>

          <div
            className={
              styles.divider
            }
          >
            <span>
              ou continue com
            </span>
          </div>

          <div
            className={
              styles.socials
            }
          >
            <button
              type="button"
              className={`${styles.socialButton} ${styles.githubButton}`}
              disabled={
                isSubmitting
              }
            >
              <FaGithub
                aria-hidden="true"
              />

              <span>
                GitHub
              </span>
            </button>

            <button
              type="button"
              className={`${styles.socialButton} ${styles.googleButton}`}
              disabled={
                isSubmitting
              }
            >
              <FcGoogle
                aria-hidden="true"
              />

              <span>
                Google
              </span>
            </button>
          </div>

          <p
            className={
              styles.signup
            }
          >
            Ainda não tem uma conta?

            <TransitionLink to="/signup">
              Criar conta
            </TransitionLink>
          </p>
        </section>
      </div>

      <ModalMensagem
        aberto={
          confirmationModalOpen
        }
        titulo="Login realizado"
        mensagem={
          <p>
            A autenticação foi concluída
            com sucesso. Você já pode
            continuar para a CONG.
          </p>
        }
        dados={
          collectedLoginData ??
          undefined
        }
        tamanho="pequeno"
        textoBotaoOk="Continuar"
        fecharAoClicarFora={
          false
        }
        onFechar={
          finishLogin
        }
      />
    </main>
  );
}