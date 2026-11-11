const INTERNAL_ORIGIN = "http://internal.invalid";
const MAX_TARGET_LENGTH = 2048;
const LOGIN_PATH = /^\/login(?:\/|$)/i;

/** 反斜杠会被浏览器当作路径分隔符，与控制字符一起视为伪造的外部地址。 */
function hasUnsafeChars(value: string) {
  return [...value].some((char) => {
    const code = char.charCodeAt(0);
    return char === "\\" || code < 0x20 || code === 0x7f;
  });
}

/**
 * 校验登录后的回跳地址，只接受站内路由的路径、查询参数与 hash。
 *
 * @param value - 地址参数中的原始 redirect 值。
 * @param fallback - 不合法时使用的站内地址。
 * @returns 规范化后的站内地址，拒绝外部、协议相对、编码伪装及登录页循环。
 */
export function safeRedirectTarget(value: unknown, fallback = "/"): string {
  if (typeof value !== "string" || !value || value.length > MAX_TARGET_LENGTH) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || hasUnsafeChars(value)) return fallback;

  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(value.split(/[?#]/, 1)[0]!);
  } catch {
    return fallback;
  }
  if (decodedPath.startsWith("//") || hasUnsafeChars(decodedPath) || LOGIN_PATH.test(decodedPath)) return fallback;

  const url = new URL(value, INTERNAL_ORIGIN);
  if (url.origin !== INTERNAL_ORIGIN || LOGIN_PATH.test(url.pathname)) return fallback;
  return `${url.pathname}${url.search}${url.hash}`;
}
