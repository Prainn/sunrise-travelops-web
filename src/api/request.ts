import type { LoginResult } from "@/types/auth";
import { AuthStorage } from "@/utils/auth-storage";

export interface ApiResponse<T> {
  code: "SUCCESS";
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  code: string;
  message: string;
  data: null;
  details?: Record<string, unknown>;
  timestamp: string;
  path: string;
  requestId?: string;
}

type QueryValue = string | number | boolean | null | undefined;
type RequestParams = Record<string, QueryValue | readonly QueryValue[]> | URLSearchParams;

interface RequestOptions extends Omit<RequestInit, "body" | "method"> {
  params?: RequestParams;
  requiresAuth?: boolean;
  retryAfterRefresh?: boolean;
}

interface ApiErrorOptions {
  code: string;
  status?: number;
  details?: Record<string, unknown>;
  path?: string;
  requestId?: string;
  cause?: unknown;
}

const API_BASE_URL = (import.meta.env.VITE_APP_BASE_API || "/api").replace(/\/$/, "");
const NETWORK_ERROR_MESSAGE = "网络连接失败，请稍后重试";
const SYSTEM_ERROR_MESSAGE = "系统请求失败，请稍后重试";

export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;
  readonly path?: string;
  readonly requestId?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
    this.path = options.path;
    this.requestId = options.requestId;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

let refreshPromise: Promise<void> | null = null;

function appendParams(url: string, params?: RequestParams): string {
  if (!params) return url;

  const searchParams = params instanceof URLSearchParams
    ? new URLSearchParams(params)
    : new URLSearchParams();

  if (!(params instanceof URLSearchParams)) {
    Object.entries(params).forEach(([key, value]) => {
      const values = Array.isArray(value) ? value : [value];
      values.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          searchParams.append(key, String(item));
        }
      });
    });
  }

  const query = searchParams.toString();
  if (!query) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${query}`;
}

function createHeaders(options: RequestOptions, body?: unknown): Headers {
  const headers = new Headers(options.headers);
  if (body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requiresAuth !== false) {
    const accessToken = AuthStorage.getAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function parseError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null) as Partial<ApiErrorResponse> | null;
  const code = typeof body?.code === "string" ? body.code : `HTTP_${response.status}`;
  const message = typeof body?.message === "string" && body.message
    ? body.message
    : response.statusText || SYSTEM_ERROR_MESSAGE;

  return new ApiError(message, {
    code,
    status: response.status,
    details: isRecord(body?.details) ? body.details : undefined,
    path: typeof body?.path === "string" ? body.path : undefined,
    requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
  });
}

async function parseJsonData<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const body = await response.json().catch((error: unknown) => {
    throw new ApiError(SYSTEM_ERROR_MESSAGE, {
      code: "INVALID_API_RESPONSE",
      status: response.status,
      cause: error,
    });
  }) as unknown;

  if (!isRecord(body) || body.code !== "SUCCESS" || !("data" in body)) {
    throw new ApiError(SYSTEM_ERROR_MESSAGE, {
      code: "INVALID_API_RESPONSE",
      status: response.status,
    });
  }

  return (body as unknown as ApiResponse<T>).data;
}

async function redirectAfterSessionExpiry(): Promise<void> {
  if (typeof window === "undefined" || window.location.pathname === "/login") return;

  try {
    const { redirectToLogin } = await import("@/utils/auth");
    await redirectToLogin(undefined, false);
  } catch (error) {
    if (import.meta.env.DEV) console.error("Redirect to login failed:", error);
    window.location.assign("/login");
  }
}

async function expireSession(): Promise<void> {
  AuthStorage.clearAuth();
  await redirectAfterSessionExpiry();
}

async function rotateTokens(): Promise<void> {
  const refreshToken = AuthStorage.getRefreshToken();
  if (!refreshToken) {
    throw new ApiError("Missing refresh token", {
      code: "MISSING_REFRESH_TOKEN",
      status: 401,
    });
  }

  const tokens = await sendJsonRequest<LoginResult>(
    "POST",
    "/auth/refresh",
    { refreshToken },
    { requiresAuth: false, retryAfterRefresh: false }
  );
  AuthStorage.setTokens(
    tokens.accessToken,
    tokens.refreshToken,
    AuthStorage.getRememberMe()
  );
}

async function refreshTokensOnce(): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = rotateTokens()
    .catch(async (error: unknown) => {
      await expireSession();
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

async function sendRequest(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions
): Promise<Response> {
  const {
    params,
    requiresAuth: _requiresAuth,
    retryAfterRefresh: _retryAfterRefresh,
    ...fetchOptions
  } = options;
  const url = appendParams(`${API_BASE_URL}${path}`, params);

  try {
    return await fetch(url, {
      ...fetchOptions,
      method,
      headers: createHeaders(options, body),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    throw new ApiError(NETWORK_ERROR_MESSAGE, {
      code: "NETWORK_ERROR",
      cause: error,
    });
  }
}

async function sendJsonRequest<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions
): Promise<T> {
  const response = await sendRequest(method, path, body, options);
  const canRefresh = options.requiresAuth !== false && options.retryAfterRefresh !== false;

  if (response.status === 401 && canRefresh && AuthStorage.getRefreshToken()) {
    await refreshTokensOnce();
    return sendJsonRequest<T>(method, path, body, { ...options, retryAfterRefresh: false });
  }

  if (response.status === 401 && options.requiresAuth !== false) {
    await expireSession();
  }
  if (!response.ok) throw await parseError(response);

  return parseJsonData<T>(response);
}

async function sendBlobRequest(path: string, options: RequestOptions): Promise<Blob> {
  const response = await sendRequest("GET", path, undefined, options);
  const canRefresh = options.requiresAuth !== false && options.retryAfterRefresh !== false;

  if (response.status === 401 && canRefresh && AuthStorage.getRefreshToken()) {
    await refreshTokensOnce();
    return sendBlobRequest(path, { ...options, retryAfterRefresh: false });
  }

  if (response.status === 401 && options.requiresAuth !== false) {
    await expireSession();
  }
  if (!response.ok) throw await parseError(response);

  return response.blob();
}

export const request = {
  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return sendJsonRequest<T>("GET", path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return sendJsonRequest<T>("POST", path, body, options);
  },

  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return sendJsonRequest<T>("PUT", path, body, options);
  },

  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return sendJsonRequest<T>("PATCH", path, body, options);
  },

  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return sendJsonRequest<T>("DELETE", path, undefined, options);
  },

  getBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
    return sendBlobRequest(path, options);
  },
};
