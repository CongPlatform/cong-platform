import type { Provider } from "@supabase/supabase-js";

import { apiPost, storeAuthTokens } from "./api";

import { supabase } from "./supabase";

export type OAuthProvider = "google" | "github";

const OAUTH_RETURN_TO_KEY = "cong:oauth-return-to";

interface OAuthCompleteResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export async function startOAuthLogin(
  provider: OAuthProvider,
  returnTo = "/app/comunidade",
): Promise<void> {
  sessionStorage.setItem(OAUTH_RETURN_TO_KEY, returnTo);

  const redirectTo = `${window.location.origin}/auth/oauth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: provider as Provider,

    options: {
      redirectTo,
    },
  });

  if (error) {
    sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);

    throw error;
  }
}

export async function completeOAuthLogin(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const session = data.session;

  if (!session) {
    throw new Error("A sessão OAuth não foi encontrada.");
  }

  /*
   * A partir daqui a autenticação do Supabase
   * passa a ser também a autenticação utilizada
   * pela API da CONG.
   */

  storeAuthTokens(session.access_token, session.refresh_token, true);

  try {
    await apiPost<OAuthCompleteResponse>("/auth/oauth/complete");
  } catch (error) {
    /*
     * Se a criação/vinculação da conta CONG falhar,
     * não deixamos tokens parcialmente válidos.
     */
    
    await supabase.auth.signOut();

    throw error;
  }

  const returnTo =
    sessionStorage.getItem(OAUTH_RETURN_TO_KEY) ?? "/app/comunidade";

  sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);

  return returnTo;
}
