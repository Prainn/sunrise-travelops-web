import { describe, expect, it, vi } from "vitest";
import { usePendingActions } from "./usePendingActions";

describe("pending row actions", () => {
  it("blocks duplicate confirmation through refresh while allowing another row", async () => {
    const pending = usePendingActions();
    const confirmation = Promise.withResolvers<boolean>();
    const refresh = Promise.withResolvers<void>();
    const write = vi.fn();
    const action = pending.run("a", async () => {
      if (!await confirmation.promise) return;
      write();
      await refresh.promise;
    });
    const duplicate = vi.fn();
    await pending.run("a", duplicate);
    expect(duplicate).not.toHaveBeenCalled();
    expect(pending.isPending("a")).toBe(true);
    expect(await pending.run("b", async () => "done")).toBe("done");
    confirmation.resolve(true);
    await Promise.resolve();
    expect(write).toHaveBeenCalledOnce();
    expect(pending.isPending("a")).toBe(true);
    refresh.resolve();
    await action;
    expect(pending.hasPending()).toBe(false);
  });

  it("releases the row after cancellation or request failure", async () => {
    const pending = usePendingActions();
    await pending.run("a", async () => false);
    await expect(pending.run("a", async () => { throw new Error("failed"); })).rejects.toThrow("failed");
    expect(pending.isPending("a")).toBe(false);
    expect(await pending.run("a", async () => "retry")).toBe("retry");
  });
});
