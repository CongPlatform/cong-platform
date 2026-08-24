import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "../contexts/auth-context";

function LoadingSession() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f8f6ef",
        fontFamily: "inherit",
      }}
    >
      <p>Verificando sua sessão...</p>
    </main>
  );
}

export default function ProtectedRoute() {
  const { user, account, loading, accountLoading } = useAuth();

  const location = useLocation();

  if (loading) {
    return <LoadingSession />;
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  if (accountLoading || !account) {
    return <LoadingSession />;
  }

  const path = location.pathname;

  /* ==================================================
     ETAPA 1 — IDENTIDADE
     ================================================== */

  if (account.onboardingStep === "identity") {
    if (path !== "/app/primeiro-acesso") {
      return <Navigate to="/app/primeiro-acesso" replace />;
    }

    return <Outlet />;
  }

  /* ==================================================
     ETAPA 2 — ESCOLHA DE PARTICIPAÇÃO
     ================================================== */

  if (account.onboardingStep === "roles") {
    if (path !== "/app/escolher-funcao") {
      return <Navigate to="/app/escolher-funcao" replace />;
    }

    return <Outlet />;
  }

  /* ==================================================
     ETAPA 3 — COMPLETAR PERFIS

     Durante esta etapa a pessoa também pode voltar
     para rever as escolhas feitas na etapa anterior.
     ================================================== */

  if (account.onboardingStep === "profiles") {
    const isCompleteProfiles = path === "/app/completar-perfis";

    const isRoleSelection = path === "/app/escolher-funcao";

    if (!isCompleteProfiles && !isRoleSelection) {
      return <Navigate to="/app/completar-perfis" replace />;
    }

    return <Outlet />;
  }

  /* ==================================================
     ONBOARDING CONCLUÍDO

     Não deixa voltar manualmente para telas
     do primeiro acesso.
     ================================================== */

  if (
    path === "/app/primeiro-acesso" ||
    path === "/app/escolher-funcao" ||
    path === "/app/completar-perfis"
  ) {
    return <Navigate to="/app/comunidade" replace />;
  }

  return <Outlet />;
}
