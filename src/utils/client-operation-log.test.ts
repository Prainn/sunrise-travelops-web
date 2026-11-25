import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ClientOperationEvent } from "@/types/operation-log";
import {
  createClientOperationLogger,
  resolveClientPage,
  type ClientEventSendResult,
} from "./client-operation-log";

const RECORD_UUID = "11111111-1111-4111-8111-111111111111";

function createHarness() {
  let token = "token-user-a";
  let refreshToken = "refresh-user-a";
  let epoch = 1;
  let frozen = false;
  let retired = false;
  let stale = false;
  let sessionState: { sessionId: string; version: number } | null = {
    sessionId: "sess-a",
    version: 1,
  };
  let actorId: string | undefined = "actor-a";
  let uuidSeq = 1;

  const send = vi.fn<
    (event: ClientOperationEvent, options: { accessToken?: string }) => Promise<ClientEventSendResult>
  >().mockResolvedValue({ ok: true, status: 204, retryable: false });

  const refreshTokenFn = vi.fn<(staleToken: string) => Promise<void>>().mockImplementation(async () => {
    token = "token-user-a-refreshed";
  });

  const logger = createClientOperationLogger({
    send,
    getAccessToken: () => token,
    getRefreshToken: () => refreshToken,
    refreshToken: refreshTokenFn,
    getEpoch: () => epoch,
    isSessionFrozen: () => frozen,
    isSessionRetired: () => retired,
    isSessionStale: () => stale,
    getSessionState: () => sessionState,
    getActorId: () => actorId,
    getCurrentPage: () => "InquiryItineraries",
    createUuid: () => `00000000-0000-4000-8000-${String(uuidSeq++).padStart(12, "0")}`,
    now: () => "2026-11-25T03:00:00.000Z",
    retryDelaysMs: [100, 300],
  });

  return {
    logger,
    send,
    refreshTokenFn,
    setToken: (value: string) => { token = value; },
    setRefreshToken: (value: string) => { refreshToken = value; },
    setEpoch: (value: number) => { epoch = value; },
    setFrozen: (value: boolean) => { frozen = value; },
    setRetired: (value: boolean) => { retired = value; },
    setStale: (value: boolean) => { stale = value; },
    setSessionState: (value: { sessionId: string; version: number } | null) => { sessionState = value; },
    setActorId: (value: string | undefined) => { actorId = value; },
  };
}

