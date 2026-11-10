import { parseInline, type InlineNode } from "./message-format";
import { COMMON_EMOJIS, emojiUrl } from "./emoji";

function marked(text: string, marker: string) {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  return match[2] ? `${match[1]}${marker}${match[2]}${marker}${match[3]}` : text;
}
/** Serialize only supported text semantics; no HTML travels to the API. */
export function composerText(root: Node): string {
  function read(node: Node): string {
    if (node.nodeType === 3) return (node.nodeValue ?? "").replace(/\u00a0/g, " ");
    if (node.nodeType !== 1) return "";
    const el = node as HTMLElement;
    if (el.tagName === "BR") return "\n";
    if (el.tagName === "IMG") return COMMON_EMOJIS.some(([emoji]) => emoji === el.dataset.emoji) ? el.dataset.emoji! : "";
    let text = "";
    for (const child of el.childNodes) {
      const block = child.nodeType === 1 && ["DIV", "P"].includes((child as HTMLElement).tagName);
      if (block && text && !text.endsWith("\n")) text += "\n";
      text += read(child);
    }
    if (["B", "STRONG"].includes(el.tagName)) return marked(text, "*");
    if (["I", "EM"].includes(el.tagName)) return marked(text, "_");
    if (["S", "STRIKE"].includes(el.tagName)) return marked(text, "~");
    if (el.tagName === "CODE") return marked(text, "`");
    if (["DIV", "P"].includes(el.tagName) && el !== root && !text.endsWith("\n")) return text + "\n";
    return text;
  }
  return read(root).replace(/\n$/, "");
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
      const pattern = new RegExp(`(${COMMON_EMOJIS.map(([emoji]) => emoji).join("|")})`, "gu");
      for (const part of node.split(pattern)) {
        const src = emojiUrl(part);
        if (!src) parent.appendChild(document.createTextNode(part));
        else {
          const img = document.createElement("img");
          img.src = src; img.alt = part; img.dataset.emoji = part; img.className = "whatsapp-composer__emoji";
          parent.appendChild(img);
        }
      }
    }
  };
  append(fragment, parseInline(text));
  return fragment;
}
