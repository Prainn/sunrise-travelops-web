import { describe, expect, it } from "vitest";
import zhCn from "@/lang/package/zh-cn.json";
import {
  formatBeijingTime,
  formatOperationActor,
  formatOperationDetail,
  formatOperationScope,
  operationResultLabelKey,
  operationResultTagType,
  resolveOperationResult,
} from "./operation-log-format";

function t(key: string): string {
  const parts = key.split(".");
  let current: unknown = zhCn;
  for (const part of parts) {
    if (typeof current === "object" && current !== null && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof current === "string" ? current : key;
}

describe("operation-log-format", () => {
  it("resolves all six result states and falls back to legacy boolean success", () => {
    expect(resolveOperationResult({ result: "success", success: false })).toBe("success");
    expect(resolveOperationResult({ result: "failure", success: true })).toBe("failure");
    expect(resolveOperationResult({ result: "denied", success: false })).toBe("denied");
    expect(resolveOperationResult({ result: "cancelled", success: false })).toBe("cancelled");
    expect(resolveOperationResult({ result: "unknown", success: false })).toBe("unknown");
    expect(resolveOperationResult({ result: "pending", success: false })).toBe("pending");

    expect(resolveOperationResult({ result: null, success: true })).toBe("success");
    expect(resolveOperationResult({ result: undefined, success: false })).toBe("failure");

    expect(t(operationResultLabelKey("denied"))).toBe("拒绝");
    expect(t(operationResultLabelKey("cancelled"))).toBe("已取消");
    expect(t(operationResultLabelKey("unknown"))).toBe("结果未知");
    expect(t(operationResultLabelKey("pending"))).toBe("待完成");
    expect(operationResultTagType("unknown")).toBe("warning");
    expect(operationResultTagType("cancelled")).toBe("info");
  });

  it("formats scopes, actors, and historical empty values as 历史未记录", () => {
    expect(formatOperationScope("headquarters", t)).toBe("总部");
    expect(formatOperationScope("shengxu", t)).toBe("盛旭");
    expect(formatOperationScope("linxi", t)).toBe("霖熹");
    expect(formatOperationScope("website", t)).toBe("独立站");
    expect(formatOperationScope("unknown", t)).toBe("未知");
    expect(formatOperationScope(null, t)).toBe("历史未记录");
    expect(formatOperationScope("   ", t)).toBe("历史未记录");

    expect(formatOperationActor("alice", t)).toBe("alice");
    expect(formatOperationActor("", t)).toBe("历史未记录");
    expect(formatOperationActor(null, t)).toBe("历史未记录");
  });

  it("formats structured JSON detail including stage, status, errorCode, and client occurredAt", () => {
    const detail = JSON.stringify({
      source: "client",
      page: "InquiryItineraries",
      action: "print",
      recordId: "11111111-1111-4111-8111-111111111111",
      stage: "download_requested",
      errorCode: "CONFLICT",
      occurredAt: "2026-11-25T02:30:00.000Z",
    });

    const formatted = formatOperationDetail(detail, t);
    expect(formatted).toContain("页面: InquiryItineraries");
    expect(formatted).toContain("客户端动作: print");
    expect(formatted).toContain("记录标识: 11111111-1111-4111-8111-111111111111");
    expect(formatted).toContain("阶段: 已发起下载请求");
    expect(formatted).toContain("错误码: CONFLICT");
    expect(formatted).toContain(`客户端时间: ${formatBeijingTime("2026-11-25T02:30:00.000Z")}`);
  });

  it("formats notification, menu permission, and parentId details including stringified enabled flags", () => {
    const detail = JSON.stringify({
      parentId: "dict-1",
      notificationType: "whatsapp_inbound",
      enabled: "false",
      version: 3,
      sendWindow: "09:00–18:00",
      beforeMenuKeys: ["dashboard"],
      afterMenuKeys: ["dashboard", "mail"],
    });

    const formatted = formatOperationDetail(detail, t);
    expect(formatted).toContain("所属记录标识: dict-1");
    expect(formatted).toContain("通知类型: whatsapp_inbound");
    expect(formatted).toContain("启用状态: 否");
    expect(formatted).toContain("版本号: 3");
    expect(formatted).toContain("发送时段: 09:00–18:00");
    expect(formatted).toContain("修改前菜单权限: dashboard");
    expect(formatted).toContain("修改后菜单权限: dashboard, mail");
  });

  it("handles legacy plain-text detail, empty detail, and renders raw text safely", () => {
    expect(formatOperationDetail(null, t)).toBe("历史未记录");
    expect(formatOperationDetail("{}", t)).toBe("历史未记录");
    expect(formatOperationDetail("legacy plain text <script>alert(1)</script>", t)).toBe(
      "legacy plain text <script>alert(1)</script>",
    );
  });
});
