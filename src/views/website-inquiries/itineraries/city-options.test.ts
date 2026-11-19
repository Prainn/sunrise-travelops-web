import { expect, it } from "vitest";
import type { WebsiteCity } from "@/types/website";
import { selectableWebsiteCityIds, websiteCityOptions } from "./city-options";

it("limits new picks to enabled inquiry destinations and retains the current city", () => {
  const cities: WebsiteCity[] = [
    { id: "dali", nameZh: "大理", nameEn: "Dali", status: "enabled", resourceId: null },
    { id: "lijiang", nameZh: "丽江", nameEn: "Lijiang", status: "enabled", resourceId: null },
    { id: "deqin", nameZh: "德钦", nameEn: "Deqin", status: "enabled", resourceId: null },
    { id: "nujiang", nameZh: "怒江", nameEn: "Nujiang", status: "disabled", resourceId: null },
  ];
  const scoped = selectableWebsiteCityIds(cities, ["lijiang", "dali", "nujiang"]);
  expect([...scoped]).toEqual(["dali", "lijiang"]);
  expect(websiteCityOptions(cities, scoped, "deqin").map((city) => city.id)).toEqual(["dali", "lijiang", "deqin"]);
  expect([...selectableWebsiteCityIds(cities, [])]).toEqual(["dali", "lijiang", "deqin"]);
});
