import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/api/request", () => ({ request: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
import { request } from "@/api/request";
import { userService } from "./user.service";
import type { UserForm } from "@/types/user";

beforeEach(() => { vi.clearAllMocks(); });
describe("user tour code payloads", () => {
  const form: UserForm = {
    username: "test_user", nickname: "Cathy李明", englishName: "Cathy", tourCode: " custom ",
    identities: [{ scope: "website", deptId: 7, roleIds: [] }],
  };
  it("sends the manually edited code without recomputing it", async () => {
    await userService.create(form);
    expect(request.post).toHaveBeenCalledWith("/users", expect.objectContaining({ tourCode: "CUSTOM" }));
    await userService.update("user-id", form);
    expect(request.put).toHaveBeenCalledWith("/users/user-id", expect.objectContaining({ tourCode: "CUSTOM" }));
  });
  it("omits headquarters codes in create and edit, preserving hidden historical values on the server", async () => {
    const hq: UserForm = { ...form, identities: [{ scope: "headquarters", deptId: 1, roleIds: [] }] };
    await userService.create(hq);
    await userService.update("hq-id", hq);
    expect(vi.mocked(request.post).mock.calls[0]?.[1]).not.toHaveProperty("tourCode");
    expect(vi.mocked(request.put).mock.calls[0]?.[1]).not.toHaveProperty("tourCode");
  });
  it("uses the dedicated suggestion endpoint without querying user pages", async () => {
    const input = { englishName: "Andrew", nickname: "Andrew朱相龙" };
    await userService.suggestTourCode(input);
    expect(request.get).toHaveBeenCalledExactlyOnceWith("/users/tour-code-suggestion", { params: input });
  });
});
