import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/api/request";
import type { NotificationSetting } from "@/types/notification";

const service = vi.hoisted(() => ({ list: vi.fn(), update: vi.fn() }));
vi.mock("@/services/notification.service", () => ({ notificationService: service }));
vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));

import { useNotificationSettings } from "./useNotificationSettings";

function setting(patch: Partial<NotificationSetting> = {}): NotificationSetting {
  return { type: "whatsapp_message", name: "WhatsApp新消息", enabled: true, version: 1, updatedAt: "2026-11-11T07:00:00.000Z", ...patch };
}

async function loaded() {
  service.list.mockResolvedValueOnce([setting(), setting({ type: "inquiry_follow_up", name: "询盘跟进提醒" })]);
  const state = useNotificationSettings();
  await state.fetchSettings();
  return state;
}

describe("useNotificationSettings", () => {
  beforeEach(() => vi.resetAllMocks());

  it("submits only enabled and version and adopts the returned version", async () => {
    const state = await loaded();
    service.update.mockResolvedValueOnce(setting({ enabled: false, version: 2 }));
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toMatchObject({ kind: "saved" });
    expect(service.update).toHaveBeenCalledWith("whatsapp_message", { enabled: false, version: 1 });
    expect(state.settings.value[0]).toMatchObject({ enabled: false, version: 2 });
    expect(state.isSaving("whatsapp_message")).toBe(false);
  });

  it("prevents duplicate submits for the same row while saving", async () => {
    const state = await loaded();
    let resolve!: (value: NotificationSetting) => void;
    service.update.mockReturnValueOnce(new Promise((done) => (resolve = done)));
    const first = state.saveEnabled("whatsapp_message", false);
    expect(state.isSaving("whatsapp_message")).toBe(true);
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toEqual({ kind: "skipped" });
    resolve(setting({ enabled: false, version: 2 }));
    await first;
    expect(service.update).toHaveBeenCalledTimes(1);
  });

  it("keeps the original state on 409 and other failures without retrying", async () => {
    const state = await loaded();
    service.update.mockRejectedValueOnce(new ApiError("conflict", { code: "CONFLICT", status: 409 }));
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toMatchObject({ kind: "conflict" });
    service.update.mockRejectedValueOnce(new ApiError("forbidden", { code: "AUTH_FORBIDDEN", status: 403 }));
    await expect(state.saveEnabled("whatsapp_message", false)).resolves.toMatchObject({ kind: "failed" });
    expect(service.update).toHaveBeenCalledTimes(2);
    expect(state.settings.value[0]).toMatchObject({ enabled: true, version: 1 });
  });

  it("reports load failure instead of an empty success list", async () => {
    service.list.mockRejectedValueOnce(new Error("network"));
    const state = useNotificationSettings();
    await state.fetchSettings();
    expect(state.loadError.value).toBe("network");
    expect(state.settings.value).toEqual([]);
  });
});
