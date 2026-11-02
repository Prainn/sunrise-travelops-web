import { describe, expect, it, vi } from "vitest";

const {get,post,put} = vi.hoisted(() => ({get:vi.fn(),post:vi.fn(),put:vi.fn()}));
vi.mock("@/api/request", () => ({ request: { get,post,put } }));

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

describe("resource create and update payloads", () => {
  it("never sends a reused record ID when creating a city", async () => {
    const record = {id:"existing",code:"",name:"测试",province:"",status:"enabled",longitude:null,latitude:null,version:7} as Parameters<typeof resourceService.cityApi.create>[0];
    post.mockResolvedValue({...record,id:"new"});
    await resourceService.cityApi.create(record);
    expect(post.mock.calls.at(-1)?.[1]).not.toHaveProperty("id");
    expect(post.mock.calls.at(-1)?.[1]).not.toHaveProperty("version");
    put.mockResolvedValue(record);
    await resourceService.cityApi.update(record.id,record);
    expect(put.mock.calls.at(-1)?.[1]).toMatchObject({id:"existing",version:7});
  });
  it("only sends version and ID when editing a contact", async () => {
    const contact = {id:"existing",name:"测试",phone:"",version:7} as Parameters<typeof resourceService.agencyApi.createContact>[1];
    post.mockResolvedValue(contact);
    await resourceService.agencyApi.createContact("agency",contact);
    expect(post.mock.calls.at(-1)?.[1]).toEqual({name:"测试",phone:""});
    put.mockResolvedValue(contact);
    await resourceService.agencyApi.updateContact("agency",contact.id,contact);
    expect(put.mock.calls.at(-1)?.[1]).toEqual({id:"existing",name:"测试",phone:"",version:7});
  });
});
