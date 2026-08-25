import { describe, expect, it } from "vitest";
import type { RouteRecordRaw } from "vue-router";
import { filterRoutesByAccess, hasRouteAccess, hasRouteChainAccess } from "./access";

describe("route access", () => {
  it("allows root users to access protected routes", () => {
    expect(hasRouteAccess({ perms: ["resource:hotel:list"] }, { roles: ["ROOT"] })).toBe(true);
  });

  it("removes menu groups without accessible children", () => {
    const routes: RouteRecordRaw[] = [
      {
        path: "/resources",
        children: [
          {
            path: "hotel",
            component: { template: "<div />" },
            meta: { perms: ["resource:hotel:list"] },
          },
        ],
      },
    ];

    expect(filterRoutesByAccess(routes, { roles: ["USER"], perms: [] })).toEqual([]);
  });

  it("rejects a redirect when any matched route requires a missing permission", () => {
    const routeMetas = [{}, { perms: ["sys:user:list"] }];

    expect(hasRouteChainAccess(routeMetas, {
      roles: ["USER"],
      perms: ["sys:dict:list"],
    })).toBe(false);
  });

  it("allows a redirect when all matched route permissions are available", () => {
    const routeMetas = [{}, { perms: ["sys:dict:list"] }];

    expect(hasRouteChainAccess(routeMetas, {
      roles: ["USER"],
      perms: ["sys:dict:list"],
    })).toBe(true);
  });
});