describe("client-operation-log", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reuses the exact eventId, payload, and occurredAt across retries and deduplicates same-action retry", async () => {
    const h = createHarness();
    h.send
      .mockResolvedValueOnce({ ok: false, retryable: true })
      .mockResolvedValueOnce({ ok: true, status: 204, retryable: false });

    const first = h.logger.record({
      page: "InquiryItineraries",
      action: "print",
      result: "unknown",
      recordId: RECORD_UUID,
      value: "pdf",
    });

    await Promise.resolve();
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.logger.pendingCount()).toBe(1);

    // Explicit same-action retry with the same eventId flushes immediately without creating a new eventId.
    const retried = h.logger.record({
      page: "InquiryItineraries",
      action: "print",
      result: "unknown",
      recordId: RECORD_UUID,
      value: "pdf",
      eventId: first!.eventId,
      occurredAt: first!.occurredAt,
    });

    await Promise.resolve();
    expect(retried).toEqual(first);
    expect(h.send).toHaveBeenCalledTimes(2);
    expect(h.send.mock.calls[0]![0]).toEqual(h.send.mock.calls[1]![0]);
    expect(h.send.mock.calls[0]![0]).toEqual({
      eventId: "00000000-0000-4000-8000-000000000001",
      page: "InquiryItineraries",
      action: "print",
      result: "unknown",
      occurredAt: "2026-11-25T03:00:00.000Z",
      recordId: RECORD_UUID,
      value: "pdf",
    });
    expect(h.logger.pendingCount()).toBe(0);
  });

  it("drops queued retries on account switch or logout so old events are never attributed to a new identity", async () => {
    const h = createHarness();
    h.send.mockResolvedValue({ ok: false, retryable: true });

    h.logger.record({
      page: "WhatsappInbox",
      action: "cancel",
      result: "cancelled",
      recordId: RECORD_UUID,
    });
    await Promise.resolve();
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.send.mock.calls[0]![1]).toEqual({ accessToken: "token-user-a" });

    // Switch identity to User B
    h.setToken("token-user-b");
    h.setActorId("actor-b");
    h.setSessionState({ sessionId: "sess-a", version: 2 });
    h.setEpoch(2);
    h.logger.resetIdentity();

    await vi.advanceTimersByTimeAsync(1000);
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.logger.pendingCount()).toBe(0);
  });

  it("drops queued retry if session changes even without explicit resetIdentity call", async () => {
    const h = createHarness();
    h.send.mockResolvedValue({ ok: false, retryable: true });

    h.logger.record({
      page: "WebsiteVisits",
      action: "download",
      result: "unknown",
      value: "csv",
    });
    await Promise.resolve();
    expect(h.send).toHaveBeenCalledTimes(1);

    // Identity changes in storage/gate before timer fires
    h.setToken("token-user-b");
    h.setSessionState({ sessionId: "sess-a", version: 2 });

    await vi.advanceTimersByTimeAsync(200);
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.logger.pendingCount()).toBe(0);
  });

  it("enforces anonymous public-page and nine-action constraints and strips recordId", async () => {
    const h = createHarness();
    h.setToken("");
    h.setSessionState(null);
    h.setActorId(undefined);

    // Disallowed page when anonymous
    expect(
      h.logger.record({ page: "Dashboard", action: "navigate", result: "success" }),
    ).toBeNull();

    // Disallowed action on public page when anonymous
    expect(
      h.logger.record({ page: "Login", action: "download", result: "unknown" }),
    ).toBeNull();

    // Allowed action on public page strips recordId and sends without Authorization
    const event = h.logger.record({
      page: "Login",
      action: "select",
      result: "success",
      value: "shengxu",
      recordId: RECORD_UUID,
    });
    await Promise.resolve();

    expect(event).not.toBeNull();
    expect(event?.recordId).toBeUndefined();
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.send).toHaveBeenCalledWith(
      expect.objectContaining({
        page: "Login",
        action: "select",
        result: "success",
        value: "shengxu",
      }),
      { accessToken: undefined },
    );
  });

  it("drops queued anonymous retry if the user logs in before retry fires", async () => {
    const h = createHarness();
    h.setToken("");
    h.setSessionState(null);
    h.setActorId(undefined);
    h.send.mockResolvedValue({ ok: false, retryable: true });

    h.logger.record({ page: "Login", action: "validate", result: "failure" });
    await Promise.resolve();
    expect(h.send).toHaveBeenCalledTimes(1);

    // User logs in before retry timer fires
    h.setToken("token-new-user");
    await vi.advanceTimersByTimeAsync(500);
    expect(h.send).toHaveBeenCalledTimes(1);
    expect(h.logger.pendingCount()).toBe(0);
  });

  it("resolves unnamed public routes and named routes to whitelisted client pages", () => {
    expect(resolveClientPage({ name: undefined, path: "/login" })).toBe("Login");
    expect(resolveClientPage({ name: undefined, path: "/unavailable" })).toBe("Unavailable");
    expect(resolveClientPage({ name: undefined, path: "/401" })).toBe("Forbidden");
    expect(resolveClientPage({ name: undefined, path: "/404" })).toBe("NotFound");
    expect(resolveClientPage({ name: undefined, path: "/redirect/dashboard" })).toBe("Redirect");
    expect(resolveClientPage({ name: "OperationLogs", path: "/system/operation-logs" })).toBe("OperationLogs");
    expect(resolveClientPage({ name: "UnknownRoute", path: "/other" })).toBe("App");
  });
});
