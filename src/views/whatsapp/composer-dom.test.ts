import { describe, expect, it } from "vitest";
import { composerContent, composerText } from "./composer-dom";
import { CJK_MARKER_BOUNDARY } from "./message-format";

const text = (value: string) => ({nodeType:3,nodeValue:value}) as Node;
const element = (tagName: string, ...children: Node[]) => ({nodeType:1,tagName,childNodes:children,dataset:{}}) as unknown as HTMLElement;

describe("WhatsApp编辑器发送正文", () => {
  it("将可见粗体斜体转为原生标记，保留正常文字和空格", () => {
    expect(composerText(element("DIV",element("B",text("Hello ")),text("there "),element("I",text("friend")))))
      .toBe("*Hello* there _friend_");
    expect(composerText(element("DIV",element("B",text("Hello "),element("I",text("friend"))))))
      .toBe("*Hello _friend_*");
  });
  it("空格式不会发送占位星号，Enter和空行保留", () => {
    expect(composerText(element("DIV",element("B",element("BR"))))).toBe("");
    expect(composerText(element("DIV",element("DIV",text("one")),element("DIV",element("BR")),element("DIV",text("two")))))
      .toBe("one\n\ntwo");
  });
  it("表情按Unicode文字发送，图片和HTML标记不进入正文", () => {
    expect(composerText(element("DIV",text("Thanks 👍"),element("IMG")))).toBe("Thanks 👍");
    expect(composerText(element("DIV",text('<img src=x onerror="alert(1)">')))).toBe('<img src=x onerror="alert(1)">');
  });
  it("连续中文局部加粗或斜体只标记选中的字，不扩大到整串", () => {
    const bold = composerContent(element("DIV",text("哈哈"),element("B",text("哈哈"))));
    expect(bold.text).toBe("哈哈*哈哈*");
    expect(bold.unseparated).toBe(!CJK_MARKER_BOUNDARY);
    const italic = composerContent(element("DIV",text("哈哈"),element("I",text("哈哈")),text("哈")));
    expect(italic.text).toBe("哈哈_哈哈_哈");
    expect(italic.unseparated).toBe(!CJK_MARKER_BOUNDARY);
  });
  it("有空格时普通体、粗体、斜体分别发送且不提示分隔", () => {
    const mixed = composerContent(element("DIV",text("哈哈 "),element("B",text("哈哈 ")),element("I",text("哈哈")),text("，好")));
    expect(mixed.text).toBe("哈哈 *哈哈* _哈哈_，好");
    expect(mixed.unseparated).toBe(false);
  });
  it("拉丁单词中部分加格式时保留范围并提示分隔", () => {
    const partial = composerContent(element("DIV",text("He"),element("B",text("llo")),text(" world")));
    expect(partial.text).toBe("He*llo* world");
    expect(partial.unseparated).toBe(true);
    expect(composerText(element("DIV",element("B",text("Hello")),element("B",text(" there")))))
      .toBe("*Hello there*");
  });
  it("跨行粗体分别闭合标记，保留两行正文", () => {
    expect(composerText(element("DIV",element("B",text("Hello"),element("BR"),text("there")))))
      .toBe("*Hello*\n*there*");
  });
});
