export type InlineNode = string | { tag: "strong" | "em" | "s" | "code"; children: InlineNode[] };
export interface MessageBlock {
  kind: "paragraph" | "quote" | "unordered" | "ordered" | "code";
  lines: InlineNode[][];
  numbers?: number[];
  code?: string;
}

const INLINE_MARKERS = [
  { marker: "```", tag: "code" },
  { marker: "`", tag: "code" },
  { marker: "*", tag: "strong" },
  { marker: "_", tag: "em" },
  { marker: "~", tag: "s" },
] as const;
export const isWord = (char: string) => /[\p{L}\p{N}]/u.test(char);
export const isCjk = (char: string) => /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(char);
/**
 * WhatsApp 是否识别紧贴汉字等 CJK 文字的格式标记（如“哈哈*哈哈*”）。
 * 以手机端实测为准：false 时按普通字母处理，标记两侧须有空格或标点。
 * 2026-11-12 测试会话实测：手机端将“哈哈*哈哈*”显示为原样星号，不识别。
 */
export const CJK_MARKER_BOUNDARY = false;
/** 与该字符相邻的标记不会被 WhatsApp 识别为格式。 */
export const blocksMarker = (char: string) => isWord(char) && !(CJK_MARKER_BOUNDARY && isCjk(char));

/** Parse WhatsApp's text markers into a closed set of nodes, never HTML. */
export function parseInline(text: string, used: string[] = []): InlineNode[] {
  const nodes: InlineNode[] = [];
  let plain = "";
  for (let index = 0; index < text.length;) {
    let matched = false;
    for (const { marker, tag } of INLINE_MARKERS) {
      if (used.includes(marker) || !text.startsWith(marker, index)) continue;
      const before = text[index - 1] ?? "";
      if (blocksMarker(before) || (marker.length === 1 && (before === marker || text[index + 1] === marker))) continue;
      const start = index + marker.length;
      const end = text.indexOf(marker, start);
      if (end <= start) continue;
      const content = text.slice(start, end);
      const after = text[end + marker.length] ?? "";
      if (tag !== "code" && (/^\s|\s$/.test(content) || blocksMarker(after) || after === marker)) continue;
      if (plain) { nodes.push(plain); plain = ""; }
      nodes.push({ tag, children: tag === "code" ? [content] : parseInline(content, [...used, marker]) });
      index = end + marker.length;
      matched = true;
      break;
    }
    if (!matched) plain += text[index++];
  }
  if (plain) nodes.push(plain);
  return nodes;
}

function lineKind(line: string): MessageBlock["kind"] {
  if (/^[-*] /.test(line)) return "unordered";
  if (/^\d{1,9}\. /.test(line)) return "ordered";
  if (/^> /.test(line)) return "quote";
  return "paragraph";
}

export function parseMessageText(text: string): MessageBlock[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MessageBlock[] = [];
  for (let index = 0; index < lines.length;) {
    if (lines[index] === "```") {
      const end = lines.indexOf("```", index + 1);
      if (end > index) {
        blocks.push({ kind: "code", code: lines.slice(index + 1, end).join("\n"), lines: [] });
        index = end + 1;
        continue;
      }
    }
    const kind = lineKind(lines[index]!);
    const group: string[] = [];
    const numbers: number[] = [];
    do {
      const line = lines[index++]!;
      if (kind === "ordered") numbers.push(Number(line.match(/^\d+/)![0]));
      group.push(kind === "paragraph" ? line : line.replace(/^(?:[-*>] |\d+\. )/, ""));
    } while (index < lines.length && lines[index] !== "```" && lineKind(lines[index]!) === kind);
    blocks.push({
      kind,
      lines: kind === "paragraph" ? [parseInline(group.join("\n"))] : group.map((line) => parseInline(line)),
      ...(kind === "ordered" ? { numbers } : {}),
    });
  }
  return blocks;
}

const inlineText = (nodes: InlineNode[]): string =>
  nodes.map((node) => typeof node === "string" ? node : inlineText(node.children)).join("");

/** 列表摘要用纯文字：去掉可识别的格式标记，未识别的星号等按原样保留。 */
export function plainMessageText(text: string): string {
  return parseMessageText(text)
    .map((block) => block.kind === "code" ? block.code : block.lines.map(inlineText).join("\n"))
    .join("\n");
}
