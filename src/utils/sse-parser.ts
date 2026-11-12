/** 一条已完成的 SSE 事件；注释行与心跳不产生事件。 */
export interface SseMessage {
  event: string;
  data: string;
}

/** 未完成帧超过上限；调用方应断开连接，不继续缓存。 */
export class SseFrameTooLargeError extends Error {
  constructor() {
    super("SSE frame exceeds size limit");
    this.name = "SseFrameTooLargeError";
  }
}

const LF = 10;
const CR = 13;

/**
 * 增量解析 text/event-stream：UTF-8 多字节可跨块，LF/CR/CRLF 均可作为行尾，空行结束一帧。
 * 只处理 event 与 data 字段；id/retry 等字段按规范忽略，EOF 时未完成的帧丢弃。
 *
 * @param onMessage - 每个完整事件的回调。
 * @param maxFrameChars - 单帧（含未完成行）允许的最大字符数。
 * @returns push 输入字节块；end 在流结束时调用。
 */
export function createSseParser(onMessage: (message: SseMessage) => void, maxFrameChars = 64 * 1024) {
  const decoder = new TextDecoder();
  let buffer = "";
  let skipLf = false;
  let eventName = "";
  let dataLines: string[] = [];
  let frameChars = 0;

  function resetFrame() {
    eventName = "";
    dataLines = [];
    frameChars = 0;
  }

  function handleLine(line: string) {
    if (line === "") {
      const hasData = dataLines.length > 0;
      const message = { event: eventName || "message", data: dataLines.join("\n") };
      resetFrame();
      if (hasData) onMessage(message);
      return;
    }
    if (line.startsWith(":")) return;
    frameChars += line.length;
    if (frameChars > maxFrameChars) throw new SseFrameTooLargeError();
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") eventName = value;
    else if (field === "data") dataLines.push(value);
  }

  function feed(text: string) {
    let start = 0;
    for (let index = 0; index < text.length; index++) {
      const code = text.charCodeAt(index);
      if (skipLf) {
        skipLf = false;
        if (code === LF) {
          start = index + 1;
          continue;
        }
      }
      if (code !== LF && code !== CR) continue;
      const line = buffer + text.slice(start, index);
      buffer = "";
      start = index + 1;
      // CRLF 可能被拆在两个块之间，记下 CR 以跳过下一块开头的 LF。
      if (code === CR) skipLf = true;
      handleLine(line);
    }
    buffer += text.slice(start);
    if (frameChars + buffer.length > maxFrameChars) throw new SseFrameTooLargeError();
  }

  return {
    push(chunk: Uint8Array) {
      feed(decoder.decode(chunk, { stream: true }));
    },
    end() {
      feed(decoder.decode());
      buffer = "";
      resetFrame();
    },
  };
}
