import { describe, expect, it, vi } from "vitest";
import {
  createAccountSwitchCoordinator,
  LOCK_UNAVAILABLE,
  presenceLockName,
  type SwitchBlockReason,
  type SwitchBus,
  type SwitchLocks,
  type SwitchMessage,
} from "./account-switch";

type Payload = { token: string };

/** 模拟 BroadcastChannel：异步投递给其他实例，不回送发送方。 */
function createHub() {
  const buses = new Set<Set<(message: SwitchMessage<Payload>) => void>>();
  return {
    bus(): SwitchBus<Payload> {
      const handlers = new Set<(message: SwitchMessage<Payload>) => void>();
      buses.add(handlers);
      return {
        post(message) {
          buses.forEach((other) => {
            if (other === handlers) return;
            other.forEach((handler) => queueMicrotask(() => handler(message)));
          });
        },
        subscribe(handler) {
          handlers.add(handler);
          return () => handlers.delete(handler);
        },
      };
    },
  };
}

/** 模拟 Web Locks：同名排他，释放后唤醒排队者。 */
function createLocks(): SwitchLocks {
  const held = new Map<string, number>();
  const waiters = new Map<string, (() => void)[]>();
  const acquire = (name: string) => held.set(name, (held.get(name) ?? 0) + 1);
  const release = (name: string) => {
    held.delete(name);
    waiters.get(name)?.shift()?.();
  };
  const wait = (name: string) =>
    held.has(name)
      ? new Promise<void>((resolve) => waiters.set(name, [...(waiters.get(name) ?? []), resolve]))
      : Promise.resolve();
  return {
    async tryExclusive(name, task) {
      if (held.has(name)) return LOCK_UNAVAILABLE;
      acquire(name);
      try {
        return await task();
      } finally {
        release(name);
      }
    },
    async run(name, task) {
      await wait(name);
      acquire(name);
      try {
        return await task();
      } finally {
        release(name);
      }
    },
    hold(name) {
      acquire(name);
      return () => release(name);
    },
    heldNames: async () => [...held.keys()],
  };
}

interface TabOptions {
  sessionId?: string;
  blockers?: SwitchBlockReason[];
  listen?: boolean;
}

