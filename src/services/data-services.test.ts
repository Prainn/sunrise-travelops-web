import { describe, expect, it, vi } from "vitest";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));
vi.mock("@/utils/auth", () => ({
  AuthStorage: { getAccessToken: () => "" },
}));

import { inquiries, itineraries, tourismResources, users } from "@/data/data";
import { dictionaryService } from "./dictionary.service";
import { userService } from "./user.service";

describe("local data services", () => {
  it("keeps generic resources for the shared agency, supplier, and transport screens", () => {
    expect(Object.keys(tourismResources).sort()).toEqual(["agency", "supplier", "transport"]);
  });

  it("filters users and returns P0 role and department options", async () => {
    const result = await userService.getPage({ pageNum: 1, pageSize: 10, keywords: "admin" });
    const roles = await userService.getRoleOptions();
    const departments = await userService.getDepartmentOptions();

    expect(result.total).toBe(1);
    expect(result.list[0].username).toBe("admin");
    expect(roles.map((role) => role.value)).toEqual([2, 4, 5, 6]);
    expect(departments.map((department) => department.value)).toEqual([1, 2, 3]);
  });

  it("filters users by department and role", async () => {
    const result = await userService.getPage({
      pageNum: 1,
      pageSize: 10,
      deptId: 3,
      roleId: 5,
    });

    expect(result.list.map((user) => user.username)).toEqual([
      "inquiry",
      "inquiry_lina",
      "inquiry_zhouyue",
    ]);
    expect(result.list[0].deptName).toBe("user.departments.coordination");
    expect(users.find((user) => user.username === "operations")?.deptId).toBe(3);
  });

  it("provides three enabled accounts for each coordinator role", () => {
    const enabledCoordinatorNames = (role: string) => users
      .filter((user) => user.status === "enabled" && user.roles.includes(role))
      .map((user) => user.nickname);

    expect(enabledCoordinatorNames("INQUIRY_COORDINATOR")).toEqual(["王敏", "李娜", "周悦"]);
    expect(enabledCoordinatorNames("OPERATIONS_COORDINATOR")).toEqual(["张伟", "陈晨", "赵磊"]);
  });

  it("assigns inquiry and itinerary permissions to coordinator roles", () => {
    expect(users.find((user) => user.username === "inquiry")?.perms).toEqual([
      "inquiry:list",
      "inquiry:create",
      "inquiry:update",
      "itinerary:list",
      "itinerary:price",
    ]);
    expect(users.find((user) => user.username === "operations")?.perms).toEqual([
      "inquiry:list",
      "inquiry:update",
      "itinerary:list",
      "itinerary:create",
      "itinerary:update",
      "itinerary:pdf",
    ]);
  });

  it("keeps itinerary mock records linked to existing inquiries", () => {
    expect(itineraries.every((itinerary) => itinerary.status === "draft")).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.days > 0)).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.inquiryId === "inquiry-1")).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.plannedDays > 0)).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.operationsCoordinator.length > 0)).toBe(true);
    expect(inquiries.every((inquiry) => tourismResources.agency.some((agency) => agency.id === inquiry.agencyId))).toBe(true);
    expect(inquiries.every((inquiry) => ["new", "planning", "quoted", "lost", "archived"].includes(inquiry.status))).toBe(true);
    expect(itineraries[0].days).toBe(inquiries.find((inquiry) => inquiry.id === itineraries[0].inquiryId)?.plannedDays);
  });

  it("maps assigned P0 roles to the corresponding access codes", async () => {
    await userService.create({
      username: "multi-role-user",
      nickname: "Multi Role User",
      deptId: 2,
      roleIds: [4, 6],
      status: 1,
    });

    const created = users.find((user) => user.username === "multi-role-user");
    expect(created?.roles).toEqual(["RESOURCE_MANAGER", "OPERATIONS_COORDINATOR"]);
    expect(created?.perms).toContain("resource:hotel:list");

    await userService.deleteByIds(created?.id ?? "");
  });

  it("returns enabled dictionary items in configured order", async () => {
    const items = await dictionaryService.getDictItems("gender");

    expect(items.map((item) => item.value)).toEqual(["1", "2", "0"]);
  });
});
