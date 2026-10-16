import { describe, expect, it, vi } from "vitest";
import type { RouteMeta, RouteRecordRaw } from "vue-router";
import { filterRoutesByAccess, hasRouteAccess, hasRouteChainAccess, hasWorkspaceAccess } from "./access";
import { constantRoutes } from "./index";

vi.mock("vue-router", () => ({
  createRouter: vi.fn(() => ({})),
  createWebHistory: vi.fn(),
}));

describe("实际询盘菜单的读取权限", () => {
  it.each(["EXECUTIVE", "ADMIN", "COORDINATOR"])(
    "%s 无归档权限时仍可进入询盘汇总",
    (role) => {
      const context = { scope: role === "COORDINATOR" ? "shengxu" as const : "headquarters" as const, roles: [role], perms: ["inquiry:list"], menuKeys: ["inquiry-summary"] };
      const inquiry = filterRoutesByAccess(constantRoutes, context).find(
        (route) => route.name === "Inquiries",
      );
      const summary = inquiry?.children?.find((route) => route.name === "InquiryLogReport");
      expect(summary).toBeDefined();
      expect(hasRouteChainAccess([inquiry!.meta!, summary!.meta!], context)).toBe(true);
    },
  );

  it("资源管理员没有询盘读取权限时不能看到询盘汇总", () => {
    const context = { roles: ["RESOURCE_MANAGER"], perms: ["resource:guide:list"] };
    expect(
      filterRoutesByAccess(constantRoutes, context).some((route) => route.name === "Inquiries"),
    ).toBe(false);
  });
});

const websiteMeta: RouteMeta = {
  scopes: ["linxi", "website", "headquarters"],
  perms: ["website:inquiry:list"],
};

describe("独立站路由范围", () => {
  it("即使持有独立站权限也拒绝盛旭身份", () => {
    for (const scope of ["shengxu"] as const) {
      expect(hasRouteAccess(websiteMeta, { scope, perms: ["website:inquiry:list"] })).toBe(false);
    }
  });

  it("允许获授权的独立站和总部身份并拒绝缺少权限的独立站身份", () => {
    for (const scope of ["linxi", "website", "headquarters"] as const) {
      expect(hasRouteAccess(websiteMeta, { scope, perms: ["website:inquiry:list"] })).toBe(true);
    }
    expect(hasRouteAccess(websiteMeta, { scope: "website" })).toBe(false);
  });

  it("总部 ROOT 可访问，范围声明仍阻止不合范围的身份", () => {
    expect(hasRouteAccess(websiteMeta, { scope: "headquarters", roles: ["ROOT"] })).toBe(true);
    expect(hasRouteAccess(websiteMeta, { scope: "shengxu", roles: ["ROOT"] })).toBe(false);
  });

  it("检查完整路由链并从菜单移除未获授权的独立站入口", () => {
    const route = {
      path: "/website-inquiries",
      meta: { scopes: websiteMeta.scopes },
      children: [{ path: "", meta: { perms: websiteMeta.perms } }],
    } as RouteRecordRaw;
    const context = { scope: "shengxu" as const, perms: ["website:inquiry:list"] };
    expect(hasRouteChainAccess([route.meta!, route.children![0]!.meta!], context)).toBe(false);
    expect(filterRoutesByAccess([route], context)).toEqual([]);
  });

  it("不改变未声明范围的原有路由权限", () => {
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { perms: ["itinerary:list"] })).toBe(true);
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { perms: [] })).toBe(false);
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { roles: ["ROOT"] })).toBe(true);
  });
});

