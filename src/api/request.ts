import type { LoginResult } from "@/types/auth";
import { AuthStorage } from "@/utils/auth-storage";
import { reloadPageWithoutConfirmation } from "@/utils/page-lifecycle";
import { sessionGate } from "@/utils/session-gate";
import { translate, translateIfExists } from "@/lang/utils";
import { ApiErrorCode } from "./error-code";

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
  /** 仅账号切换流程使用：切换冻结、身份替换后仍放行，且不计入在途写请求。 */
  bypassSessionGate?: boolean;
  /** 为 false 时 401 不刷新、不清除登录，由调用方处理。 */
  handleUnauthorized?: boolean;
  /** 等待响应头的超时毫秒数，默认 DEFAULT_TIMEOUT_MS；0 表示不限时。 */
  timeoutMs?: number;
}

interface ApiErrorOptions {
  code: string;
  serverMessage?: string;
  status?: number;
  details?: Record<string, unknown>;
  path?: string;
  requestId?: string;
  cause?: unknown;
}

const API_BASE_URL = (import.meta.env.VITE_APP_BASE_API || "/api").replace(/\/$/, "");
export const DEFAULT_TIMEOUT_MS = 30_000;
/** 文件上传解析、导出等长请求。 */
export const LONG_REQUEST_TIMEOUT_MS = 120_000;

function getErrorMessage(code: string, status?: number): string {
  return (
    translateIfExists(`apiErrors.${code}`) ??
    (status ? translateIfExists(`apiErrors.HTTP_${status}`) : undefined) ??
    translate("apiErrors.REQUEST_FAILED")
  );
}

export class ApiError extends Error {
  readonly code: string;
  readonly serverMessage?: string;
  readonly status?: number;
  readonly details?: Record<string, unknown>;
  readonly path?: string;
  readonly requestId?: string;

  constructor(message: string, options: ApiErrorOptions) {
    super(message, { cause: options.cause });
    this.name = "ApiError";
    this.code = options.code;
    this.serverMessage = options.serverMessage;
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

  const searchParams =
    params instanceof URLSearchParams ? new URLSearchParams(params) : new URLSearchParams();

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
  if (body !== undefined && !(body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (options.requiresAuth !== false) {
    const accessToken = AuthStorage.getAccessToken();
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  }

  return headers;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => null)) as Partial<ApiErrorResponse> | null;
  const code = typeof body?.code === "string" ? body.code : `HTTP_${response.status}`;

  return new ApiError(getErrorMessage(code, response.status), {
    code,
    serverMessage: typeof body?.message === "string" ? body.message : undefined,
    status: response.status,
    details: isRecord(body?.details) ? body.details : undefined,
    path: typeof body?.path === "string" ? body.path : undefined,
    requestId: typeof body?.requestId === "string" ? body.requestId : undefined,
  });
}

async function parseJsonData<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;

  const body = (await response.json().catch((error: unknown) => {
    throw new ApiError(getErrorMessage(ApiErrorCode.INVALID_API_RESPONSE, response.status), {
      code: ApiErrorCode.INVALID_API_RESPONSE,
      status: response.status,
      cause: error,
    });
  })) as unknown;

