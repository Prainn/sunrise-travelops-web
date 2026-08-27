import { describe, expect, it, vi } from "vitest";
import { setupPageUnloadConfirmation, shouldConfirmPageUnload } from "./page-lifecycle";

describe("page unload confirmation", () => {
  it("does not confirm when leaving the login page", () => {
    expect(shouldConfirmPageUnload("/login")).toBe(false);
    expect(shouldConfirmPageUnload("/login/")).toBe(false);
  });

  it("confirms when leaving business pages", () => {
    expect(shouldConfirmPageUnload("/dashboard")).toBe(true);
    expect(shouldConfirmPageUnload("/inquiries/list")).toBe(true);
  });

  it("only registers beforeunload confirmation in production", () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener });

    setupPageUnloadConfirmation(false);
    expect(addEventListener).not.toHaveBeenCalled();

    setupPageUnloadConfirmation(true);
    expect(addEventListener).toHaveBeenCalledOnce();
    expect(addEventListener).toHaveBeenCalledWith("beforeunload", expect.any(Function));

    vi.unstubAllGlobals();
  });

  it("uses the history pathname when deciding whether to confirm", () => {
    const preventDefault = vi.fn();
    const addEventListener = vi.fn();
    const location = { pathname: "/login" };
    vi.stubGlobal("window", { addEventListener, location });

    setupPageUnloadConfirmation(true);
    const listener = addEventListener.mock.calls[0][1] as (event: Pick<BeforeUnloadEvent, "preventDefault">) => void;

    listener({ preventDefault });
    expect(preventDefault).not.toHaveBeenCalled();

    location.pathname = "/dashboard";
    listener({ preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
