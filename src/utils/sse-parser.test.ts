import { describe, expect, it } from "vitest";
import { createSseParser, SseFrameTooLargeError, type SseMessage } from "./sse-parser";

const encode = (text: string) => new TextEncoder().encode(text);

function parse(chunks: Uint8Array[], maxFrameChars?: number) {
  const messages: SseMessage[] = [];
  const parser = createSseParser((message) => messages.push(message), maxFrameChars);
  for (const chunk of chunks) parser.push(chunk);
  parser.end();
  return messages;
}

/** 把字节按固定长度切开，模拟任意网络分块。 */
function split(bytes: Uint8Array, size: number) {
  const chunks: Uint8Array[] = [];
  for (let index = 0; index < bytes.length; index += size) chunks.push(bytes.slice(index, index + size));
  return chunks;
}

describe("SSE 解析", () => {
  const stream = 'event: ready\ndata: {"serverTime":"2026-11-12T01:00:00Z"}\n\n: ping\n\n' +
    'event: conversation.changed\r\ndata: {"conversationId":"c-1","reasons":["message"]}\r\n\r\n' +
    "event: note\ndata: 客户说：你好👋\n\n";
  const expected = [
    { event: "ready", data: '{"serverTime":"2026-11-12T01:00:00Z"}' },
    { event: "conversation.changed", data: '{"conversationId":"c-1","reasons":["message"]}' },
    { event: "note", data: "客户说：你好👋" },
  ];

  it("任意分块（含 UTF-8 多字节与 CRLF 被拆开）结果一致", () => {
    const bytes = encode(stream);
    for (const size of [1, 2, 3, 5, 7, 64, bytes.length]) expect(parse(split(bytes, size))).toEqual(expected);
  });

  it("一个块包含多个事件，注释与心跳不产生事件", () => {
    expect(parse([encode(": ping\n\n: ping\n\n" + stream)])).toEqual(expected);
  });

  it("多行 data 以换行拼接；无 data 的帧与多余空行忽略", () => {
    const messages = parse([encode("\n\nevent: x\n\ndata: a\ndata:b\ndata\n\nid: 1\nretry: 10\n\n")]);
    expect(messages).toEqual([{ event: "message", data: "a\nb\n" }]);
  });

  it("单独的 CR 也作为行尾", () => {
    expect(parse([encode("event: ready\rdata: {}\r\r")])).toEqual([{ event: "ready", data: "{}" }]);
  });

  it("EOF 时未完成的帧丢弃", () => {
    expect(parse([encode("event: ready\ndata: {}\n\nevent: resync\ndata: {}\n")])).toEqual([{ event: "ready", data: "{}" }]);
  });

  it("未完成帧超过上限时报错，不无限缓存", () => {
    const parser = createSseParser(() => undefined, 16);
    expect(() => parser.push(encode("data: " + "x".repeat(32)))).toThrow(SseFrameTooLargeError);
    const lines = createSseParser(() => undefined, 16);
    expect(() => lines.push(encode("data: 1234567\ndata: 1234567\ndata: 1\n"))).toThrow(SseFrameTooLargeError);
  });
});
