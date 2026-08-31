import { describe, expect, it, vi } from "vitest";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));
vi.mock("@/utils/auth", () => ({
  AuthStorage: { getAccessToken: () => "" },
}));

import { attractions, businessCategoryTypes, guides, hotels, inquiries, inquiryLogs, itineraries, resourceUnits, restaurants, tourismResources, transportMethods, users } from "@/data/data";
import { getResourceUnitName } from "@/utils/resource-unit";
import { getTransportMethodNames } from "@/utils/transport-method";
import { getResourcePriceOptions } from "@/views/inquiries/itineraries/pricing";
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
    expect(inquiries).toHaveLength(5);
    expect(inquiries.map((inquiry) => inquiry.status).sort()).toEqual(["archived", "lost", "new", "planning", "quoted"]);
    expect(itineraries.map((itinerary) => itinerary.status)).toEqual(["draft", "draft", "quoted", "draft", "archived"]);
    expect(itineraries.every((itinerary) => itinerary.days > 0)).toBe(true);
    expect(itineraries.every((itinerary) => inquiries.some((inquiry) => inquiry.id === itinerary.inquiryId))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.updatedAt.length > 0)).toBe(true);
    expect(inquiries.every((inquiry) => itineraries.some((itinerary) => itinerary.inquiryId === inquiry.id))).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.plannedDays > 0)).toBe(true);
    expect(inquiries.every((inquiry) => inquiry.operationsCoordinator.length > 0)).toBe(true);
    expect(inquiries.every((inquiry) => tourismResources.agency.some((agency) => agency.id === inquiry.agencyId))).toBe(true);
    expect(inquiries.every((inquiry) => ["new", "planning", "quoted", "lost", "archived"].includes(inquiry.status))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.days === inquiries.find((inquiry) => inquiry.id === itinerary.inquiryId)?.plannedDays)).toBe(true);
    expect(inquiryLogs.every((log) => inquiries.some((inquiry) => inquiry.id === log.inquiryId))).toBe(true);
    expect(inquiries.every((inquiry) => inquiryLogs.some((log) => log.inquiryId === inquiry.id))).toBe(true);
  });

  it("provides enough mock records for list, filter, and pagination testing", () => {
    expect(inquiries).toHaveLength(5);
    expect(tourismResources.agency).toHaveLength(8);
    expect(tourismResources.supplier).toHaveLength(3);
    expect(tourismResources.transport).toHaveLength(5);
    expect(hotels).toHaveLength(6);
    expect(attractions).toHaveLength(8);
    expect(restaurants).toHaveLength(12);
    expect(guides).toHaveLength(7);
  });

  it("provides a complete seven-day itinerary for every inquiry", () => {
    const resourcePriceKeys = new Set(getResourcePriceOptions().map((option) =>
      `${option.type}:${option.resourceId}:${option.resourcePriceId}`));
    const itineraryIds = itineraries.flatMap((itinerary) => [
      itinerary.id,
      ...itinerary.dailyPlans.flatMap((day) => [day.id, ...day.items.map((item) => item.id)]),
    ]);

    expect(itineraries).toHaveLength(5);
    expect(new Set(itineraryIds).size).toBe(itineraryIds.length);
    expect(itineraries.every((itinerary) => itinerary.days === 7)).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.length === 7)).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.map((day) => day.dayNumber).join(",") === "1,2,3,4,5,6,7")).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.every((day) => (
      Boolean(day.description?.length)
      && day.items.length > 0
    )))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.flatMap((day) => day.items).every((item) =>
      resourcePriceKeys.has(`${item.type}:${item.resourceId}:${item.resourcePriceId}`)))).toBe(true);
    expect(itineraries.every((itinerary) => itinerary.dailyPlans.flatMap((day) => day.items).every((item) =>
      item.totalCost === item.unitCost * item.quantity))).toBe(true);
  });

  it("keeps ground operator references linked to supplier mock data", () => {
    const supplierIds = new Set(tourismResources.supplier.map((supplier) => supplier.id));
    const groundOperatorIds = [
      ...hotels.flatMap((hotel) => hotel.roomTypes.flatMap((room) => room.pricePlans)),
      ...attractions.flatMap((attraction) => attraction.prices),
      ...restaurants.flatMap((restaurant) => restaurant.prices),
      ...guides,
    ]
      .filter((record) => record.isGroundOperatorProvided)
      .map((record) => record.groundOperatorId);

    expect(groundOperatorIds.every((id) => supplierIds.has(id))).toBe(true);
  });

  it("keeps every tourism resource unit backed by business category mock data", () => {
    const configuredCodes = new Set(resourceUnits.map((unit) => unit.code));
    const usedCodes = [
      ...hotels.map((hotel) => hotel.unit),
      ...hotels.flatMap((hotel) => hotel.roomTypes.flatMap((room) => room.pricePlans.map((price) => price.unit))),
      ...attractions.map((attraction) => attraction.unit),
      ...attractions.flatMap((attraction) => attraction.prices.map((price) => price.unit)),
      ...restaurants.map((restaurant) => restaurant.unit),
      ...restaurants.flatMap((restaurant) => restaurant.prices.map((price) => price.unit)),
      ...tourismResources.transport.map((resource) => String(resource.unit)),
      ...guides.map((guide) => guide.unit),
    ];

    expect(usedCodes.every((code) => configuredCodes.has(code))).toBe(true);
    expect(getResourceUnitName("vehicleDay", "zh-CN")).toBe("辆/天");
    expect(getResourceUnitName("personVisit", "zh-CN")).toBe("人次");
    expect(getResourceUnitName("personMeal", "zh-CN")).toBe("人/餐");
    expect(getResourceUnitName("guideDay", "zh-CN")).toBe("人/天");
    expect(getResourceUnitName("roomNight", "en")).toBe("Room night");
  });

  it("keeps itinerary transport methods backed by business category mock data", () => {
    const configuredCodes = new Set(transportMethods.map((method) => method.code));
    const usedCodes = itineraries.flatMap((itinerary) => itinerary.dailyPlans.flatMap((day) => day.transport.split(",").filter(Boolean)));

    expect(usedCodes.every((code) => configuredCodes.has(code))).toBe(true);
    expect(getTransportMethodNames("flight,businessCar", "zh-CN")).toBe("飞机 / 商务车");
  });

  it("provides built-in business category types for resource units and transport methods", () => {
    expect(businessCategoryTypes.map((category) => category.code)).toEqual(["resource-unit", "transport-method"]);
    expect(businessCategoryTypes.every((category) => category.builtIn)).toBe(true);
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