  if (!isRecord(body) || body.code !== "SUCCESS" || !("data" in body)) {
    throw new ApiError(getErrorMessage(ApiErrorCode.INVALID_API_RESPONSE, response.status), {
      code: ApiErrorCode.INVALID_API_RESPONSE,
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

function sessionGateError(code: string): ApiError {
  return new ApiError(getErrorMessage(code), { code });
}

/** 切换冻结时拒绝新请求与刷新；本页身份已替换或错过切换时不再用任何令牌发请求。 */
function assertSessionGate(options: RequestOptions): void {
  if (options.bypassSessionGate) return;
  if (sessionGate.isRetired()) throw sessionGateError(ApiErrorCode.ACCOUNT_SESSION_CHANGED);
  if (sessionGate.isStale()) {
    sessionGate.retire();
    reloadPageWithoutConfirmation();
    throw sessionGateError(ApiErrorCode.ACCOUNT_SESSION_CHANGED);
  }
  if (sessionGate.isFrozen()) throw sessionGateError(ApiErrorCode.ACCOUNT_SWITCH_IN_PROGRESS);
}

/** 请求期间身份已替换：丢弃旧身份回包，也不刷新或重试。 */
function assertSameEpoch(startEpoch: number): void {
  if (sessionGate.epoch() !== startEpoch)
    throw sessionGateError(ApiErrorCode.ACCOUNT_SESSION_CHANGED);
}

const REFRESH_LOCK_NAME = "sunrise-auth-token-refresh";

/** 刷新令牌一次性有效，跨标签页串行刷新；不支持 Web Locks 的环境只做单标签页合并。 */
export function runWithRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator === "undefined" || !navigator.locks) return task();
  return navigator.locks.request(REFRESH_LOCK_NAME, task);
}

/**
 * @param staleAccessToken 触发 401 的请求所使用的访问令牌。
 * 拿到锁后若存储里的令牌已不同，说明其他请求或标签页已完成刷新，直接重试即可。
 */
async function rotateTokens(staleAccessToken: string): Promise<void> {
  await runWithRefreshLock(async () => {
    if (AuthStorage.getAccessToken() !== staleAccessToken) return;

    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      throw new ApiError(getErrorMessage(ApiErrorCode.MISSING_REFRESH_TOKEN, 401), {
        code: ApiErrorCode.MISSING_REFRESH_TOKEN,
        status: 401,
      });
    }

    try {
      const tokens = await sendJsonRequest<LoginResult>(
        "POST",
        "/auth/refresh",
        { refreshToken },
        { requiresAuth: false, retryAfterRefresh: false },
      );
      // 刷新期间已退出或切换账号时，不把旧会话的新令牌写回存储。
      if (AuthStorage.getAccessToken() !== staleAccessToken) return;
      AuthStorage.setTokens(tokens.accessToken, tokens.refreshToken, AuthStorage.getRememberMe());
    } catch (error) {
      // 刷新接口的任何 401 都表示刷新令牌不可用；5xx、网络错误或超时保留会话以便恢复后重试。
      if (isApiError(error) && error.status === 401) {
        // 存储中的刷新令牌已被其他标签页更换时，不清除新会话，交给重试处理。
        if (AuthStorage.getRefreshToken() !== refreshToken) return;
        await expireSession();
      }
      throw error;
    }
  });
}

async function refreshTokensOnce(staleAccessToken: string): Promise<void> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = rotateTokens(staleAccessToken).finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

interface SentRequest {
  response: Response;
  signal: AbortSignal;
  timedOut: () => boolean;
  /** 响应体读取结束后释放超时计时器与调用方取消监听。 */
  release: () => void;
}

function abortError(timedOut: boolean, cause: unknown): ApiError {
  const code = timedOut ? ApiErrorCode.REQUEST_TIMEOUT : ApiErrorCode.NETWORK_ERROR;
  return new ApiError(getErrorMessage(code), { code, cause });
}

async function sendRequest(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions,
): Promise<SentRequest> {
  const {
    params,
    requiresAuth: _requiresAuth,
    retryAfterRefresh: _retryAfterRefresh,
    bypassSessionGate: _bypassSessionGate,
    handleUnauthorized: _handleUnauthorized,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal: callerSignal,
    ...fetchOptions
  } = options;
  const url = appendParams(`${API_BASE_URL}${path}`, params);

  // 超时与调用方取消合并为同一个信号；调用方主动取消仍按网络错误处理。
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);
  if (callerSignal?.aborted) abortFromCaller();
  else callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, timeoutMs)
      : undefined;

  const release = () => {
    clearTimeout(timer);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  };

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      method,
      headers: createHeaders(options, body),
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    return { response, signal: controller.signal, timedOut: () => timedOut, release };
  } catch (error) {
    release();
    throw abortError(timedOut, error);
  }
}

