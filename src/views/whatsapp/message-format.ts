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
const isWord = (char: string) => /[\p{L}\p{N}]/u.test(char);

/** Parse WhatsApp's text markers into a closed set of nodes, never HTML. */
export function parseInline(text: string, used: string[] = []): InlineNode[] {
  const nodes: InlineNode[] = [];
  let plain = "";
  for (let index = 0; index < text.length;) {
    let matched = false;
    for (const { marker, tag } of INLINE_MARKERS) {
      if (used.includes(marker) || !text.startsWith(marker, index)) continue;
      const before = text[index - 1] ?? "";
      if (isWord(before) || (marker.length === 1 && (before === marker || text[index + 1] === marker))) continue;
      const start = index + marker.length;
      const end = text.indexOf(marker, start);
      if (end <= start) continue;
      const content = text.slice(start, end);
      const after = text[end + marker.length] ?? "";
      if (tag !== "code" && (/^\s|\s$/.test(content) || isWord(after) || after === marker)) continue;
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
