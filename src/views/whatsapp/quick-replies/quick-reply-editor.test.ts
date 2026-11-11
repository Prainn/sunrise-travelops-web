import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { ApiError } from "@/api/request";
import type { WhatsappQuickReply } from "@/types/whatsapp";

const service = vi.hoisted(() => ({ quickReply: vi.fn(), saveQuickReply: vi.fn() }));
vi.mock("@/services/whatsapp.service", () => ({ whatsappService: service }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));
import { useQuickReplyEditor } from "./useQuickReplyEditor";
const row: WhatsappQuickReply = { id: "reply-1", stage: "stage", scenario: "scene", content: "old", enabled: true, sortOrder: 0, version: 1, createdAt: "", updatedAt: "" };
const latest = { ...row, content: "other user's edit", version: 2 };
const conflict = () => new ApiError("conflict", { status: 409, code: "CONFLICT" });
let scope: ReturnType<typeof effectScope>;
let editor: ReturnType<typeof useQuickReplyEditor>;
beforeEach(() => {
  service.quickReply.mockReset().mockResolvedValue(latest);
  service.saveQuickReply.mockReset().mockRejectedValueOnce(conflict()).mockResolvedValue(latest);
  scope = effectScope();
  editor = scope.run(() => useQuickReplyEditor())!;
  editor.open(row);
  editor.form.value.content = "my draft";
});
afterEach(() => scope.stop());

describe("快捷回复冲突恢复", () => {
  it("冲突后保留输入，展示最新值，选择前禁止再次保存", async () => {
    expect(await editor.save()).toBe("conflict");
    expect(editor.form.value).toMatchObject({ content: "my draft", version: 1 });
    expect(editor.latest.value).toEqual(latest);
    await editor.save();
    expect(service.saveQuickReply).toHaveBeenCalledTimes(1);
    editor.resolveConflict(false);
    expect(editor.form.value).toMatchObject({ content: "my draft", version: 2 });
    expect(await editor.save()).toBe("saved");
    expect(service.saveQuickReply).toHaveBeenLastCalledWith(expect.objectContaining({ content: "my draft", version: 2 }), row.id);
  });
  it("采用最新仅更新表单，不自动提交", async () => {
    await editor.save();
    editor.resolveConflict(true);
    expect(editor.form.value).toMatchObject({ content: latest.content, version: 2 });
    expect(service.saveQuickReply).toHaveBeenCalledTimes(1);
  });
  it("最新读取失败仍保留草稿并阻止保存，可重试读取", async () => {
    service.quickReply.mockRejectedValueOnce(new Error("network"));
    await editor.save();
    expect(editor.latest.value).toBeNull();
    expect(editor.latestError.value).not.toBe("");
    editor.resolveConflict(false);
    await editor.save();
    expect(service.saveQuickReply).toHaveBeenCalledTimes(1);
    await editor.loadLatest();
    expect(editor.latest.value).toEqual(latest);
    expect(editor.form.value.content).toBe("my draft");
  });
  it("选择后若服务端再变化，继续按版本冲突处理", async () => {
    await editor.save();
    editor.resolveConflict(false);
    service.saveQuickReply.mockRejectedValueOnce(conflict());
    service.quickReply.mockResolvedValueOnce({ ...latest, version: 3 });
    await editor.save();
    expect(editor.hasConflict.value).toBe(true);
    expect(editor.latest.value?.version).toBe(3);
    expect(editor.form.value.version).toBe(2);
  });
  it("关闭并打开另一项后，旧读取不能覆盖新编辑器", async () => {
    let resolve!: (value: WhatsappQuickReply) => void;
    service.quickReply.mockImplementationOnce(() => new Promise((done) => { resolve = done; }));
    const saving = editor.save();
    await Promise.resolve();
    editor.editing.value = false;
    editor.open({ ...row, id: "reply-2" });
    resolve(latest);
    await saving;
    expect(editor.editingId.value).toBe("reply-2");
    expect(editor.latest.value).toBeNull();
    expect(editor.hasConflict.value).toBe(false);
  });
});
