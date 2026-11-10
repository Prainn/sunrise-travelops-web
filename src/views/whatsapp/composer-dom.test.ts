import { describe, expect, it } from "vitest";
import { composerText } from "./composer-dom";

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
  it("本地表情图像发送Unicode，外部图片和标记不进入正文", () => {
    const emoji = element("IMG");emoji.dataset.emoji="👍";
    expect(composerText(element("DIV",text("Thanks "),emoji,element("IMG")))).toBe("Thanks 👍");
    expect(composerText(element("DIV",text('<img src=x onerror="alert(1)">')))).toBe('<img src=x onerror="alert(1)">');
  });
});
