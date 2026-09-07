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
import { dictionaryService } from "./dictionary.service";

const getMock = vi.mocked(request.get);
const postMock = vi.mocked(request.post);
const putMock = vi.mocked(request.put);
const deleteMock = vi.mocked(request.delete);

describe("dictionaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the unified dictionary page and maps query parameters", async () => {
    const page = {
      list: [{ id: "type-1", name: "用户性别", dictCode: "gender", status: 1 }],
      total: 1,
      page: 2,
      pageSize: 10,
    };
    getMock.mockResolvedValue(page);

    await expect(dictionaryService.getPage({
      page: 2,
      pageSize: 10,
      keyword: " gender ",
      status: 1,
    })).resolves.toEqual(page);
    expect(getMock).toHaveBeenCalledWith("/system/dictionaries", {
      params: {
        page: 2,
        pageSize: 10,
        keyword: "gender",
        status: 1,
      },
    });
  });

  it("loads enabled options from the login-only dictionary item endpoint", async () => {
    getMock.mockResolvedValue([
      { value: "1", label: "男", tagType: "primary" },
      { value: "2", label: "女", tagType: "danger" },
    ]);

    await expect(dictionaryService.getDictItems("gender")).resolves.toHaveLength(2);
    expect(getMock).toHaveBeenCalledWith("/system/dictionaries/gender/items/options");
  });

  it("sends normalized item form data and comma-separated delete IDs", async () => {
    postMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);

    await dictionaryService.createDictItem("gender", {
      label: "  未设置  ",
      value: " 0 ",
      status: 1,
      sort: 3,
      tagType: "info",
    });
    await dictionaryService.deleteDictItems("gender", "item-1,item-2");

    expect(postMock).toHaveBeenCalledWith("/system/dictionaries/gender/items", {
      id: undefined,
      dictCode: "gender",
      label: "未设置",
      value: "0",
      status: 1,
      sort: 3,
      tagType: "info",
    });
    expect(deleteMock).toHaveBeenCalledWith(
      "/system/dictionaries/gender/items",
      { params: { ids: "item-1,item-2" } }
    );
  });

  it("preserves ApiError values for business handling", async () => {
    const error = Object.assign(new Error("Dictionary code already exists"), {
      name: "ApiError",
      code: "DICTIONARY_CODE_EXISTS",
      status: 409,
    });
    postMock.mockRejectedValue(error);

    await expect(dictionaryService.create({
      name: "用户性别",
      dictCode: "gender",
      status: 1,
    })).rejects.toBe(error);
  });

  it("uses PUT for dictionary updates", async () => {
    putMock.mockResolvedValue(undefined);

    await dictionaryService.update("type-1", {
      name: "用户性别",
      dictCode: "gender",
      status: 1,
    });

    expect(putMock).toHaveBeenCalledWith(
      "/system/dictionaries/type-1",
      expect.objectContaining({ id: undefined, dictCode: "gender" })
    );
  });
});
