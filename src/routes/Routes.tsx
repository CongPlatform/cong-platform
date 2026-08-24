import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import { PageTransitionProvider } from "../components/pageTransitionProvider/PageTransitionProvider";
import MainLayout from "../layouts/MainLayout";

import About from "../pages/about/About";
import InstitutionalCommunity from "../pages/community/Community";
import Documentation from "../pages/documentation/Documentation";
import Home from "../pages/home/Home";
import HowItWorks from "../pages/how-it-works/HowItWorks";
import LoggedInCommunity from "../pages/logged-in/community/Community";
import RoleSelection from "../pages/logged-in/roleSelection/RoleSelection";
import Login from "../pages/login/Login";
import Pending from "../pages/pending/Pending";
import Register from "../pages/register/Register";
import AuthConfirm from "../pages/auth-confirm/AuthConfirm";
import Account from "../pages/logged-in/account/Account";
import VerifyEmail from "../pages/verifyEmail/VerifyEmail";
import FirstAccess from "../pages/logged-in/firstAccess/FirstAccess";
import CompleteProfiles from "../pages/logged-in/completeProfiles/CompleteProfiles";

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <PageTransitionProvider>
        <Routes>
          {/* Site institucional */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />

            <Route path="/como-funciona" element={<HowItWorks />} />

            <Route path="/documentacao" element={<Documentation />} />

            <Route path="/comunidade" element={<InstitutionalCommunity />} />

            <Route path="/sobre" element={<About />} />
          </Route>

          {/* Autenticação */}
          <Route path="/login" element={<Login />} />

          <Route path="/signup" element={<Register />} />

          <Route path="/verifique-seu-email" element={<VerifyEmail />} />

          <Route path="/auth/confirm" element={<AuthConfirm />} />

          {/* Sistema logado */}
          <Route element={<ProtectedRoute />}>
            <Route path="/app/primeiro-acesso" element={<FirstAccess />} />

            <Route path="/app/escolher-funcao" element={<RoleSelection />} />

            <Route path="/app/comunidade" element={<LoggedInCommunity />} />

            <Route
              path="/app/completar-perfis"
              element={<CompleteProfiles />}
            />

            <Route path="/app/minha-conta" element={<Account />} />

            <Route path="/em-construcao" element={<Pending />} />

            <Route
              path="/selecionar-perfil"
              element={<Navigate to="/app/escolher-funcao" replace />}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PageTransitionProvider>
    </BrowserRouter>
  );
}
