import { afterEach, expect, it, vi } from "vitest";
import type { Router } from "vue-router";
import { isUserInput, openUserPage, setupOperationNavigation } from "./user-interaction";
import { recordClientOperation } from "./client-operation-log";

vi.mock("./client-operation-log", () => ({
  recordClientOperation: vi.fn(),
  resolveClientPage: () => "InquiryList",
}));

afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("records an explicit navigation to the inquiry list and ignores polling, redirects and synthetic input", async () => {
  const listeners = new Map<string, (event: unknown) => void>();
  class Link { href = "https://test.local/inquiries/list"; }
  vi.stubGlobal("HTMLAnchorElement", Link);
  vi.stubGlobal("window", { location: { href: "https://test.local/" }, addEventListener: (name: string, fn: (event: unknown) => void) => listeners.set(name, fn) });
  const currentRoute = { value: { fullPath: "/inquiries/list" } };
  const router = {
    push: vi.fn().mockResolvedValue(undefined),
    resolve: (path: string) => ({ fullPath: path, href: path }),
    currentRoute, afterEach: vi.fn(),
  } as unknown as Router;
  setupOperationNavigation(router);
  await router.push("/inquiries/list");
  const table = {} as Element;
  const event = { isTrusted: false, eventPhase: 2, composedPath: () => [table, new Link()] };
  listeners.get("click")!(event);
  await router.push("/inquiries/list");
  expect(recordClientOperation).not.toHaveBeenCalled();
  event.isTrusted = true;
  expect(isUserInput(table)).toBe(true);
  expect(isUserInput({} as Element)).toBe(false);
  await router.push("/inquiries/list");
  expect(recordClientOperation).toHaveBeenCalledExactlyOnceWith({ page: "InquiryList", action: "navigate", result: "success" });
  await openUserPage(router, "/private");
  event.eventPhase = 0;
  expect(isUserInput(table)).toBe(false);
  await router.push("/inquiries/list");
  expect(recordClientOperation).toHaveBeenCalledTimes(1);
});

it("records legitimate group and home redirects while ignoring guard fallbacks", async () => {
  const currentRoute = { value: { path: "/dashboard", fullPath: "/dashboard" } };
  const router = {
    push: vi.fn().mockResolvedValue(undefined),
    resolve: (path: string) => ({ fullPath: path, href: path }),
    currentRoute,
  } as unknown as Router;

  await openUserPage(router, "/");
  expect(recordClientOperation).toHaveBeenCalledTimes(1);

  currentRoute.value = { path: "/system/user", fullPath: "/system/user" };
  await openUserPage(router, "/system");
  expect(recordClientOperation).toHaveBeenCalledTimes(2);

  currentRoute.value = { path: "/401", fullPath: "/401" };
  await openUserPage(router, "/system");
  expect(recordClientOperation).toHaveBeenCalledTimes(2);
});
