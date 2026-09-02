import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import RouteSeo from "../components/seo/RouteSeo";
import { PageTransitionProvider } from "../components/pageTransitionProvider/PageTransitionProvider";

import OrganizationProvider from "../contexts/OrganizationProvider";

// ==================================================
// LAYOUTS
// ==================================================

const MainLayout = lazy(() => import("../layouts/MainLayout"));

const LoggedInLayout = lazy(() => import("../layouts/LoggedInLayout"));

// ==================================================
// SITE INSTITUCIONAL
// ==================================================

const Home = lazy(() => import("../pages/home/Home"));

const HowItWorks = lazy(() => import("../pages/how-it-works/HowItWorks"));

const Documentation = lazy(
  () => import("../pages/documentation/Documentation"),
);

const InstitutionalCommunity = lazy(
  () => import("../pages/community/Community"),
);

const About = lazy(() => import("../pages/about/About"));

// ==================================================
// AUTENTICAÇÃO
// ==================================================

const Login = lazy(() => import("../pages/login/Login"));

const Register = lazy(() => import("../pages/register/Register"));

const AuthConfirm = lazy(() => import("../pages/auth-confirm/AuthConfirm"));

const OAuthCallback = lazy(
  () => import("../pages/oauth-callback/OAuthCallback"),
);

// ==================================================
// ÁREA AUTENTICADA
// ==================================================

const FirstAccess = lazy(
  () => import("../pages/logged-in/firstAccess/FirstAccess"),
);

const RoleSelection = lazy(
  () => import("../pages/logged-in/roleSelection/RoleSelection"),
);

const CompleteProfiles = lazy(
  () => import("../pages/logged-in/completeProfiles/CompleteProfiles"),
);

const Account = lazy(() => import("../pages/logged-in/account/Account"));

const LoggedInCommunity = lazy(
  () => import("../pages/logged-in/community/Community"),
);

const Pending = lazy(() => import("../pages/pending/Pending"));

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteSeo />

      <PageTransitionProvider>
        <Suspense fallback={null}>
          <Routes>
            {/* ==================================================
                SITE INSTITUCIONAL
                ================================================== */}

            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />

              <Route path="/como-funciona" element={<HowItWorks />} />

              <Route path="/documentacao" element={<Documentation />} />

              <Route path="/comunidade" element={<InstitutionalCommunity />} />

              <Route path="/sobre" element={<About />} />
            </Route>

            {/* ==================================================
                AUTENTICAÇÃO
                ================================================== */}

            <Route path="/login" element={<Login />} />

            <Route path="/signup" element={<Register />} />

            <Route path="/auth/confirm" element={<AuthConfirm />} />

            <Route path="/auth/oauth/callback" element={<OAuthCallback />} />

            {/* ==================================================
                ÁREA AUTENTICADA
                ================================================== */}

            <Route element={<ProtectedRoute />}>
              {/* ----------------------------------------------
                  ONBOARDING
                  ---------------------------------------------- */}

              <Route path="/app/primeiro-acesso" element={<FirstAccess />} />

              <Route path="/app/escolher-funcao" element={<RoleSelection />} />

              <Route
                path="/app/completar-perfis"
                element={<CompleteProfiles />}
              />

              {/* ----------------------------------------------
                  SISTEMA PRINCIPAL
                  ---------------------------------------------- */}

              <Route
                element={
                  <OrganizationProvider>
                    <LoggedInLayout />
                  </OrganizationProvider>
                }
              >
                <Route path="/app/comunidade" element={<LoggedInCommunity />} />

                <Route path="/app/minha-conta" element={<Account />} />

                <Route path="/em-construcao" element={<Pending />} />
              </Route>

              {/* ==================================================
                  COMPATIBILIDADE COM ROTAS ANTIGAS
                  ================================================== */}

              <Route
                path="/primeiro-acesso"
                element={<Navigate to="/app/primeiro-acesso" replace />}
              />

              <Route
                path="/selecionar-perfil"
                element={<Navigate to="/app/escolher-funcao" replace />}
              />

              <Route
                path="/app/criar-perfil"
                element={<Navigate to="/app/completar-perfis" replace />}
              />

              <Route
                path="/app/criar-perfil/:role"
                element={<Navigate to="/app/completar-perfis" replace />}
              />

              <Route
                path="/community"
                element={<Navigate to="/app/comunidade" replace />}
              />

              <Route
                path="/dashboard"
                element={<Navigate to="/app/comunidade" replace />}
              />
            </Route>

            {/* ==================================================
                FALLBACK
                ================================================== */}

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageTransitionProvider>
    </BrowserRouter>
  );
}
