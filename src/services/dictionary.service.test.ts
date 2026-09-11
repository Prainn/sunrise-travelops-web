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

describe("dictionaryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes list query parameters", async () => {
    getMock.mockResolvedValue({ list: [], total: 0, page: 2, pageSize: 10 });

    await dictionaryService.getPage({
      page: 2,
      pageSize: 10,
      keyword: " gender ",
      status: 1,
    });

    expect(getMock).toHaveBeenCalledWith("/system/dictionaries", {
      params: {
        page: 2,
        pageSize: 10,
        keyword: "gender",
        status: 1,
      },
    });
  });

  it("normalizes dictionary item input before saving", async () => {
    postMock.mockResolvedValue(undefined);

    await dictionaryService.createDictItem("gender", {
      label: "  未设置  ",
      value: " 0 ",
      status: 1,
      sort: 3,
      tagType: "info",
    });

    expect(postMock).toHaveBeenCalledWith("/system/dictionaries/gender/items", {
      id: undefined,
      dictCode: "gender",
      label: "未设置",
      value: "0",
      status: 1,
      sort: 3,
      tagType: "info",
    });
  });
});
