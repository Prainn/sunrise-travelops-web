import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { applyMessageFormat, parseInline, parseMessageText } from "./message-format";
import MessageText from "./components/MessageText.vue";

describe("WhatsApp文字显示", () => {
  it("支持原生嵌套格式，代码内容保持原样", () => {
    expect(parseInline("*加粗 _斜体_* ~删除~ `*原样*` ```_原样_```")) .toEqual([
      { tag: "strong", children: ["加粗 ", { tag: "em", children: ["斜体"] }] },
      " ", { tag: "s", children: ["删除"] },
      " ", { tag: "code", children: ["*原样*"] },
      " ", { tag: "code", children: ["_原样_"] },
    ]);
  });

  it("保留未闭合标记、单词内下划线及非原生双星号", () => {
    const text = "hello_world_test *unclosed **CommonMark** _ spaced _";
    expect(parseInline(text)).toEqual([text]);
  });

  it("解析历史消息中的星号列表，并保留编号和引用", () => {
    const blocks = parseMessageText("Altitude:\n\n* Lijiang: 2,400 metres\n* Shangri-La: 3,200 metres\n\n7. First\n9. Second\n> *Quoted*\n> Next");
    expect(blocks.find((block) => block.kind === "unordered")?.lines).toEqual([
      ["Lijiang: 2,400 metres"], ["Shangri-La: 3,200 metres"],
    ]);
    expect(blocks.find((block) => block.kind === "ordered")?.numbers).toEqual([7, 9]);
    expect(blocks.at(-1)).toEqual({ kind: "quote", lines: [[{ tag: "strong", children: ["Quoted"] }], ["Next"]] });
  });

  it("多行代码不解析内部格式，保留换行", () => {
    expect(parseMessageText("```\n*plain*\n> text\n```")) .toEqual([
      { kind: "code", code: "*plain*\n> text", lines: [] },
    ]);
  });

  it("渲染真实语义标签且将消息中的HTML作为文字转义", async () => {
    const html = await renderToString(createSSRApp({ render: () => h(MessageText, {
      text: '*bold* _italic_ ~strike~ `code`\n<img src=x onerror="alert(1)">\n* list',
    }) }));
    expect(html).toContain("<strong>bold</strong>");
    expect(html).toContain("<em>italic</em>");
    expect(html).toContain("<s>strike</s>");
    expect(html).toContain("&lt;img");
    expect(html).not.toContain("<img");
    expect(html).toContain("<ul");
    expect(html.replace(/<!--.*?-->/gs, "")).toContain("<li>list</li>");
  });
});

describe("输入工具栏", () => {
  it("使用textarea UTF-16偏移保留表情和选区，重复点击取消格式", () => {
    const result = applyMessageFormat("👍 hello", 3, 8, "bold");
    expect(result).toEqual({ text: "👍 *hello*", start: 4, end: 9 });
    expect(applyMessageFormat(result.text, result.start, result.end, "bold"))
      .toEqual({ text: "👍 hello", start: 3, end: 8 });
    expect(applyMessageFormat("*hello*", 0, 7, "bold").text).toBe("hello");
  });

  it("无选区时将光标放在标记内部", () => {
    expect(applyMessageFormat("Hi ", 3, 3, "italic"))
      .toEqual({ text: "Hi __", start: 4, end: 4 });
  });
});
