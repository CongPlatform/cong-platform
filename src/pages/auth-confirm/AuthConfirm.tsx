import { useEffect, useState } from "react";

import {
  ArrowRight,
  Check,
  CircleAlert,
  LoaderCircle,
  LogIn,
  ShieldCheck,
} from "lucide-react";

import type { EmailOtpType, Session } from "@supabase/supabase-js";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../../contexts/auth-context";

import { apiRequest } from "../../services/api";

import { supabase } from "../../services/supabase";

import logo from "../../assets/brand/logo-wordmark-dark.webp";
import mascot from "../../assets/mascot/cong-happy.webp";

import styles from "./AuthConfirm.module.css";

type ConfirmationState = "checking" | "same-device" | "other-device" | "error";

type VerificationStatus = "pending" | "confirmed" | "expired" | "unavailable";

interface VerificationStatusResponse {
  status: VerificationStatus;
}

export default function AuthConfirm() {
  const navigate = useNavigate();

  const { establishSession } = useAuth();

  const [confirmationState, setConfirmationState] =
    useState<ConfirmationState>("checking");

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    let redirectTimeout: number | undefined;

    async function getConfirmationSession(): Promise<Session | null> {
      const searchParams = new URLSearchParams(window.location.search);

      const tokenHash = searchParams.get("token_hash");

      const type = searchParams.get("type");

      /*
       * Fluxo principal.
       *
       * Nosso template de e-mail envia
       * TokenHash diretamente para esta
       * página.
       */
      if (tokenHash) {
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,

          type: (type ?? "email") as EmailOtpType,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          return data.session;
        }

        const { data: sessionData } = await supabase.auth.getSession();

        return sessionData.session;
      }

      /*
       * Compatibilidade com links antigos
       * que ainda utilizem ConfirmationURL.
       */
      const hashParams = new URLSearchParams(window.location.hash.slice(1));

      const hashError = hashParams.get("error_description");

      if (hashError) {
        throw new Error(hashError);
      }

      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      return data.session;
    }

    async function checkOriginalDevice(): Promise<boolean> {
      try {
        const response = await apiRequest<VerificationStatusResponse>(
          "/auth/email-verification/status",
          {
            method: "GET",
            authenticated: false,
            retryOnUnauthorized: false,
          },
        );

        /*
         * Só o navegador que iniciou
         * o cadastro possui o cookie
         * HttpOnly de acompanhamento.
         */
        return response.status === "confirmed";
      } catch {
        /*
         * Em caso de dúvida, escolhemos
         * o caminho conservador:
         * não fazemos auto-login.
         */
        return false;
      }
    }

    async function confirm() {
      try {
        const session = await getConfirmationSession();

        if (!active) {
          return;
        }

        if (!session) {
          throw new Error("Confirmation session was not created");
        }

        const isOriginalDevice = await checkOriginalDevice();

        if (!active) {
          return;
        }

        /*
         * MESMO NAVEGADOR
         *
         * Supabase confirmou a identidade
         * e o navegador possui o fluxo
         * original da CONG.
         */
        if (isOriginalDevice) {
          setConfirmationState("same-device");

          const result = await establishSession(
            session.access_token,
            session.refresh_token,
            false,
          );

          if (!active) {
            return;
          }

          sessionStorage.removeItem("cong:pending-verification-email");

          redirectTimeout = window.setTimeout(() => {
            navigate(result.destination, {
              replace: true,
            });
          }, 1400);

          return;
        }

        /*
         * OUTRO DISPOSITIVO
         *
         * O e-mail foi confirmado, mas
         * este navegador não iniciou
         * aquele cadastro.
         *
         * Não transferimos a sessão para
         * a CONG automaticamente.
         */
        setConfirmationState("other-device");

        /*
         * verifyOtp pode criar uma sessão
         * local do cliente Supabase.
         *
         * Como decidimos não fazer
         * auto-login cross-device, ela é
         * encerrada somente neste
         * dispositivo.
         */
        await supabase.auth.signOut({
          scope: "local",
        });
      } catch (error) {
        console.error("Erro ao confirmar e-mail:", error);

        if (!active) {
          return;
        }

        setErrorMessage(
          "Este link não pôde ser confirmado. Ele pode ter expirado ou já ter sido utilizado.",
        );

        setConfirmationState("error");
      }
    }

    void confirm();

    return () => {
      active = false;

      if (redirectTimeout) {
        window.clearTimeout(redirectTimeout);
      }
    };
  }, [establishSession, navigate]);

  const isChecking = confirmationState === "checking";

  const isSameDevice = confirmationState === "same-device";

  const isOtherDevice = confirmationState === "other-device";

  const isError = confirmationState === "error";

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => navigate("/")}
          aria-label="Ir para o início da CONG"
        >
          <img src={logo} alt="CONG" />
        </button>
      </header>

      <section className={styles.content}>
        <div className={styles.paper}>
          <span className={styles.topTape} aria-hidden="true" />

          <span className={styles.starOne} aria-hidden="true">
            ✦
          </span>

          <span className={styles.starTwo} aria-hidden="true">
            ✧
          </span>

          <div
            className={`${styles.stateIcon} ${
              isSameDevice || isOtherDevice
                ? styles.stateIconSuccess
                : isError
                  ? styles.stateIconError
                  : ""
            }`}
          >
            {isChecking && (
              <LoaderCircle className={styles.spinner} aria-hidden="true" />
            )}

            {(isSameDevice || isOtherDevice) && <Check aria-hidden="true" />}

            {isError && <CircleAlert aria-hidden="true" />}
          </div>

          <div className={styles.heading}>
            <span className={styles.eyebrow}>
              {isChecking && "SÓ UM INSTANTE"}

              {isSameDevice && "TUDO CERTO"}

              {isOtherDevice && "PRONTO!"}

              {isError && "NÃO CONSEGUIMOS CONFIRMAR"}
            </span>

            <h1>
              {isChecking && (
                <>
                  Confirmando seu <span>e-mail...</span>
                </>
              )}

              {isSameDevice && (
                <>
                  E-mail <span>confirmado!</span>
                </>
              )}

              {isOtherDevice && (
                <>
                  E-mail <span>confirmado!</span>
                </>
              )}

              {isError && (
                <>
                  Este link não <span>funcionou.</span>
                </>
              )}
            </h1>

            <p>
              {isChecking &&
                "Estamos verificando o link com segurança. Isso deve levar apenas alguns segundos."}

              {isSameDevice &&
                "Sua conta está confirmada. Estamos preparando seu acesso à CONG."}

              {isOtherDevice &&
                "Sua conta foi confirmada com sucesso. O dispositivo onde você iniciou o cadastro reconhecerá a confirmação automaticamente."}

              {isError && errorMessage}
            </p>
          </div>

          {isChecking && (
            <div
              className={styles.progress}
              aria-label="Verificando confirmação"
            >
              <span />
            </div>
          )}

          {isSameDevice && (
            <div className={styles.successBox}>
              <span className={styles.successCheck}>
                <Check aria-hidden="true" />
              </span>

              <div>
                <strong>Conta liberada</strong>

                <p>Entrando automaticamente...</p>
              </div>
            </div>
          )}

          {isOtherDevice && (
            <>
              <div className={styles.deviceBox}>
                <ShieldCheck aria-hidden="true" />

                <div>
                  <strong>Confirmou em outro dispositivo?</strong>

                  <p>
                    Pode voltar para a tela onde criou sua conta. Ela atualizará
                    sozinha e levará você ao login.
                  </p>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() =>
                    navigate("/login", {
                      replace: true,
                      state: {
                        emailConfirmed: true,
                      },
                    })
                  }
                >
                  Entrar neste dispositivo
                  <LogIn aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => navigate("/")}
                >
                  Ir para o início
                </button>
              </div>
            </>
          )}

          {isError && (
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => navigate("/verifique-seu-email")}
              >
                Voltar para verificação
                <ArrowRight aria-hidden="true" />
              </button>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => navigate("/login")}
              >
                Ir para o login
              </button>
            </div>
          )}

          <div className={styles.security}>
            <ShieldCheck aria-hidden="true" />

            <span>
              Confirmação protegida pelo sistema de autenticação da CONG.
            </span>
          </div>
        </div>

        <aside className={styles.visual} aria-hidden="true">
          <span className={styles.sun} />

          <div className={styles.note}>
            <span>identidade</span>

            <strong>confirmada ✓</strong>
          </div>

          <div className={styles.mascotArea}>
            <span className={styles.halo} />

            <img src={mascot} alt="" />

            <span className={styles.shadow} />
          </div>

          <div className={styles.scribble}>
            <span />
            <span />
            <span />
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 CONG</span>

        <span>Identidade confirmada. Impacto pela frente.</span>
      </footer>
    </main>
  );
}
