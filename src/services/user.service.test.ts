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

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key }));

import { request } from "@/api/request";
import { userService } from "./user.service";

const getMock = vi.mocked(request.get);
const postMock = vi.mocked(request.post);
const putMock = vi.mocked(request.put);
const deleteMock = vi.mocked(request.delete);

describe("userService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the unified user page and maps query parameters", async () => {
    const page = {
      list: [{ id: "user-1", username: "admin", nickname: "admin" }],
      total: 1,
      page: 1,
      pageSize: 10,
    };
    getMock.mockResolvedValue(page);

    await expect(userService.getPage({
      page: 1,
      pageSize: 10,
      keywords: " admin ",
      status: 1,
      deptId: 1,
      roleId: "role-1",
      createTime: ["2026-09-01", "2026-09-02"],
    })).resolves.toEqual(page);

    expect(getMock).toHaveBeenCalledWith("/users", {
      params: {
        page: 1,
        pageSize: 10,
        keywords: "admin",
        status: 1,
        deptId: 1,
        roleId: "role-1",
        createTime: ["2026-09-01", "2026-09-02"],
      },
    });
  });

  it("localizes seeded role option labels from the backend", async () => {
    getMock.mockResolvedValue([
      { value: "role-1", label: "Inquiry Coordinator" },
      { value: "role-2", label: "Operations Coordinator" },
      { value: "role-3", label: "自定义角色" },
    ]);

    await expect(userService.getRoleOptions()).resolves.toEqual([
      { value: "role-1", label: "user.roles.inquiryCoordinator" },
      { value: "role-2", label: "user.roles.operationsCoordinator" },
      { value: "role-3", label: "自定义角色" },
    ]);
    expect(getMock).toHaveBeenCalledWith("/users/options/roles");
  });

  it("uses user-management endpoints for departments, form data, deletion, and password reset", async () => {
    getMock.mockResolvedValue(undefined);
    postMock.mockResolvedValue(undefined);
    deleteMock.mockResolvedValue(undefined);

    await userService.getDepartmentOptions();
    await userService.getFormData("user-1");
    await userService.deleteByIds("user-1,user-2");
    await userService.resetPassword("user-1", "secret123");

    expect(getMock).toHaveBeenNthCalledWith(1, "/users/options/departments");
    expect(getMock).toHaveBeenNthCalledWith(2, "/users/user-1");
    expect(deleteMock).toHaveBeenCalledWith("/users", { params: { ids: "user-1,user-2" } });
    expect(postMock).toHaveBeenCalledWith("/users/user-1/reset-password", {
      password: "secret123",
    });
  });

  it("normalizes create and update payloads for the backend", async () => {
    postMock.mockResolvedValue({ id: "user-1", temporaryPassword: "Temp123456" });
    putMock.mockResolvedValue(undefined);

    await userService.create({
      username: " operations_li ",
      nickname: " 李明 ",
      deptId: 3,
      roleIds: ["role-1"],
      status: 1,
      email: " operations.li@sunrise.local ",
      password: " secret123 ",
    });
    await userService.update("user-1", {
      username: "ignored",
      nickname: " 李明 ",
      deptId: 3,
      roleIds: ["role-1"],
      status: 1,
    });

    expect(postMock).toHaveBeenCalledWith("/users", expect.objectContaining({
      username: "operations_li",
      nickname: "李明",
      email: "operations.li@sunrise.local",
      password: "secret123",
    }));
    expect(putMock).toHaveBeenCalledWith(
      "/users/user-1",
      expect.not.objectContaining({ username: expect.anything(), password: expect.anything() })
    );
  });

  it("preserves ApiError values for business handling", async () => {
    const error = Object.assign(new Error("Username exists"), {
      name: "ApiError",
      code: "USERNAME_EXISTS",
      status: 409,
      details: { username: ["用户名已存在"] },
    });
    postMock.mockRejectedValue(error);

    await expect(userService.create({
      username: "admin",
      nickname: "admin",
      deptId: 1,
      roleIds: ["role-1"],
      status: 1,
    })).rejects.toBe(error);
  });
});
