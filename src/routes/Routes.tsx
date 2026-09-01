import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import RouteSeo from "../components/seo/RouteSeo";
import { PageTransitionProvider } from "../components/pageTransitionProvider/PageTransitionProvider";

import LoggedInLayout from "../layouts/LoggedInLayout";
import MainLayout from "../layouts/MainLayout";

import About from "../pages/about/About";
import AuthConfirm from "../pages/auth-confirm/AuthConfirm";
import InstitutionalCommunity from "../pages/community/Community";
import Documentation from "../pages/documentation/Documentation";
import FirstAccess from "../pages/logged-in/firstAccess/FirstAccess";
import Home from "../pages/home/Home";
import HowItWorks from "../pages/how-it-works/HowItWorks";

import Account from "../pages/logged-in/account/Account";
import LoggedInCommunity from "../pages/logged-in/community/Community";
import CompleteProfiles from "../pages/logged-in/completeProfiles/CompleteProfiles";
import RoleSelection from "../pages/logged-in/roleSelection/RoleSelection";

import Login from "../pages/login/Login";
import Pending from "../pages/pending/Pending";
import Register from "../pages/register/Register";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <RouteSeo />
      <PageTransitionProvider>
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

          {/* ==================================================
              ÁREA AUTENTICADA
              ================================================== */}

          <Route element={<ProtectedRoute />}>
            {/* ----------------------------------------------
                ONBOARDING

                Essas páginas NÃO usam LoggedInLayout,
                porque ainda fazem parte do primeiro acesso.
                ---------------------------------------------- */}

            <Route path="/app/primeiro-acesso" element={<FirstAccess />} />

            <Route path="/app/escolher-funcao" element={<RoleSelection />} />

            <Route
              path="/app/completar-perfis"
              element={<CompleteProfiles />}
            />

            {/* ----------------------------------------------
                SISTEMA PRINCIPAL

                Daqui para baixo, sidebar/topbar compartilhadas.
                ---------------------------------------------- */}

            <Route element={<LoggedInLayout />}>
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
      </PageTransitionProvider>
    </BrowserRouter>
  );
}
