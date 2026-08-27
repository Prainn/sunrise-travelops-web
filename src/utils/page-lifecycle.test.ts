import { describe, expect, it } from "vitest";
import { shouldConfirmPageUnload } from "./page-lifecycle";

describe("page unload confirmation", () => {
  it("does not confirm when leaving the login page", () => {
    expect(shouldConfirmPageUnload("#/login")).toBe(false);
    expect(shouldConfirmPageUnload("#/login?redirect=/dashboard")).toBe(false);
  });

  it("confirms when leaving business pages", () => {
    expect(shouldConfirmPageUnload("#/dashboard")).toBe(true);
    expect(shouldConfirmPageUnload("#/inquiries/list")).toBe(true);
  });
});
