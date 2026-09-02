import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/api/request", () => {
  class ApiRequestError extends Error {
    constructor(
      message: string,
      readonly status: number,
      readonly code: string,
      readonly details: Record<string, unknown> = {}
    ) {
      super(message);
    }
  }

  return { ApiRequestError, request: vi.fn() };
});

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));

import { ApiRequestError, request } from "@/api/request";
import { dictionaryService } from "./dictionary.service";

const requestMock = vi.mocked(request);

describe("dictionaryService", () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it("maps the dictionary page response and query to the backend contract", async () => {
    requestMock.mockResolvedValue({
      list: [{ id: "type-1", name: "用户性别", dictCode: "gender", status: 1 }],
      total: 1,
      page: 2,
      pageSize: 10,
    });

    await expect(dictionaryService.getPage({
      pageNum: 2,
      pageSize: 10,
      keywords: " gender ",
      status: 1,
    })).resolves.toEqual({
      list: [{ id: "type-1", name: "用户性别", dictCode: "gender", status: 1 }],
      total: 1,
    });
    expect(requestMock).toHaveBeenCalledWith(
      "/system/dictionaries?pageNum=2&pageSize=10&keywords=gender&status=1"
    );
  });

  it("loads enabled options from the login-only dictionary item endpoint", async () => {
    requestMock.mockResolvedValue([
      { value: "1", label: "男", tagType: "primary" },
      { value: "2", label: "女", tagType: "danger" },
    ]);

    await expect(dictionaryService.getDictItems("gender")).resolves.toHaveLength(2);
    expect(requestMock).toHaveBeenCalledWith(
      "/system/dictionaries/gender/items/options"
    );
  });

  it("sends normalized item form data and comma-separated delete IDs", async () => {
    requestMock.mockResolvedValue(undefined);

    await dictionaryService.createDictItem("gender", {
      label: "  未设置  ",
      value: " 0 ",
      status: 1,
      sort: 3,
      tagType: "info",
    });
    await dictionaryService.deleteDictItems("gender", "item-1,item-2");

    expect(requestMock).toHaveBeenNthCalledWith(1, "/system/dictionaries/gender/items", {
      method: "POST",
      body: {
        id: undefined,
        dictCode: "gender",
        label: "未设置",
        value: "0",
        status: 1,
        sort: 3,
        tagType: "info",
      },
    });
    expect(requestMock).toHaveBeenNthCalledWith(
      2,
      "/system/dictionaries/gender/items?ids=item-1%2Citem-2",
      { method: "DELETE" }
    );
  });

  it("maps stable backend error codes to localized service messages", async () => {
    requestMock.mockRejectedValue(
      new ApiRequestError("Dictionary code already exists", 409, "DICTIONARY_CODE_EXISTS")
    );

    await expect(dictionaryService.create({
      name: "用户性别",
      dictCode: "gender",
      status: 1,
    })).rejects.toMatchObject({
      message: "service.dictionary.codeExists",
      cause: expect.objectContaining({ code: "DICTIONARY_CODE_EXISTS" }),
    });
  });
});
