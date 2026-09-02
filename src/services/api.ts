import { getStoredActiveOrganizationId } from "./organizationStorage";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

const API_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/$/, "")
  : import.meta.env.DEV
    ? "/api"
    : "";

const TOKEN_KEY = "cong:auth-token";
const REFRESH_TOKEN_KEY = "cong:refresh-token";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    sessionStorage.getItem(REFRESH_TOKEN_KEY)
  );
}

export function storeAuthTokens(
  accessToken: string,
  refreshToken: string,
  remember: boolean,
): void {
  clearStoredAuthToken();

  const storage = remember ? localStorage : sessionStorage;

  storage.setItem(TOKEN_KEY, accessToken);

  storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function isAuthStoredPersistently(): boolean {
  return localStorage.getItem(TOKEN_KEY) !== null;
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);

  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

interface ApiRequestOptions extends RequestInit {
  authenticated?: boolean;
  retryOnUnauthorized?: boolean;
  organizationScoped?: boolean;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

async function parseResponseBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") || "";

  if (response.status === 204) {
    return null;
  }

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
}

let refreshRequest: Promise<RefreshResponse> | null = null;

async function refreshStoredSession(): Promise<RefreshResponse> {
  const refreshToken = getStoredRefreshToken();

  if (!refreshToken) {
    throw new ApiError(
      "Não existe uma sessão que possa ser renovada.",
      401,
      "REFRESH_TOKEN_NOT_FOUND",
    );
  }

  if (refreshRequest) {
    return refreshRequest;
  }

  const remember = isAuthStoredPersistently();

  refreshRequest = apiRequest<RefreshResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({
      refreshToken,
    }),
    authenticated: false,
    retryOnUnauthorized: false,
  })
    .then((session) => {
      storeAuthTokens(session.accessToken, session.refreshToken, remember);

      return session;
    })
    .finally(() => {
      refreshRequest = null;
    });

  return refreshRequest;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "A API da CONG não foi configurada. Defina VITE_API_URL com o endereço público do backend.",
      0,
      "API_URL_NOT_CONFIGURED",
    );
  }

  const {
    authenticated = true,
    retryOnUnauthorized = true,
    organizationScoped = false,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders = new Headers(headers);

  if (
    requestOptions.body &&
    !(requestOptions.body instanceof FormData) &&
    !requestHeaders.has("Content-Type")
  ) {
    requestHeaders.set("Content-Type", "application/json");
  }

  if (authenticated) {
    const token = getStoredAuthToken();

    if (token) {
      requestHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  if (organizationScoped) {
    const organizationId = getStoredActiveOrganizationId();

    if (!organizationId) {
      throw new ApiError(
        "Nenhuma organização ativa foi selecionada.",
        400,
        "ORGANIZATION_CONTEXT_REQUIRED",
      );
    }

    requestHeaders.set("X-Organization-Id", organizationId);
  }

  let response: Response;

  try {
    response = await fetch(
      `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
      {
        ...requestOptions,

        headers: requestHeaders,
        credentials: "same-origin",
      },
    );
  } catch (error) {
    throw new ApiError(
      "Não foi possível conectar ao servidor da CONG.",
      0,
      "NETWORK_ERROR",
      error,
    );
  }

  const payload = await parseResponseBody(response);

  if (
    response.status === 401 &&
    authenticated &&
    retryOnUnauthorized &&
    getStoredRefreshToken()
  ) {
    await refreshStoredSession();

    return apiRequest<T>(endpoint, {
      ...requestOptions,
      headers,
      authenticated: true,
      retryOnUnauthorized: false,
      organizationScoped,
    });
  }

  if (!response.ok) {
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string" &&
      payload.message.includes("Cannot POST")
    ) {
      throw new ApiError(
        "A requisição chegou a um servidor que não possui esta rota. Verifique se o backend está em execução e se VITE_API_URL aponta para ele, não para o front-end.",
        response.status,
        "WRONG_API_SERVER",
        payload,
      );
    }

    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as Record<string, unknown>)
        : {};

    const message =
      typeof errorPayload.error === "string"
        ? errorPayload.error
        : typeof errorPayload.erro === "string"
          ? errorPayload.erro
          : typeof errorPayload.message === "string"
            ? errorPayload.message
            : "A requisição não pôde ser concluída.";

    const code =
      typeof errorPayload.code === "string" ? errorPayload.code : undefined;

    throw new ApiError(message, response.status, code, payload);
  }

  return payload as T;
}

export function apiGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "GET",
  });
}

export function apiPost<T>(
  endpoint: string,
  data?: unknown,
  authenticated = true,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",

    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),

    authenticated,
  });
}

interface ApiUploadOptions {
  fieldName?: string;

  onProgress?: (progress: number) => void;

  signal?: AbortSignal;

  authenticated?: boolean;

  retryOnUnauthorized?: boolean;
}

interface UploadResponse {
  status: number;
  payload: unknown;
}

function parseUploadResponse(xhr: XMLHttpRequest): unknown {
  if (!xhr.responseText) {
    return null;
  }

  const contentType = xhr.getResponseHeader("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(xhr.responseText);
    } catch {
      return null;
    }
  }

  return {
    message: xhr.responseText,
  };
}

function sendUploadRequest(
  endpoint: string,
  file: File,
  options: ApiUploadOptions,
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    const {
      fieldName = "file",
      onProgress,
      signal,
      authenticated = true,
    } = options;

    if (signal?.aborted) {
      reject(new DOMException("Upload cancelado.", "AbortError"));

      return;
    }

    const formData = new FormData();

    formData.append(fieldName, file, file.name);

    const abortUpload = () => {
      xhr.abort();
    };

    const cleanup = () => {
      signal?.removeEventListener("abort", abortUpload);
    };

    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) {
        return;
      }

      const progress = event.loaded / event.total;

      onProgress?.(Math.min(1, Math.max(0, progress)));
    });

    xhr.addEventListener("load", () => {
      cleanup();

      resolve({
        status: xhr.status,
        payload: parseUploadResponse(xhr),
      });
    });

    xhr.addEventListener("error", () => {
      cleanup();

      reject(
        new ApiError(
          "Não foi possível enviar o arquivo.",
          0,
          "UPLOAD_NETWORK_ERROR",
        ),
      );
    });

    xhr.addEventListener("timeout", () => {
      cleanup();

      reject(
        new ApiError("O envio do arquivo demorou demais.", 0, "UPLOAD_TIMEOUT"),
      );
    });

    xhr.addEventListener("abort", () => {
      cleanup();

      reject(new DOMException("Upload cancelado.", "AbortError"));
    });

    xhr.open(
      "POST",
      `${API_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
    );

    xhr.timeout = 60_000;

    if (authenticated) {
      const token = getStoredAuthToken();

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
    }

    signal?.addEventListener("abort", abortUpload, {
      once: true,
    });

    xhr.send(formData);
  });
}

export async function apiUpload<T>(
  endpoint: string,
  file: File,
  options: ApiUploadOptions = {},
): Promise<T> {
  if (!API_URL) {
    throw new ApiError(
      "A API da CONG não foi configurada.",
      0,
      "API_URL_NOT_CONFIGURED",
    );
  }

  const { retryOnUnauthorized = true, authenticated = true } = options;

  const response = await sendUploadRequest(endpoint, file, options);

  if (
    response.status === 401 &&
    authenticated &&
    retryOnUnauthorized &&
    getStoredRefreshToken()
  ) {
    await refreshStoredSession();

    return apiUpload<T>(endpoint, file, {
      ...options,
      retryOnUnauthorized: false,
    });
  }

  if (response.status < 200 || response.status >= 300) {
    const payload =
      response.payload && typeof response.payload === "object"
        ? (response.payload as Record<string, unknown>)
        : {};

    const message =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.message === "string"
          ? payload.message
          : "O arquivo não pôde ser enviado.";

    const code = typeof payload.code === "string" ? payload.code : undefined;

    throw new ApiError(message, response.status, code, response.payload);
  }

  return response.payload as T;
}

export function apiPatch<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",
    body: data === undefined ? undefined : JSON.stringify(data),
  });
}

export function apiDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "DELETE",
  });
}

export function apiTenantGet<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "GET",
    organizationScoped: true,
  });
}

export function apiTenantPost<T>(endpoint: string, data?: unknown): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "POST",

    body:
      data === undefined
        ? undefined
        : data instanceof FormData
          ? data
          : JSON.stringify(data),

    organizationScoped: true,
  });
}

export function apiTenantPatch<T>(
  endpoint: string,
  data?: unknown,
): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "PATCH",

    body: data === undefined ? undefined : JSON.stringify(data),

    organizationScoped: true,
  });
}

export function apiTenantDelete<T>(endpoint: string): Promise<T> {
  return apiRequest<T>(endpoint, {
    method: "DELETE",
    organizationScoped: true,
  });
}
