import { describe, expect, it, vi } from "vitest";

vi.mock("@/lang/utils", () => ({ translate: (key: string) => key, translateIfExists: () => undefined }));

import { ApiError } from "@/api/request";
import { firstValidationProp, locateValidationError } from "./validation-error";

const validation = (details: Record<string, string[]>) =>
  new ApiError("输入有误", { code: "VALIDATION_ERROR", status: 400, details });

describe("server validation field locating", () => {
  it("maps the first server field path to the closest form prop", () => {
    const error = validation({ "contacts[0].phone": ["格式不正确"], name: ["不能为空"] });
    expect(firstValidationProp(error, ["name", "contacts"])).toBe("contacts");
    expect(firstValidationProp(validation({ "items.2.price": ["无效"] }), ["items"])).toBe("items");
  });

  it("skips unknown paths and ignores non-validation errors", () => {
    expect(firstValidationProp(validation({ unknown: ["x"], name: ["y"] }), ["name"])).toBe("name");
    expect(firstValidationProp(validation({ "extras[key]": ["x"], name: ["y"] }), ["name"])).toBe("name");
    const conflict = new ApiError("冲突", { code: "CITY_NAME_EXISTS", status: 409, details: { name: ["x"] } });
    expect(firstValidationProp(conflict, ["name"])).toBeUndefined();
    expect(firstValidationProp(new Error("boom"), ["name"])).toBeUndefined();
  });

  it("scrolls the form to the located field", () => {
    const form = { scrollToField: vi.fn() };
    locateValidationError(form, validation({ name: ["不能为空"] }), ["code", "name"]);
    expect(form.scrollToField).toHaveBeenCalledWith("name");
  });
});
