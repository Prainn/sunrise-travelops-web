import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/request", () => ({
  request: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    getBlob: vi.fn(),
  },
}));

import { request } from "@/api/request";
import { businessDictionaryService } from "./business-dictionary.service";

const getMock = vi.mocked(request.get);
const postMock = vi.mocked(request.post);
const putMock = vi.mocked(request.put);
const deleteMock = vi.mocked(request.delete);

describe("businessDictionaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads business dictionary types from the backend contract", async () => {
    getMock.mockResolvedValue([
      { id: "type-1", code: "service-level", name: "服务等级", englishName: "Service Levels", builtIn: false, items: [] },
    ]);

    await expect(businessDictionaryService.getTypes()).resolves.toHaveLength(1);
    expect(getMock).toHaveBeenCalledWith("/system/business-dictionaries");
  });

  it("uses item query and mutation endpoints under business-dictionaries", async () => {
    getMock.mockResolvedValue([]);
    postMock.mockResolvedValue(undefined);
    putMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);

    await businessDictionaryService.getItems("resource-unit", { keyword: " room ", status: "enabled" });
    await businessDictionaryService.createItem("resource-unit", {
      code: "roomNight",
      name: "间夜",
      englishName: "Room night",
      resourceTypes: ["hotel"],
      status: "enabled",
      remark: " 酒店房型按间夜计价 ",
    });
    await businessDictionaryService.updateItem("resource-unit", "item-1", {
      code: "roomNight",
      name: "间夜",
      englishName: "Room night",
      resourceTypes: ["hotel"],
      status: "enabled",
      remark: "",
    });
    await businessDictionaryService.deleteItems("resource-unit", "item-1,item-2");

    expect(getMock).toHaveBeenCalledWith(
      "/system/business-dictionaries/resource-unit/items",
      { params: { keyword: "room", status: "enabled" } }
    );
    expect(postMock).toHaveBeenCalledWith("/system/business-dictionaries/resource-unit/items", {
      id: undefined,
      code: "roomNight",
      name: "间夜",
      englishName: "Room night",
      resourceTypes: ["hotel"],
      status: "enabled",
      remark: "酒店房型按间夜计价",
    });
    expect(putMock).toHaveBeenCalledWith(
      "/system/business-dictionaries/resource-unit/items/item-1",
      expect.objectContaining({ id: "item-1", code: "roomNight" })
    );
    expect(deleteMock).toHaveBeenCalledWith(
      "/system/business-dictionaries/resource-unit/items",
      { params: { ids: "item-1,item-2" } }
    );
  });

  it("preserves ApiError values for business handling", async () => {
    const error = Object.assign(new Error("Code exists"), {
      name: "ApiError",
      code: "BUSINESS_DICTIONARY_ITEM_CODE_EXISTS",
      status: 409,
    });
    postMock.mockRejectedValue(error);

    await expect(businessDictionaryService.createItem("transport-method", {
      code: "flight",
      name: "飞机",
      englishName: "Flight",
      status: "enabled",
      remark: "",
    })).rejects.toBe(error);
  });
});
