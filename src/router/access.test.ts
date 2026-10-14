import { describe, expect, it, vi } from "vitest";
import type { RouteMeta, RouteRecordRaw } from "vue-router";
import { filterRoutesByAccess, hasRouteAccess, hasRouteChainAccess } from "./access";
import { constantRoutes } from "./index";

vi.mock("vue-router", () => ({
  createRouter: vi.fn(() => ({})),
  createWebHistory: vi.fn(),
}));

describe("实际询盘菜单的读取权限", () => {
  it.each(["EXECUTIVE", "ADMIN", "COORDINATOR"])(
    "%s 无归档权限时仍可进入询盘汇总",
    (role) => {
      const context = { roles: [role], perms: ["inquiry:list"] };
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
  scopes: ["website", "headquarters"],
  perms: ["website:inquiry:list"],
};

describe("独立站路由范围", () => {
  it("即使持有独立站权限也拒绝霖熹、盛旭身份", () => {
    for (const scope of ["linxi", "shengxu"] as const) {
      expect(hasRouteAccess(websiteMeta, { scope, perms: ["website:inquiry:list"] })).toBe(false);
    }
  });

  it("允许获授权的独立站和总部身份并拒绝缺少权限的独立站身份", () => {
    for (const scope of ["website", "headquarters"] as const) {
      expect(hasRouteAccess(websiteMeta, { scope, perms: ["website:inquiry:list"] })).toBe(true);
    }
    expect(hasRouteAccess(websiteMeta, { scope: "website" })).toBe(false);
  });

  it("总部 ROOT 可访问，范围声明仍阻止不合范围的身份", () => {
    expect(hasRouteAccess(websiteMeta, { scope: "headquarters", roles: ["ROOT"] })).toBe(true);
    expect(hasRouteAccess(websiteMeta, { scope: "linxi", roles: ["ROOT"] })).toBe(false);
  });

  it("检查完整路由链并从菜单移除未获授权的独立站入口", () => {
    const route = {
      path: "/website-inquiries",
      meta: { scopes: websiteMeta.scopes },
      children: [{ path: "", meta: { perms: websiteMeta.perms } }],
    } as RouteRecordRaw;
    const context = { scope: "linxi" as const, perms: ["website:inquiry:list"] };
    expect(hasRouteChainAccess([route.meta!, route.children![0]!.meta!], context)).toBe(false);
    expect(filterRoutesByAccess([route], context)).toEqual([]);
  });

  it("不改变未声明范围的原有路由权限", () => {
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { perms: ["itinerary:list"] })).toBe(true);
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { perms: [] })).toBe(false);
    expect(hasRouteAccess({ perms: ["itinerary:list"] }, { roles: ["ROOT"] })).toBe(true);
  });
});
