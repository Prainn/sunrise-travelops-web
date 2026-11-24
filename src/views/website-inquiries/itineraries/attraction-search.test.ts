import { describe, expect, it } from "vitest";
import type { WebsiteAttraction } from "@/types/website";
import { websiteAttractionRows } from "./attraction-search";

function attraction(id: string, nameZh: string, nameEn: string, parentId: string | null = null): WebsiteAttraction {
  return {
    id, nameZh, nameEn, parentId, cityId: "km", status: "enabled", resourceId: null,
    kind: parentId ? "component" : "attraction", chargeable: false, price: "",
    descriptionZh: "", descriptionEn: "", recommendedMonths: [],
  };
}

describe("website attraction parent search", () => {
  const westHill = attraction("west", "西山", "Western Hills");
  const dragonGate = attraction("gate", "龙门", "Dragon Gate", "west");
  const temple = attraction("temple", "华亭寺", "Huating Temple", "west");
  const lake = attraction("lake", "滇池", "Dianchi Lake");
  const options = [westHill, dragonGate, lake, temple];
  const ids = (keyword: string, all?: WebsiteAttraction[], selectable = options) =>
    websiteAttractionRows(selectable, keyword, all).map(row => row.attraction.id);

  it("matches only parent names and lists every selectable component of a matched parent", () => {
    expect(ids("西山")).toEqual(["west", "gate", "temple"]);
    expect(ids("  western HILLS ")).toEqual(["west", "gate", "temple"]);
    expect(websiteAttractionRows(options, "西山")[1]).toEqual({ attraction: dragonGate, parent: westHill });
  });

  it("does not bring in a parent group, or a lone component, when only a component name matches", () => {
    expect(ids("龙门")).toEqual([]);
    expect(ids("dragon")).toEqual([]);
  });

  it("restores the full list in configuration order when the keyword is cleared", () => {
    expect(ids("")).toEqual(["west", "gate", "temple", "lake"]);
    expect(ids("   ")).toEqual(["west", "gate", "temple", "lake"]);
  });

  it("matches components whose parent is not selectable by that parent's name only", () => {
    const disabledParent = { ...westHill, status: "disabled" as const };
    const selectable = [dragonGate, lake];
    expect(ids("西山", [disabledParent, dragonGate, lake], selectable)).toEqual(["gate"]);
    expect(ids("龙门", [disabledParent, dragonGate, lake], selectable)).toEqual([]);
    expect(ids("", [disabledParent, dragonGate, lake], selectable)).toEqual(["lake", "gate"]);
  });
});
