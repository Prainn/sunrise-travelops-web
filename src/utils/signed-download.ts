const DOWNLOAD_FRAME_TTL_MS = 60_000;

/**
 * 通过隐藏 iframe 触发后端签名的 attachment 下载，避免顶层导航在存在未保存表单时弹出离开确认。
 *
 * @param url - 服务端签发的安全下载地址（仅允许 http/https 或站内相对路径）。
 */
export function triggerSignedDownload(url: string): void {
  const trimmed = url.trim();
  if (!trimmed || (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/"))) {
    throw new Error("Invalid download URL");
  }
  const frame = document.createElement("iframe");
  frame.hidden = true;
  frame.referrerPolicy = "no-referrer";
  frame.src = trimmed;
  document.body.append(frame);
  // 过早移除会中断下载，保留至签名链接失效。
  setTimeout(() => frame.remove(), DOWNLOAD_FRAME_TTL_MS);
}
