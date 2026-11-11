import { describe, expect, it, vi } from "vitest";
import type { RouteRecordRaw } from "vue-router";
import type { MenuGroup, MenuItem } from "@/types/menu-permissions";
import { mapNavigation } from "./navigation";

vi.mock("@/lang", () => ({ default: { global: { t: () => "Invalid navigation" } } }));
const local: RouteRecordRaw[] = [{ path: "/resources", name: "Resources", children: [
  { path: "cities", name: "Cities", component: {}, meta: { menuKey: "city" } },
  { path: "edit", name: "EditCity", component: {}, meta: { hidden: true, menuKey: "city" } },
] }];
const item = (routeName: string, menuKey = "city"): MenuItem => ({ key: routeName, routeName, menuKey, title: routeName, scopes: [], permissions: [] });
const group = (routeName: string, children: MenuItem[]): MenuGroup => ({ key: routeName, routeName, title: routeName, children });

describe("mixed-version navigation", () => {
  it("keeps known menus when a newer backend adds a group and a child", () => {
    const mapped = mapNavigation([group("Resources", [item("Cities"), item("NewResource")]), group("WhatsappWorkbench", [item("Inbox")])], local);
    expect(mapped.hasUnknownRoutes).toBe(true);
    expect(mapped.routes.map((route) => route.name)).toEqual(["Resources"]);
    expect(mapped.routes[0]?.children?.map((route) => route.name)).toEqual(["Cities", "EditCity"]);
  });
  it("does not expose hidden routes when no visible child is known", () => {
    expect(mapNavigation([group("Resources", [item("NewResource")])], local).routes).toEqual([]);
  });
  it("rejects altered bindings and exposed hidden pages", () => {
    expect(() => mapNavigation([group("Resources", [item("Cities", "users")])], local)).toThrow();
    expect(() => mapNavigation([group("Resources", [item("EditCity")])], local)).toThrow();
  });
  it("rejects a known page in the wrong group", () => {
    const routes: RouteRecordRaw[] = [...local, { path: "/system", name: "System", children: [] }];
    expect(() => mapNavigation([group("System", [item("Cities")])], routes)).toThrow();
  });
});
