import { describe, expect, it, vi } from "vitest";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));
vi.mock("@/utils/auth", () => ({
  AuthStorage: { getAccessToken: () => "" },
}));

import { tourismResources } from "@/data/data";
import { dictionaryService } from "./dictionary.service";
import { userService } from "./user.service";

describe("local data services", () => {
  it("keeps generic resources only for the shared supplier and transport screens", () => {
    expect(Object.keys(tourismResources).sort()).toEqual(["supplier", "transport"]);
  });

  it("filters users and returns role options from the central data module", async () => {
    const result = await userService.getPage({ pageNum: 1, pageSize: 10, keywords: "admin" });
    const roles = await userService.getRoleOptions();

    expect(result.total).toBe(1);
    expect(result.list[0].username).toBe("admin");
    expect(roles.map((role) => role.value)).toContain(2);
  });

  it("returns enabled dictionary items in configured order", async () => {
    const items = await dictionaryService.getDictItems("gender");

    expect(items.map((item) => item.value)).toEqual(["1", "2", "0"]);
  });
});
