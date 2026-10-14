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
