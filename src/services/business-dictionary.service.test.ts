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

describe("businessDictionaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes resource-unit input before saving", async () => {
    postMock.mockResolvedValue(undefined);

    await businessDictionaryService.createItem("resource-unit", {
      code: " roomNight ",
      name: " 间夜 ",
      englishName: " Room night ",
      resourceTypes: ["hotel"],
      status: "enabled",
      remark: " 酒店房型按间夜计价 ",
    });

    expect(postMock).toHaveBeenCalledWith("/system/business-dictionaries/resource-unit/items", {
      id: undefined,
      code: "roomNight",
      name: "间夜",
      englishName: "Room night",
      resourceTypes: ["hotel"],
      status: "enabled",
      remark: "酒店房型按间夜计价",
    });
  });
});

it("loads built-in dictionaries only once for concurrent consumers", async () => {
  vi.clearAllMocks();
  getMock.mockResolvedValue([]);

  await Promise.all([
    businessDictionaryService.ensureBuiltInTypesLoaded(),
    businessDictionaryService.ensureBuiltInTypesLoaded(),
  ]);
  await businessDictionaryService.ensureBuiltInTypesLoaded();

  expect(getMock).toHaveBeenCalledTimes(1);
});
