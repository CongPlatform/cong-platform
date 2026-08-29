import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { FiAlertTriangle } from "react-icons/fi";

import { useAuth } from "../../contexts/auth-context";
import { completeOAuthLogin } from "../../services/oauthService";

type OAuthStatus = "loading" | "error";

export default function OAuthCallback() {
  const navigate = useNavigate();

  const { refreshSession } = useAuth();

  const [status, setStatus] = useState<OAuthStatus>("loading");

  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function finishOAuthLogin() {
      try {
        const returnTo = await completeOAuthLogin();

        if (!active) {
          return;
        }

        await refreshSession();

        if (!active) {
          return;
        }

        navigate(returnTo, {
          replace: true,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        console.error("Erro ao concluir OAuth:", error);

        setErrorMessage("Não foi possível concluir o login. Tente novamente.");

        setStatus("error");
      }
    }

    void finishOAuthLogin();

    return () => {
      active = false;
    };
  }, [navigate, refreshSession]);

  if (status === "error") {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
        }}
      >
        <section
          style={{
            textAlign: "center",
            maxWidth: "32rem",
          }}
        >
          <FiAlertTriangle size={32} aria-hidden="true" />

          <h1>Não foi possível entrar</h1>

          <p>{errorMessage}</p>

          <Link to="/login">Voltar para o login</Link>
        </section>
      </main>
    );
  }

  return null;
}
