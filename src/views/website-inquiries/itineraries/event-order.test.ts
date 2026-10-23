import { describe, expect, it } from "vitest";
import type { WebsiteItem, WebsiteLeg } from "@/types/website";
import { emptyDay } from "../options";
import { insertWebsiteEvent, websiteDayEventIds } from "./event-order";

function attraction(id: string): WebsiteItem {
  return { id, attractionId: null, nameZh: id, nameEn: id, descriptionZh: "", descriptionEn: "", appears: true, feeState: "UNKNOWN" };
}
function transport(id: string): WebsiteLeg {
  return { id, routeId: null, fromCityId: "from", toCityId: "to", mode: "hsr", nameZh: id, nameEn: id, feeState: "UNKNOWN" };
}

describe("website event insertion", () => {
  it("inserts an attraction between existing cards and keeps category order after serialization", () => {
    const day = emptyDay(1);
    day.items = [attraction("first"), attraction("second"), attraction("inserted")];
    insertWebsiteEvent(day, "inserted", "first");
    const restored = JSON.parse(JSON.stringify(day));
    expect(websiteDayEventIds(restored).slice(0, 3)).toEqual(["first", "inserted", "second"]);
    expect(restored.items.map((item: WebsiteItem) => item.id)).toEqual(["first", "inserted", "second"]);
  });

  it("interleaves transport and meals without duplicating an existing meal", () => {
    const day = emptyDay(1);
    day.items = [attraction("first"), attraction("second")];
    day.legs = [transport("later"), transport("inserted")];
    day.eventOrder = ["first", "second", "later"];
    insertWebsiteEvent(day, "inserted", "first");
    const lunch = day.meals.find(meal => meal.slot === "lunch")!;
    lunch.restaurantZh = "午餐";
    insertWebsiteEvent(day, lunch.id, "inserted");
    expect(day.eventOrder?.slice(0, 5)).toEqual(["first", "inserted", lunch.id, "second", "later"]);
    expect(day.legs.map(leg => leg.id)).toEqual(["inserted", "later"]);
    expect(day.meals).toHaveLength(3);
    expect(day.eventOrder?.filter(id => id === lunch.id)).toHaveLength(1);
  });

  it("preserves other events and ignores removed or repeated IDs", () => {
    const day = emptyDay(1);
    day.items = [attraction("first"), attraction("second")];
    day.guideLanguage = "中文";
    day.services = [{ id: "service", nameZh: "接机", nameEn: "Transfer", appears: true, feeState: "INCLUDED" }];
    day.eventOrder = ["removed", "service", "first", "first", `${day.id}-guide`, "second"];
    day.legs.push(transport("inserted"));
    insertWebsiteEvent(day, "inserted", "first");
    expect(day.eventOrder?.slice(0, 5)).toEqual(["service", "first", "inserted", `${day.id}-guide`, "second"]);
    expect(day.eventOrder).not.toContain("removed");
    expect(new Set(day.eventOrder).size).toBe(day.eventOrder?.length);
  });

  it("keeps an edited meal in place when it is also the insertion anchor", () => {
    const day = emptyDay(1);
    day.eventOrder = day.meals.map(meal => meal.id);
    const before = [...day.eventOrder];
    insertWebsiteEvent(day, before[0]!, before[0]!);
    expect(day.eventOrder).toEqual(before);
  });
});
