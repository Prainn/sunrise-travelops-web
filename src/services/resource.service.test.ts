import { describe, expect, it, vi } from "vitest";

const get = vi.hoisted(() => vi.fn());
vi.mock("@/api/request", () => ({ request: { get } }));

import { resourceService } from "./resource.service";

describe("standard price resource filtering", () => {
  it.each(["restaurantApi", "attractionApi"] as const)(
    "%s sends both boolean filters and omits the all filter",
    async (api) => {
      get.mockResolvedValue({ list: [], total: 0, page: 1, pageSize: 20 });
      for (const isStandardPrice of [true, false, undefined]) {
        await resourceService[api].getPage({ page: 1, pageSize: 20, isStandardPrice });
        expect(get).toHaveBeenLastCalledWith(
          `/resources/${api === "restaurantApi" ? "restaurants" : "attractions"}`,
          { params: { page: 1, pageSize: 20, isStandardPrice } },
        );
      }
    },
  );
});

describe("resource money normalization", () => {
  it.each(["hotelApi", "attractionApi", "restaurantApi", "guideApi"] as const)(
    "%s preserves missing prices and real zero prices",
    async (api) => {
      const fields = api === "hotelApi" ? ["individualPrice", "groupPrice"]
        : api === "guideApi" ? ["dailyPrice"] : ["price"];
      for (const value of [null, undefined, "", " ", "0", "12.30"]) {
        get.mockResolvedValue({
          list: [{ id: "resource", ...Object.fromEntries(fields.map((field) => [field, value])) }],
        });
        const result = await resourceService[api].getPage({});
        for (const field of fields) {
          expect(result.list[0]).toHaveProperty(field, value === "0" ? 0 : value === "12.30" ? 12.3 : null);
        }
      }
    },
  );
});
