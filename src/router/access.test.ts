import { describe, expect, it } from "vitest";
import type { RouteMeta, RouteRecordRaw } from "vue-router";
import { filterRoutesByAccess, hasRouteAccess, hasRouteChainAccess } from "./access";

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
