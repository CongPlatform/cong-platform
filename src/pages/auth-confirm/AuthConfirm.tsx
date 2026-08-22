import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiArrowUpRight,
  FiCheck,
  FiClock,
  FiLoader,
  FiLogIn,
  FiMail,
} from "react-icons/fi";

import mascote from "../../assets/mascot/cong-default.webp";
import { supabase } from "../../services/supabase";
import styles from "../pending/Pending.module.css";

type ConfirmationStatus =
  | "loading"
  | "success"
  | "error";

export default function AuthConfirm() {
  const navigate = useNavigate();

  const [status, setStatus] =
    useState<ConfirmationStatus>("loading");

  useEffect(() => {
    let active = true;

    async function confirmEmail() {
      const params = new URLSearchParams(
        window.location.search,
      );

      const tokenHash =
        params.get("token_hash");

      const errorDescription =
        params.get("error_description");

      if (errorDescription) {
        if (active) {
          setStatus("error");
        }

        return;
      }

      if (tokenHash) {
        const { error } =
          await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: "email",
          });

        if (!active) {
          return;
        }

        setStatus(
          error ? "error" : "success",
        );

        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      setStatus(
        session ? "success" : "success",
      );
    }

    void confirmEmail();

    return () => {
      active = false;
    };
  }, []);

  const handleBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) {
      navigate(-1);
      return;
    }

    navigate("/login");
  };

  const isLoading = status === "loading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <main className={styles.pendingPage}>
      <header className={styles.topbar}>
        <button
          type="button"
          className={styles.backButton}
          onClick={handleBack}
        >
          <FiArrowLeft aria-hidden="true" />
          Voltar
        </button>

        <Link
          to="/login"
          className={styles.dashboardLink}
        >
          <FiLogIn aria-hidden="true" />
          Entrar
        </Link>
      </header>

      <section className={styles.hero}>
        <div className={styles.copy}>
          <div className={styles.metaRow}>
            <span className={styles.status}>
              {isLoading && (
                <FiLoader aria-hidden="true" />
              )}

              {isSuccess && (
                <FiCheck aria-hidden="true" />
              )}

              {isError && (
                <FiAlertTriangle aria-hidden="true" />
              )}

              {isLoading &&
                "Verificando e-mail"}

              {isSuccess &&
                "Verificação concluída"}

              {isError &&
                "Falha na verificação"}
            </span>

            <span className={styles.issue}>
              CONG / AUTH
            </span>
          </div>

          <div className={styles.titleBlock}>
            <span className={styles.kicker}>
              {isLoading &&
                "ESTAMOS VALIDANDO"}

              {isSuccess &&
                "TUDO CERTO"}

              {isError &&
                "ALGO DEU ERRADO"}
            </span>

            <h1>
              {isLoading && (
                <>
                  CONFIRMANDO
                  <span>E-MAIL</span>
                </>
              )}

              {isSuccess && (
                <>
                  E-MAIL
                  <span>CONFIRMADO</span>
                </>
              )}

              {isError && (
                <>
                  LINK
                  <span>INVÁLIDO</span>
                </>
              )}
            </h1>
          </div>

          <p className={styles.description}>
            {isLoading &&
              "A CONG está verificando seu endereço de e-mail. Isso deve levar apenas alguns segundos."}

            {isSuccess &&
              "Seu endereço de e-mail foi confirmado e sua conta está pronta. Agora você já pode entrar na CONG com seu e-mail e senha."}

            {isError &&
              "Não foi possível confirmar seu endereço de e-mail. O link pode ter expirado, já ter sido utilizado ou ser inválido."}
          </p>

          {!isLoading && (
            <div className={styles.actions}>
              {isSuccess ? (
                <Link
                  to="/login"
                  className={styles.primaryButton}
                >
                  <FiLogIn aria-hidden="true" />
                  Entrar na CONG
                </Link>
              ) : (
                <Link
                  to="/signup"
                  className={styles.primaryButton}
                >
                  <FiMail aria-hidden="true" />
                  Voltar ao cadastro
                </Link>
              )}

              <Link
                to="/"
                className={styles.secondaryButton}
              >
                Ir para o início
                <FiArrowUpRight aria-hidden="true" />
              </Link>
            </div>
          )}

          <div className={styles.timeline}>
            <div className={styles.timelineHeader}>
              <span>
                <FiClock aria-hidden="true" />

                Verificação da conta
              </span>

              <strong>
                {isLoading && "Verificando"}
                {isSuccess && "Concluída"}
                {isError && "Interrompida"}
              </strong>
            </div>

            <div className={styles.track}>
              <span />
            </div>

            <div className={styles.steps}>
              <span
                className={
                  styles.stepComplete
                }
              >
                Conta criada
              </span>

              <span
                className={
                  isSuccess
                    ? styles.stepComplete
                    : styles.stepActive
                }
              >
                E-mail confirmado
              </span>

              <span
                className={
                  isSuccess
                    ? styles.stepActive
                    : undefined
                }
              >
                Entrar na CONG
              </span>
            </div>
          </div>
        </div>

        <aside
          className={styles.visual}
          aria-hidden="true"
        >
          <div className={styles.poster}>
            <span className={styles.posterLabel}>
              CONG
            </span>

            <span className={styles.posterNumber}>
              {isSuccess ? "OK" : "01"}
            </span>

            <div className={styles.posterCenter}>
              <span className={styles.ring} />
              <span
                className={
                  styles.ringSecondary
                }
              />

              <img
                src={mascote}
                alt=""
                className={styles.mascot}
              />
            </div>

            <span className={styles.posterCaption}>
              CONSTRUIR · IMPACTAR · JUNTOS
            </span>
          </div>

          <div className={styles.tape}>
            <span>
              {isSuccess
                ? "E-MAIL CONFIRMADO"
                : "VERIFICANDO CONTA"}
            </span>

            <span>
              {isSuccess
                ? "E-MAIL CONFIRMADO"
                : "VERIFICANDO CONTA"}
            </span>

            <span>
              {isSuccess
                ? "E-MAIL CONFIRMADO"
                : "VERIFICANDO CONTA"}
            </span>
          </div>
        </aside>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 CONG Plataforma</span>

        <span>
          Segurança e identidade fazem parte da
          construção da comunidade.
        </span>
      </footer>
    </main>
  );
}