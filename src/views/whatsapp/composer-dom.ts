import { isWord, parseInline, type InlineNode } from "./message-format";

const FORMATS = [["bold", "*"], ["italic", "_"], ["strike", "~"], ["code", "`"]] as const;
type Format = typeof FORMATS[number][0];
type Style = Record<Format, boolean>;
interface StyledChar { char: string; style: Style }

function elementStyle(el: HTMLElement, inherited: Style): Style {
  const style = { ...inherited };
  if (["B", "STRONG"].includes(el.tagName)) style.bold = true;
  if (["I", "EM"].includes(el.tagName)) style.italic = true;
  if (["S", "STRIKE", "DEL"].includes(el.tagName)) style.strike = true;
  if (el.tagName === "CODE") style.code = true;
  // 浏览器取消部分格式时可能生成 span 内联样式，按可见效果计算。
  const weight = el.style?.fontWeight;
  if (weight) style.bold = weight === "bold" || weight === "bolder" || Number(weight) >= 600;
  const fontStyle = el.style?.fontStyle;
  if (fontStyle) style.italic = fontStyle === "italic" || fontStyle === "oblique";
  return style;
}

/** WhatsApp 标记不能出现在单词内部：任一字符带格式时整个单词带格式。 */
function snapToWords(chars: StyledChar[]) {
  for (const [format] of FORMATS) {
    for (let start = 0; start < chars.length;) {
      if (!isWord(chars[start]!.char)) { start++; continue; }
      let end = start;
      while (end < chars.length && isWord(chars[end]!.char)) end++;
      if (chars.slice(start, end).some((item) => item.style[format])) {
        for (let index = start; index < end; index++) chars[index]!.style[format] = true;
      }
      start = end;
    }
  }
}

/** 标记也不能紧贴内侧空白：开标记推迟到空白之后，闭标记移到空白之前。 */
function serializeLine(chars: StyledChar[]) {
  snapToWords(chars);
  let text = "";
  const open: (typeof FORMATS[number])[] = [];
  const closeFrom = (depth: number) => {
    if (open.length <= depth) return;
    const space = text.match(/\s*$/)![0];
    text = text.slice(0, text.length - space.length);
    while (open.length > depth) text += open.pop()![1];
    text += space;
  };
  for (const { char, style } of chars) {
    const keep = open.findIndex(([format]) => !style[format]);
    if (keep >= 0) closeFrom(keep);
    if (!/\s/.test(char)) {
      for (const entry of FORMATS) {
        if (style[entry[0]] && !open.includes(entry)) { text += entry[1]; open.push(entry); }
      }
    }
    text += char;
  }
  closeFrom(0);
  return text;
}

/** Serialize only supported text semantics; no HTML travels to the API. */
export function composerText(root: Node): string {
  const chars: StyledChar[] = [];
  const plain: Style = { bold: false, italic: false, strike: false, code: false };
  const endsWithBreak = () => !chars.length || chars.at(-1)!.char === "\n";
  const breakLine = () => chars.push({ char: "\n", style: plain });
  function read(node: Node, style: Style) {
    if (node.nodeType === 3) {
      for (const char of (node.nodeValue ?? "").replace(/\u00a0/g, " ")) chars.push({ char, style: { ...style } });
      return;
    }
    if (node.nodeType !== 1) return;
    const el = node as HTMLElement;
    if (el.tagName === "BR") return breakLine();
    if (el.tagName === "IMG") return;
    const inner = elementStyle(el, style);
    const before = chars.length;
    for (const child of el.childNodes) {
      const block = child.nodeType === 1 && ["DIV", "P"].includes((child as HTMLElement).tagName);
      if (block && chars.length > before && !endsWithBreak()) breakLine();
      read(child, inner);
    }
    if (["DIV", "P"].includes(el.tagName) && el !== root && (chars.length === before || !endsWithBreak())) breakLine();
  }
  read(root, plain);
  const lines: StyledChar[][] = [[]];
  for (const item of chars) {
    if (item.char === "\n") lines.push([]);
    else lines.at(-1)!.push(item);
  }
  return lines.map(serializeLine).join("\n").replace(/\n$/, "");
}

/** Build a closed set of DOM nodes from native WhatsApp text. */
export function composerFragment(text: string): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const append = (parent: Node, nodes: InlineNode[]) => {
    for (const node of nodes) {
      if (typeof node !== "string") {
        const el = document.createElement(node.tag);
        append(el, node.children); parent.appendChild(el); continue;
      }
      parent.appendChild(document.createTextNode(node));
    }
  };
  append(fragment, parseInline(text));
  return fragment;
}