describe("角色菜单准入", () => {
  const resources = constantRoutes.find((route) => route.name === "TourismResources")!;
  const websiteConfig = resources.children!.find((route) => route.name === "WebsiteResources")!;
  const configChain = [resources.meta!, websiteConfig.meta!];

  it.each([
    { scope: "shengxu" as const, roles: ["RESOURCE_MANAGER"] },
    { scope: "linxi" as const, roles: ["RESOURCE_MANAGER"] },
  ])("$scope/$roles 即使旧快照包含配置菜单也不能显示或直接进入", ({ scope, roles }) => {
    const context = { scope, roles, perms: ["website:config:list"], menuKeys: ["website-config"] };
    expect(hasRouteChainAccess(configChain, context)).toBe(false);
    const menu = filterRoutesByAccess(constantRoutes, context).find((route) => route.name === "TourismResources");
    expect(menu?.children?.some((route) => route.name === "WebsiteResources") ?? false).toBe(false);
  });

  it.each([
    { scope: "website" as const, role: "BUSINESS_MANAGER" },
    { scope: "website" as const, role: "COORDINATOR" },
    { scope: "website" as const, role: "RESOURCE_MANAGER" },
    { scope: "headquarters" as const, role: "ADMIN" },
    { scope: "headquarters" as const, role: "EXECUTIVE" },
  ])("$scope/$role 仍须同时获得菜单与读取权限", ({ scope, role }) => {
    const context = { scope, roles: [role], perms: ["website:config:list"], menuKeys: ["website-config"] };
    expect(hasRouteChainAccess(configChain, context)).toBe(true);
    const menu = filterRoutesByAccess(constantRoutes, context).find((route) => route.name === "TourismResources");
    expect(menu?.children?.some((route) => route.name === "WebsiteResources")).toBe(true);
    expect(hasRouteChainAccess(configChain, { ...context, menuKeys: [] })).toBe(false);
    expect(hasRouteChainAccess(configChain, { ...context, perms: [] })).toBe(false);
  });

  it("保留总部 ROOT 固定可用的配置菜单和页面", () => {
    const context = { scope: "headquarters" as const, roles: ["ROOT"], perms: [], menuKeys: [] };
    expect(hasRouteChainAccess(configChain, context)).toBe(true);
    const menu = filterRoutesByAccess(constantRoutes, context).find((route) => route.name === "TourismResources");
    expect(menu?.children?.some((route) => route.name === "WebsiteResources")).toBe(true);
  });

  it("独立控制共用读取权限的导游菜单并保留原 API 权限", () => {
    const context = { scope: "linxi" as const, roles: ["COORDINATOR"], perms: ["resource:guide:list"], menuKeys: ["guide-people"] };
    expect(hasRouteAccess({ perms: ["resource:guide:list"], menuKey: "guide-people" }, context)).toBe(true);
    expect(hasRouteAccess({ perms: ["resource:guide:list"], menuKey: "guide-leaves" }, context)).toBe(false);
    expect(hasRouteAccess({ perms: ["inquiry:list"], menuKey: "guide-people" }, { ...context, perms: [] })).toBe(false);
  });
  it("隐藏入口同时拒绝关联行程；按显式模块分派", () => {
    const context = { scope: "linxi" as const, roles: ["COORDINATOR"], perms: ["itinerary:list", "website:itinerary:list"], menuKeys: ["inquiries"] };
    expect(hasWorkspaceAccess(context, "website")).toBe(true);
    expect(hasWorkspaceAccess(context, undefined)).toBe(false);
    expect(hasWorkspaceAccess({ ...context, menuKeys: [] }, "website")).toBe(false);
    expect(hasWorkspaceAccess({ ...context, scope: "shengxu" }, undefined)).toBe(true);
    expect(hasWorkspaceAccess({ ...context, scope: "shengxu" }, "website")).toBe(false);
    expect(hasWorkspaceAccess(context, "unknown")).toBe(false);
  });
  it("修正父分组默认跳转并隐藏没有可见子项的分组", () => {
    const context = { scope: "headquarters" as const, roles: ["ADMIN"], perms: ["sys:dict:list", "sys:user:list"], menuKeys: ["users"] };
    const routes = filterRoutesByAccess(constantRoutes, context);
    expect(routes.find((route) => route.name === "System")?.redirect).toBe("/system/user");
    expect(hasRouteChainAccess([{menuKey: "dict"}, {perms: ["sys:dict-item:list"]}], context)).toBe(false);
    expect(filterRoutesByAccess(constantRoutes, { ...context, menuKeys: [] }).some((route) => route.name === "System")).toBe(false);
  });
  it("ROOT 固定可用且其他角色不能进入菜单配置；基础页面固定保留", () => {
    expect(hasRouteAccess({menuKey: "menu-permissions", scopes: ["headquarters"], roles: ["ROOT"]}, {scope: "headquarters", roles: ["ROOT"], menuKeys: []})).toBe(true);
    expect(hasRouteAccess({roles: ["ROOT"], perms: ["sys:menu-permission:list"]}, {roles: ["ADMIN"], perms: ["sys:menu-permission:list"]})).toBe(false);
    expect(filterRoutesByAccess(constantRoutes, {roles: ["COORDINATOR"], menuKeys: []}).find((route) => route.path === "/")?.children?.some((route) => route.name === "Dashboard")).toBe(true);
  });
});
