import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";

class FakeApiError extends Error {
  constructor(readonly status: number) {
    super(`HTTP ${status}`);
  }
}
const resource = vi.fn();
const resources = vi.fn();
vi.mock("@/api/request", () => ({ isApiError: (cause: unknown) => cause instanceof FakeApiError }));
vi.mock("@/services/website.service", () => ({
  websiteService: { resource, resources },
  websiteErrorMessage: (cause: Error) => cause.message,
}));
const { useResourceCityLookup } = await import("./resource-cities");
const { websiteTransferIssues } = await import("./day-order");
const { emptyDay } = await import("../options");

const config = {
  version: 1,
  cities: [
    { id: "km", nameZh: "昆明", nameEn: "Kunming", resourceId: "pc-km", status: "enabled" },
    { id: "dl", nameZh: "大理", nameEn: "Dali", resourceId: "pc-dl", status: "enabled" },
    { id: "lj", nameZh: "丽江", nameEn: "Lijiang", resourceId: null, status: "enabled" },
  ],
  attractions: [],
} as unknown as WebsiteConfig;
/** 公共资源库：pc-km 远在城市列表首页之外；r-a 与 r-b 同名但不同城市 */
const library: Record<string, unknown> = {
  "city:pc-km": { id: "pc-km", name: "昆明市", status: "enabled" },
  "city:pc-dl": { id: "pc-dl", name: "大理州", status: "disabled" },
  "restaurant:r-a": { id: "r-a", name: "老字号", status: "disabled", city: "昆明市" },
  "restaurant:r-b": { id: "r-b", name: "老字号", status: "enabled", city: "大理州" },
  "restaurant:r-empty": { id: "r-empty", name: "无城市", status: "enabled", city: null },
};
const flush = () => new Promise((resolve) => setTimeout(resolve));

function lunch(resourceId: string | null, restaurantZh: string) {
  return { id: `lunch-${resourceId ?? "manual"}`, slot: "lunch" as const, resourceId, restaurantZh, restaurantEn: "", feeState: "INCLUDED" as const };
}

/** D2 的午餐移到 D1（D1 出发/结束 = depart）；餐厅名称已被改写，城市只能按 ID 读取。 */
function scenario(meal: ReturnType<typeof lunch>, depart = "km") {
  const d1 = { ...emptyDay(1), id: "d1", departCityId: depart, endCityId: depart, overnightCityId: null };
  const d2 = { ...emptyDay(2), id: "d2", departCityId: "dl", endCityId: "dl", overnightCityId: null };
  d2.meals[1] = meal;
  const days: WebsiteDay[] = [d1, d2];
  const groups = (day: WebsiteDay) => ({
    attractions: [], legs: [], hotels: [], services: [],
    meals: day.meals.map((value) => value.id).filter((id) => id !== meal.id),
  });
  const placements = { d1: groups(d1), d2: groups(d2) };
  placements.d1.meals = [...placements.d1.meals.filter((id) => id !== d1.meals[1]!.id), meal.id];
  return { days, change: { dayIds: ["d1", "d2"], itemIds: {}, placements } };
}

function check(lookup: ReturnType<typeof useResourceCityLookup>, meal: ReturnType<typeof lunch>, depart?: string) {
  const { days, change } = scenario(meal, depart);
  return websiteTransferIssues(days, change, [], { config, ...lookup })
    .filter((issue) => issue.dayId === "d1")
    .map((issue) => ({ key: issue.key.split(".").pop(), blocking: Boolean(issue.blocking), retry: issue.retry }));
}

describe("website restaurant city lookup by resource ID", () => {
  beforeEach(() => {
    resource.mockReset();
    resources.mockReset();
    resource.mockImplementation(async (kind: string, id: string) => {
      const detail = library[`${kind}:${id}`];
      if (!detail) throw new FakeApiError(404);
      return detail;
    });
  });

  it("matches a renamed, disabled restaurant through the linked public city detail without searching lists", async () => {
    const lookup = useResourceCityLookup();
    const meal = lunch("r-a", "改过的名字");
    expect(check(lookup, meal)).toEqual([{ key: "checking", blocking: true, retry: undefined }]);
    await flush();
    expect(check(lookup, meal)).toEqual([{ key: "checking", blocking: true, retry: undefined }]);
    await flush();
    expect(check(lookup, meal)).toEqual([]);
    expect(resource.mock.calls).toEqual([["restaurant", "r-a"], ["city", "pc-km"]]);
    expect(resources).not.toHaveBeenCalled();
  });

  it("keeps same-name restaurants apart by ID and blocks the mismatching one", async () => {
    const lookup = useResourceCityLookup();
    check(lookup, lunch("r-a", "老字号"));
    check(lookup, lunch("r-b", "老字号"));
    await flush();
    check(lookup, lunch("r-b", "老字号"));
    await flush();
    expect(check(lookup, lunch("r-a", "老字号"))).toEqual([]);
    expect(check(lookup, lunch("r-b", "老字号"))).toEqual([{ key: "restaurantCityMismatch", blocking: true, retry: undefined }]);
  });

  it("caches by kind and ID and merges concurrent requests until reset", async () => {
    const lookup = useResourceCityLookup();
    const meal = lunch("r-a", "老字号");
    check(lookup, meal);
    check(lookup, meal);
    expect(resource).toHaveBeenCalledTimes(1);
    await flush();
    check(lookup, meal);
    check(lookup, meal);
    await flush();
    check(lookup, meal);
    expect(resource).toHaveBeenCalledTimes(2);
    lookup.reset();
    check(lookup, meal);
    expect(resource).toHaveBeenCalledTimes(3);
  });

  it("blocks on request failure with retry, and reports 404 as a missing resource rather than manual content", async () => {
    const lookup = useResourceCityLookup();
    const meal = lunch("r-a", "老字号");
    resource.mockRejectedValueOnce(new Error("network down"));
    check(lookup, meal);
    await flush();
    const [failed] = check(lookup, meal);
    expect(failed).toMatchObject({ key: "lookupFailed", blocking: true });
    failed!.retry!();
    check(lookup, meal);
    await flush();
    check(lookup, meal);
    await flush();
    expect(check(lookup, meal)).toEqual([]);
    expect(resource).toHaveBeenCalledTimes(3);

    const deleted = lunch("r-deleted", "已删除");
    check(lookup, deleted);
    await flush();
    expect(check(lookup, deleted)).toEqual([{ key: "restaurantMissing", blocking: true, retry: undefined }]);
  });

  it("only hints manual checks for manual meals, empty restaurant cities and unlinked config cities", async () => {
    const lookup = useResourceCityLookup();
    expect(check(lookup, lunch(null, "手填餐馆"))).toEqual([{ key: "manualCheck", blocking: false, retry: undefined }]);
    check(lookup, lunch("r-empty", "无城市"));
    await flush();
    expect(check(lookup, lunch("r-empty", "无城市"))).toEqual([{ key: "manualCheck", blocking: false, retry: undefined }]);
    // 丽江未关联公共城市，无法判定 r-b 是否在当天范围内。
    check(lookup, lunch("r-b", "老字号"), "lj");
    await flush();
    expect(check(lookup, lunch("r-b", "老字号"), "lj")).toEqual([{ key: "manualCheck", blocking: false, retry: undefined }]);
    expect(resource.mock.calls.filter(([kind]) => kind === "city")).toEqual([]);
  });
});
