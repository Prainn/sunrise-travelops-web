import { describe, expect, it } from "vitest";
import type { RouteRecordRaw } from "vue-router";
import { filterRoutesByAccess, hasRouteAccess } from "./access";

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
});
