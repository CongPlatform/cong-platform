import {
  useEffect,
  useState,
} from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  Check,
  CircleAlert,
  Clock3,
  LogIn,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { TransitionLink } from "../../components/pageTransitionProvider/TransitionLink";

import {
  ApiError,
  apiPost,
  apiRequest,
} from "../../services/api";

import logo from "../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../assets/mascot/cong-happy.webp";

import styles from "./VerifyEmail.module.css";

type VerificationStatus =
  | "pending"
  | "confirmed"
  | "expired"
  | "unavailable";

interface VerificationStatusResponse {
  status: VerificationStatus;
}

interface ResendResponse {
  message: string;
}

interface LocationState {
  email?: string;
  justRegistered?: boolean;
}

const PENDING_EMAIL_KEY =
  "cong:pending-verification-email";

function getResendErrorMessage(
  error: unknown,
): string {
  if (!(error instanceof ApiError)) {
    return "Não foi possível reenviar o e-mail agora.";
  }

  if (
    error.status === 429 ||
    error.code ===
      "CONFIRMATION_EMAIL_RATE_LIMIT"
  ) {
    return "Aguarde um pouco antes de solicitar outro e-mail.";
  }

  if (error.status === 0) {
    return "Não foi possível conectar ao servidor da CONG.";
  }

  return "Não foi possível reenviar o e-mail agora.";
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState =
    location.state as LocationState | null;

  const [email] = useState(() => {
    return (
      locationState?.email ??
      sessionStorage.getItem(
        PENDING_EMAIL_KEY,
      ) ??
      ""
    );
  });

  const [
    verificationStatus,
    setVerificationStatus,
  ] = useState<VerificationStatus>(
    "pending",
  );

  const [cooldown, setCooldown] =
    useState(
      locationState?.justRegistered
        ? 60
        : 0,
    );

  const [isResending, setIsResending] =
    useState(false);

  const [resendMessage, setResendMessage] =
    useState("");

  const [resendError, setResendError] =
    useState("");

  /*
   * Polling silencioso.
   *
   * Não autenticamos ninguém aqui.
   * Apenas perguntamos ao backend se o
   * endereço associado ao fluxo já foi
   * confirmado.
   */
  useEffect(() => {
    let active = true;
    let timeoutId:
      | number
      | undefined;

    async function checkStatus() {
      try {
        const response =
          await apiRequest<VerificationStatusResponse>(
            "/auth/email-verification/status",
            {
              method: "GET",
              authenticated: false,
              retryOnUnauthorized: false,
            },
          );

        if (!active) {
          return;
        }

        setVerificationStatus(
          response.status,
        );

        if (
          response.status ===
          "confirmed"
        ) {
          sessionStorage.removeItem(
            PENDING_EMAIL_KEY,
          );

          /*
           * Deixamos o usuário enxergar
           * o estado de sucesso antes de
           * seguir para o login.
           */
          timeoutId =
            window.setTimeout(() => {
              navigate("/login", {
                replace: true,

                state: {
                  email,
                  emailConfirmed: true,
                },
              });
            }, 1500);

          return;
        }

        if (
          response.status ===
            "expired" ||
          response.status ===
            "unavailable"
        ) {
          return;
        }

        timeoutId =
          window.setTimeout(
            checkStatus,
            5000,
          );
      } catch (error) {
        console.error(
          "Falha ao acompanhar confirmação:",
          error,
        );

        if (!active) {
          return;
        }

        /*
         * Uma falha de rede momentânea
         * não deve quebrar a experiência.
         */
        timeoutId =
          window.setTimeout(
            checkStatus,
            5000,
          );
      }
    }

    timeoutId =
      window.setTimeout(
        checkStatus,
        800,
      );

    return () => {
      active = false;

      if (timeoutId) {
        window.clearTimeout(
          timeoutId,
        );
      }
    };
  }, [
    email,
    navigate,
  ]);

  /*
   * Contagem para evitar que o botão
   * de reenvio incentive múltiplos
   * disparos seguidos.
   */
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const interval =
      window.setInterval(() => {
        setCooldown((current) => {
          if (current <= 1) {
            window.clearInterval(
              interval,
            );

            return 0;
          }

          return current - 1;
        });
      }, 1000);

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [cooldown]);

  async function handleResend() {
    if (
      !email ||
      isResending ||
      cooldown > 0
    ) {
      return;
    }

    setIsResending(true);
    setResendMessage("");
    setResendError("");

    try {
      await apiPost<ResendResponse>(
        "/auth/resend-confirmation",
        {
          email,
        },
        false,
      );

      setResendMessage(
        "Pronto! Enviamos um novo link para seu e-mail.",
      );

      setCooldown(60);
    } catch (error) {
      setResendError(
        getResendErrorMessage(
          error,
        ),
      );
    } finally {
      setIsResending(false);
    }
  }

  function handleBack() {
    navigate("/signup");
  }

  const isConfirmed =
    verificationStatus ===
    "confirmed";

  const isExpired =
    verificationStatus ===
    "expired";

  const isUnavailable =
    verificationStatus ===
    "unavailable";

  return (
    <main
      className={
        styles.verificationPage
      }
    >
      <header className={styles.header}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
        >
          <ArrowLeft
            aria-hidden="true"
          />

          <span>Voltar</span>
        </button>

        <TransitionLink
          to="/"
          className={styles.brand}
          aria-label="CONG — Página inicial"
        >
          <img
            src={logo}
            alt="CONG"
          />
        </TransitionLink>

        <TransitionLink
          to="/login"
          className={styles.loginLink}
        >
          <span>Entrar</span>

          <LogIn
            aria-hidden="true"
          />
        </TransitionLink>
      </header>

      <section
        className={styles.content}
      >
        <div
          className={styles.cardWrapper}
        >
          <span
            className={styles.tape}
            aria-hidden="true"
          />

          <article
            className={`${styles.card} ${
              isConfirmed
                ? styles.cardConfirmed
                : ""
            }`}
          >
            <div
              className={
                styles.cardDecoration
              }
              aria-hidden="true"
            >
              ✦
            </div>

            <div
              className={
                styles.stepLabel
              }
            >
              <span>02</span>

              <p>
                CONFIRMAÇÃO DE E-MAIL
              </p>
            </div>

            <div
              className={
                styles.mailIllustration
              }
              aria-hidden="true"
            >
              <div
                className={
                  styles.mailCircle
                }
              >
                {isConfirmed ? (
                  <Check />
                ) : (
                  <Mail />
                )}
              </div>

              <span
                className={
                  styles.mailOrbit
                }
              />

              <span
                className={
                  styles.mailSparkOne
                }
              >
                ✦
              </span>

              <span
                className={
                  styles.mailSparkTwo
                }
              >
                ✧
              </span>
            </div>

            <div
              className={
                styles.heading
              }
            >
              <span
                className={
                  styles.eyebrow
                }
              >
                {isConfirmed
                  ? "TUDO CERTO"
                  : "FALTA SÓ UM PASSO"}
              </span>

              <h1>
                {isConfirmed ? (
                  <>
                    E-mail{" "}
                    <span>
                      confirmado!
                    </span>
                  </>
                ) : (
                  <>
                    Olhe seu{" "}
                    <span>e-mail.</span>
                  </>
                )}
              </h1>

              <p>
                {isConfirmed ? (
                  <>
                    Seu endereço foi
                    confirmado com
                    sucesso. Estamos
                    preparando o próximo
                    passo.
                  </>
                ) : (
                  <>
                    Enviamos um link de
                    confirmação para o
                    endereço abaixo.
                    Abra a mensagem e
                    confirme que o e-mail
                    é seu.
                  </>
                )}
              </p>
            </div>

            {!isConfirmed && (
              <div
                className={
                  styles.emailCard
                }
              >
                <span
                  className={
                    styles.emailIcon
                  }
                >
                  <Mail
                    aria-hidden="true"
                  />
                </span>

                <div>
                  <small>
                    Link enviado para
                  </small>

                  <strong>
                    {email ||
                      "seu e-mail de cadastro"}
                  </strong>
                </div>
              </div>
            )}

            <div
              className={
                styles.statusArea
              }
              aria-live="polite"
            >
              {isConfirmed ? (
                <div
                  className={
                    styles.successStatus
                  }
                >
                  <span>
                    <Check
                      aria-hidden="true"
                    />
                  </span>

                  <div>
                    <strong>
                      E-mail confirmado
                    </strong>

                    <p>
                      Redirecionando para
                      a CONG...
                    </p>
                  </div>
                </div>
              ) : isExpired ? (
                <div
                  className={
                    styles.warningStatus
                  }
                >
                  <CircleAlert
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      O acompanhamento
                      expirou
                    </strong>

                    <p>
                      Por segurança, este
                      acompanhamento
                      automático não está
                      mais ativo.
                    </p>
                  </div>
                </div>
              ) : isUnavailable ? (
                <div
                  className={
                    styles.warningStatus
                  }
                >
                  <CircleAlert
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      Acompanhamento
                      indisponível
                    </strong>

                    <p>
                      Você ainda pode
                      confirmar pelo
                      e-mail e entrar
                      normalmente.
                    </p>
                  </div>
                </div>
              ) : (
                <div
                  className={
                    styles.waitingStatus
                  }
                >
                  <span
                    className={
                      styles.pulse
                    }
                    aria-hidden="true"
                  />

                  <div>
                    <strong>
                      Aguardando sua
                      confirmação
                    </strong>

                    <p>
                      Esta página atualiza
                      sozinha. Pode
                      confirmar até pelo
                      celular.
                    </p>
                  </div>

                  <Clock3
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            {!isConfirmed && (
              <>
                <div
                  className={
                    styles.divider
                  }
                  aria-hidden="true"
                >
                  <span />
                  <Sparkles />
                  <span />
                </div>

                <div
                  className={
                    styles.resendArea
                  }
                >
                  <div>
                    <strong>
                      Não recebeu?
                    </strong>

                    <p>
                      Confira também sua
                      pasta de spam ou
                      lixo eletrônico.
                    </p>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.resendButton
                    }
                    disabled={
                      !email ||
                      isResending ||
                      cooldown > 0
                    }
                    onClick={
                      handleResend
                    }
                  >
                    <RefreshCw
                      aria-hidden="true"
                    />

                    {isResending
                      ? "Reenviando..."
                      : cooldown > 0
                        ? `Reenviar em ${cooldown}s`
                        : "Reenviar e-mail"}
                  </button>
                </div>

                {resendMessage && (
                  <p
                    className={
                      styles.resendSuccess
                    }
                    role="status"
                  >
                    <Check
                      aria-hidden="true"
                    />

                    {resendMessage}
                  </p>
                )}

                {resendError && (
                  <p
                    className={
                      styles.resendError
                    }
                    role="alert"
                  >
                    <CircleAlert
                      aria-hidden="true"
                    />

                    {resendError}
                  </p>
                )}
              </>
            )}

            <div
              className={
                styles.securityNote
              }
            >
              <ShieldCheck
                aria-hidden="true"
              />

              <p>
                <strong>
                  Pode confirmar em outro
                  dispositivo.
                </strong>{" "}
                Se fizer isso, esta tela
                reconhecerá a confirmação
                automaticamente e levará
                você ao login.
              </p>
            </div>

            {!isConfirmed && (
              <p
                className={
                  styles.wrongEmail
                }
              >
                Digitou o e-mail errado?{" "}
                <button
                  type="button"
                  onClick={handleBack}
                >
                  Voltar ao cadastro
                </button>
              </p>
            )}
          </article>
        </div>

        <aside
          className={styles.visual}
          aria-hidden="true"
        >
          <div
            className={
              styles.visualBackdrop
            }
          />

          <span
            className={
              styles.visualStarOne
            }
          >
            ✦
          </span>

          <span
            className={
              styles.visualStarTwo
            }
          >
            ✦
          </span>

          <div
            className={
              styles.notePaper
            }
          >
            <span>quase lá!</span>

            <strong>
              1 clique
            </strong>

            <p>
              separa sua conta da
              comunidade CONG.
            </p>
          </div>

          <div
            className={
              styles.mascotStage
            }
          >
            <div
              className={
                styles.mascotHalo
              }
            />

            <img
              src={mascot}
              alt=""
            />

            <span
              className={
                styles.mascotShadow
              }
            />
          </div>

          <div
            className={
              styles.envelope
            }
          >
            <div
              className={
                styles.envelopeFront
              }
            />

            <div
              className={
                styles.envelopeFlap
              }
            />

            <span>
              <Mail />
              confira sua caixa de entrada
            </span>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>
          © 2026 CONG
        </span>

        <span>
          Uma conta. Várias formas de
          gerar impacto.
        </span>
      </footer>
    </main>
  );
}