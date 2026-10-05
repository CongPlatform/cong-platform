import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import ProtectedRoute from "../components/ProtectedRoute";
import WorkspaceRoute from "../components/WorkspaceRoute";
import RouteSeo from "../components/seo/RouteSeo";
import { PageTransitionProvider } from "../components/pageTransitionProvider/PageTransitionProvider";

import OrganizationProvider from "../contexts/OrganizationProvider";
import WorkspaceProvider from "../contexts/WorkspaceProvider";
import { institutionalSlugFromHostname } from "../utils/institutionalDomain";

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
const PublicInstitutionalSite = lazy(
  () => import("../pages/publicInstitutional/PublicInstitutionalSite"),
);

// ==================================================
// AUTENTICAÇÃO
// ==================================================

const Login = lazy(() => import("../pages/login/Login"));
const Register = lazy(() => import("../pages/register/Register"));
const VerifyEmail = lazy(() => import("../pages/verifyEmail/VerifyEmail"));
const AuthConfirm = lazy(() => import("../pages/auth-confirm/AuthConfirm"));
const OAuthCallback = lazy(
  () => import("../pages/oauth-callback/OAuthCallback"),
);
const RecoverPassword = lazy(
  () => import("../pages/recoverPassword/RecoverPassword"),
);
const ResetPassword = lazy(
  () => import("../pages/resetPassword/ResetPassword"),
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
const CommunityProfile = lazy(
  () => import("../pages/logged-in/communityProfile/CommunityProfile"),
);
const CommunityModerationPage = lazy(
  () => import("../pages/logged-in/community/CommunityModerationPage"),
);
const Pending = lazy(() => import("../pages/pending/Pending"));
const InstitutionalHome = lazy(
  () => import("../pages/logged-in/institutional/InstitutionalHome"),
);
const InstitutionalEditor = lazy(
  () => import("../pages/logged-in/institutional/InstitutionalEditor"),
);
const DesignerTemplates = lazy(
  () => import("../pages/logged-in/designerTemplates/DesignerTemplates"),
);
const DesignerTemplateEditor = lazy(
  () => import("../pages/logged-in/designerTemplates/DesignerTemplateEditor"),
);
const DesignerVariants = lazy(
  () => import("../pages/logged-in/designerVariants/DesignerVariants"),
);
const DesignerAssets = lazy(
  () => import("../pages/logged-in/designerAssets/DesignerAssets"),
);

export default function AppRoutes() {
  const publicSiteSlug = institutionalSlugFromHostname(window.location.hostname);

  if (publicSiteSlug) {
    return (
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="*" element={<PublicInstitutionalSite slugOverride={publicSiteSlug} />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    );
  }

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
            <Route path="/recuperar-senha" element={<RecoverPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            
            <Route path="/verifique-seu-email" element={<VerifyEmail />} />
            <Route path="/auth/confirm" element={<AuthConfirm />} />

            <Route path="/auth/oauth/callback" element={<OAuthCallback />} />
            <Route path="/oauth-callback" element={<OAuthCallback />} />

            <Route path="/o/:slug" element={<PublicInstitutionalSite />} />

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
                    <WorkspaceProvider>
                      <LoggedInLayout />
                    </WorkspaceProvider>
                  </OrganizationProvider>
                }
              >
                <Route path="/app/comunidade" element={<LoggedInCommunity />} />
                <Route
                  path="/app/comunidade/minha-atividade"
                  element={<LoggedInCommunity />}
                />
                <Route
                  path="/app/comunidade/perfil/:entityType/:entityId"
                  element={<CommunityProfile />}
                />
                <Route
                  path="/app/moderacao"
                  element={<CommunityModerationPage />}
                />
                <Route path="/app/minha-conta" element={<Account />} />
                <Route
                  path="/app/site-institucional"
                  element={
                    <WorkspaceRoute kind="organization" organizationType="ngo">
                      <InstitutionalHome />
                    </WorkspaceRoute>
                  }
                />
                <Route
                  path="/app/site-institucional/:siteId/editor"
                  element={
                    <WorkspaceRoute kind="organization" organizationType="ngo">
                      <InstitutionalEditor />
                    </WorkspaceRoute>
                  }
                />
                <Route
                  path="/app/design/templates"
                  element={
                    <WorkspaceRoute kind="collaboration" collaborationRole="designer">
                      <DesignerTemplates />
                    </WorkspaceRoute>
                  }
                />
                <Route
                  path="/app/design/templates/:templateId"
                  element={
                    <WorkspaceRoute kind="collaboration" collaborationRole="designer">
                      <DesignerTemplateEditor />
                    </WorkspaceRoute>
                  }
                />
                <Route
                  path="/app/design/variantes"
                  element={
                    <WorkspaceRoute kind="collaboration" collaborationRole="designer">
                      <DesignerVariants />
                    </WorkspaceRoute>
                  }
                />
                <Route
                  path="/app/design/recursos"
                  element={
                    <WorkspaceRoute kind="collaboration" collaborationRole="designer">
                      <DesignerAssets />
                    </WorkspaceRoute>
                  }
                />
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
