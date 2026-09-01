import type { LoginResult } from "@/types/auth";
import { AuthStorage } from "@/utils/auth-storage";

interface ApiErrorBody {
  code?: string;
  message?: string | string[];
  details?: Record<string, unknown>;
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  requiresAuth?: boolean;
  retryAfterRefresh?: boolean;
}

const API_BASE_URL = (import.meta.env.VITE_APP_BASE_API || "/api").replace(/\/$/, "");

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

let refreshPromise: Promise<void> | null = null;

function createHeaders(options: RequestOptions): Headers {
  const headers = new Headers(options.headers);
  if (options.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requiresAuth !== false) {
    const accessToken = AuthStorage.getAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

async function parseError(response: Response): Promise<ApiRequestError> {
  const body = await response.json().catch(() => ({})) as ApiErrorBody;
  const message = Array.isArray(body.message)
    ? body.message.join("；")
    : body.message || response.statusText || "Request failed";

  return new ApiRequestError(
    message,
    response.status,
    body.code ?? `HTTP_${response.status}`,
    body.details
  );
}

async function rotateTokens(): Promise<void> {
  const refreshToken = AuthStorage.getRefreshToken();
  if (!refreshToken) throw new ApiRequestError("Missing refresh token", 401, "MISSING_REFRESH_TOKEN");

  const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) throw await parseError(response);

  const tokens = await response.json() as LoginResult;
  AuthStorage.setTokens(
    tokens.accessToken,
    tokens.refreshToken,
    AuthStorage.getRememberMe()
  );
}

async function refreshTokensOnce(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = rotateTokens()
    .catch((error) => {
      AuthStorage.clearAuth();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

/** 发送后端 API 请求，并对鉴权请求统一执行一次 token 刷新重试。 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const {
    body,
    requiresAuth: _requiresAuth,
    retryAfterRefresh: _retryAfterRefresh,
    ...fetchOptions
  } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...fetchOptions,
    headers: createHeaders(options),
    body: body === undefined ? undefined : JSON.stringify(body),
  }).catch(() => {
    throw new ApiRequestError("Network connection failed", 0, "NETWORK_ERROR");
  });

  const canRefresh = options.requiresAuth !== false && options.retryAfterRefresh !== false;
  if (response.status === 401 && canRefresh && AuthStorage.getRefreshToken()) {
    await refreshTokensOnce();
    return request<T>(path, { ...options, retryAfterRefresh: false });
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}