function createWorld() {
  const hub = createHub();
  const locks = createLocks();
  let ids = 0;

  function tab(tabId: string, options: TabOptions = {}) {
    const state = {
      sessionId: options.sessionId ?? "s1",
      blockers: options.blockers ?? [],
      frozen: false,
      committed: [] as Payload[],
      unknown: 0,
    };
    const coordinator = createAccountSwitchCoordinator<Payload>({
      tabId,
      bus: hub.bus(),
      locks,
      getSessionId: () => state.sessionId,
      isSessionCurrent: () => true,
      getBlockers: () => state.blockers,
      freeze: () => {
        state.frozen = true;
      },
      unfreeze: () => {
        state.frozen = false;
      },
      onCommitted: (payload) => state.committed.push(payload),
      onUnknown: () => {
        state.unknown += 1;
      },
      isDefiniteFailure: (error) => error instanceof Error && error.message === "403",
      createId: () => `switch-${++ids}`,
      replyTimeoutMs: 30,
      settleGraceMs: 10,
    });
    if (options.listen !== false) coordinator.start();
    coordinator.updatePresence(state.sessionId);
    return { coordinator, state };
  }

  return { tab, locks, hub };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("account switch coordinator", () => {
  it("switches on the first attempt when only the current tab is present", async () => {
    const initiator = createWorld().tab("a");
    const task = vi.fn().mockResolvedValue({ token: "t2" });

    expect(await initiator.coordinator.initiate(task)).toEqual({
      status: "committed", payload: { token: "t2" },
    });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it("calls the switch task once and commits to every ready tab", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const peer = world.tab("b");
    const task = vi.fn().mockResolvedValue({ token: "t2" });

    const result = await initiator.coordinator.initiate(task);
    await flush();

    expect(result).toEqual({ status: "committed", payload: { token: "t2" } });
    expect(task).toHaveBeenCalledTimes(1);
    expect(peer.state.committed).toEqual([{ token: "t2" }]);
  });

  it("blocks before sending when this tab has unsaved or saving work", async () => {
    const world = createWorld();
    const initiator = world.tab("a", { blockers: ["dirty", "saving"] });
    const task = vi.fn();

    const result = await initiator.coordinator.initiate(task);

    expect(result).toEqual({ status: "blocked", reasons: ["dirty", "saving"], local: true });
    expect(task).not.toHaveBeenCalled();
    expect(initiator.state.frozen).toBe(false);
  });

  it.each(["dirty", "saving"] as const)("blocks when another tab is %s and releases every frozen tab", async (reason) => {
    const world = createWorld();
    const initiator = world.tab("a");
    const ready = world.tab("b");
    world.tab("c", { blockers: [reason] });
    const task = vi.fn();

    const result = await initiator.coordinator.initiate(task);
    await flush();

    expect(result).toEqual({ status: "blocked", reasons: [reason], local: false });
    expect(task).not.toHaveBeenCalled();
    expect(initiator.state.frozen).toBe(false);
    expect(ready.state.frozen).toBe(false);
  });

  it("treats a present tab that never replies as unresponsive", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    world.tab("b", { listen: false });
    const task = vi.fn();

    const result = await initiator.coordinator.initiate(task);

    expect(result).toEqual({ status: "blocked", reasons: ["unresponsive"], local: false });
    expect(task).not.toHaveBeenCalled();
  });

  it("switches on the first attempt if the non-replying old page exits during preparation", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const oldPage = world.tab("old-page", { listen: false });
    const task = vi.fn().mockResolvedValue({ token: "t2" });
    const result = initiator.coordinator.initiate(task);
    await flush();
    oldPage.coordinator.updatePresence(null);

    expect(await result).toEqual({ status: "committed", payload: { token: "t2" } });
    expect(task).toHaveBeenCalledTimes(1);
  });

  it.each(["dirty", "saving", "unresponsive"] as const)("retains a real peer's %s protection when an old page exits", async (reason) => {
    const world = createWorld();
    const initiator = world.tab("a");
    const oldPage = world.tab("old-page", { listen: false });
    world.tab("real-peer", reason === "unresponsive" ? { listen: false } : { blockers: [reason] });
    const task = vi.fn();
    const result = initiator.coordinator.initiate(task);
    await flush();
    oldPage.coordinator.updatePresence(null);

    expect(await result).toEqual({ status: "blocked", reasons: [reason], local: false });
    expect(task).not.toHaveBeenCalled();
    expect(initiator.state.frozen).toBe(false);
  });

  it.each([false, true])("blocks if a replacement page appears without completing preparation (pending=%s)", async (pending) => {
    const world = createWorld();
    const initiator = world.tab("a");
    const oldPage = world.tab("old-page", { listen: false });
    const task = vi.fn();
    const result = initiator.coordinator.initiate(task);
    await flush();
    oldPage.coordinator.updatePresence(null);
    const replacement = world.tab("replacement", { blockers: ["dirty"] });
    if (pending) replacement.coordinator.updatePresence(undefined);

    expect(await result).toEqual({ status: "blocked", reasons: ["unknown"], local: false });
    expect(task).not.toHaveBeenCalled();
  });

  it.each([1, 2])("fails closed and unfreezes tabs if presence query %i fails", async (query) => {
    const world = createWorld();
    const initiator = world.tab("a");
    const peer = world.tab("b");
    const readNames = world.locks.heldNames;
    let calls = 0;
    vi.spyOn(world.locks, "heldNames").mockImplementation(() =>
      ++calls === query ? Promise.reject(new Error("query failed")) : readNames(),
    );
    const task = vi.fn();

    expect(await initiator.coordinator.initiate(task)).toEqual({
      status: "blocked", reasons: ["unknown"], local: false,
    });
    await flush();
    expect(task).not.toHaveBeenCalled();
    expect(initiator.state.frozen).toBe(false);
    expect(peer.state.frozen).toBe(false);
  });

  it("does not retain a pending-page blocker after that page exits", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const oldPage = world.tab("old-page", { listen: false });
    const pending = world.tab("pending-page", { listen: false });
    pending.coordinator.updatePresence(undefined);
    const result = initiator.coordinator.initiate(async () => ({ token: "t2" }));
    await flush();
    oldPage.coordinator.updatePresence(null);
    pending.coordinator.updatePresence(null);

    expect(await result).toEqual({ status: "committed", payload: { token: "t2" } });
  });

  it("treats a tab with an unconfirmed session as unknown", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    world.tab("b").coordinator.updatePresence(undefined);

    const result = await initiator.coordinator.initiate(vi.fn());

    expect(result).toEqual({ status: "blocked", reasons: ["unknown"], local: false });
  });

  it("ignores tabs of other independent sessions", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const other = world.tab("b", { sessionId: "s2", blockers: ["dirty"] });

    const result = await initiator.coordinator.initiate(async () => ({ token: "t2" }));
    await flush();

    expect(result.status).toBe("committed");
    expect(other.state.frozen).toBe(false);
    expect(other.state.committed).toEqual([]);
  });

  it("runs only one switch when the same session initiates concurrently", async () => {
    const world = createWorld();
    const first = world.tab("a");
    const second = world.tab("b");
    const task = vi.fn().mockResolvedValue({ token: "t2" });

    const results = await Promise.all([
      first.coordinator.initiate(task),
      second.coordinator.initiate(task),
      first.coordinator.initiate(task),
    ]);

    expect(task).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      { status: "committed", payload: { token: "t2" } },
      { status: "blocked", reasons: ["busy"], local: false },
      { status: "blocked", reasons: ["busy"], local: true },
    ]);
  });

  it("unfreezes every tab after a definite server rejection", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const peer = world.tab("b");

    const result = await initiator.coordinator.initiate(() => Promise.reject(new Error("403")));
    await flush();

    expect(result.status).toBe("failed");
    expect(initiator.state.frozen).toBe(false);
    expect(peer.state.frozen).toBe(false);
    expect(peer.state.unknown).toBe(0);
  });

  it("sends every tab to re-login when the result is unknown", async () => {
    const world = createWorld();
    const initiator = world.tab("a");
    const peer = world.tab("b");

    const result = await initiator.coordinator.initiate(() => Promise.reject(new Error("timeout")));
    await flush();

    expect(result.status).toBe("unknown");
    expect(initiator.state.frozen).toBe(true);
    expect(peer.state.unknown).toBe(1);
  });

  it("fails closed when the initiator disappears without an outcome", async () => {
    const world = createWorld();
    const peer = world.tab("b");
    const releaseInitiator = world.locks.hold("sunrise-account-switch:s1:initiator");
    const ghost = world.hub.bus();
    ghost.post({ type: "prepare", sessionId: "s1", switchId: "x", from: "ghost" });
    await flush();
    expect(peer.state.frozen).toBe(true);

    releaseInitiator();
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(peer.state.unknown).toBe(1);
  });

  it("names presence locks by session so pending tabs are distinguishable", () => {
    expect(presenceLockName("s1", "a")).toBe("sunrise-account-switch:s1:tab:a");
    expect(presenceLockName(undefined, "a")).toBe("sunrise-account-switch:pending:tab:a");
  });
});