/** 超时与取消同样覆盖响应体读取，避免大文件传输停滞时一直等待。 */
async function readBody<T>(
  sent: SentRequest,
  reader: (response: Response) => Promise<T>,
): Promise<T> {
  try {
    return await reader(sent.response);
  } catch (error) {
    if (sent.signal.aborted) throw abortError(sent.timedOut(), error);
    throw error;
  }
}

function canRefreshAfter(options: RequestOptions): boolean {
  return (
    options.requiresAuth !== false &&
    options.retryAfterRefresh !== false &&
    options.handleUnauthorized !== false
  );
}

function shouldExpireAfter(options: RequestOptions): boolean {
  return options.requiresAuth !== false && options.handleUnauthorized !== false;
}

/**
 * @param startEpoch 首次发出时的身份代次；刷新后的重试沿用，身份已替换则不重发。
 */
async function sendJsonRequest<T>(
  method: string,
  path: string,
  body: unknown,
  options: RequestOptions,
  startEpoch = sessionGate.epoch(),
): Promise<T> {
  if (!options.bypassSessionGate && options.requiresAuth !== false) await sessionGate.waitVerified();
  assertSessionGate(options);
  const isTrackedWrite =
    method !== "GET" && options.requiresAuth !== false && !options.bypassSessionGate;
  const endWrite = isTrackedWrite ? sessionGate.beginWrite() : undefined;

  try {
    const sentAccessToken = AuthStorage.getAccessToken();
    const sent = await sendRequest(method, path, body, options);
    const { response } = sent;
    try {
      assertSameEpoch(startEpoch);

      if (response.status === 401 && canRefreshAfter(options) && AuthStorage.getRefreshToken()) {
        sent.release();
        await refreshTokensOnce(sentAccessToken);
        assertSameEpoch(startEpoch);
        return await sendJsonRequest<T>(
          method,
          path,
          body,
          { ...options, retryAfterRefresh: false },
          startEpoch,
        );
      }

      if (response.status === 401 && shouldExpireAfter(options)) {
        await expireSession();
      }
      if (!response.ok) throw await readBody(sent, parseError);

      return await readBody(sent, parseJsonData<T>);
    } finally {
      sent.release();
    }
  } finally {
    endWrite?.();
  }
}

async function sendBlobRequest(
  path: string,
  options: RequestOptions,
  startEpoch = sessionGate.epoch(),
): Promise<Blob> {
  if (!options.bypassSessionGate && options.requiresAuth !== false) await sessionGate.waitVerified();
  assertSessionGate(options);
  const sentAccessToken = AuthStorage.getAccessToken();
  const sent = await sendRequest("GET", path, undefined, options);
  const { response } = sent;
  try {
    assertSameEpoch(startEpoch);

    if (response.status === 401 && canRefreshAfter(options) && AuthStorage.getRefreshToken()) {
      sent.release();
      await refreshTokensOnce(sentAccessToken);
      assertSameEpoch(startEpoch);
      return await sendBlobRequest(path, { ...options, retryAfterRefresh: false }, startEpoch);
    }

    if (response.status === 401 && shouldExpireAfter(options)) {
      await expireSession();
    }
    if (!response.ok) throw await readBody(sent, parseError);

    return await readBody(sent, (body) => body.blob());
  } finally {
    sent.release();
  }
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

  /** body 可选；需要 JSON 请求体的删除接口（如解除账号关联）通过 options.body 传入。 */
  delete<T>(path: string, { body, ...options }: RequestOptions & { body?: unknown } = {}): Promise<T> {
    return sendJsonRequest<T>("DELETE", path, body, options);
  },

  getBlob(path: string, options: RequestOptions = {}): Promise<Blob> {
    return sendBlobRequest(path, options);
  },
};
