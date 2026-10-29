import { describe, expect, it, vi } from "vitest";
import { isReactive, reactive } from "vue";
import { websiteInquiryInput } from "@/services/website.service";
import { cloneWebsiteDraft, emptyInquiry } from "./options";

vi.mock("@/api/request", () => ({
  ApiError: class extends Error {},
  request: {},
}));

describe("website draft cloning", () => {
  it("copies a reactive draft without sharing its nested arrays", () => {
    const draft = reactive({ ...emptyInquiry(), destinations: ["昆明"] });

    const copy = cloneWebsiteDraft(draft);
    copy.destinations.push("大理");

    expect(isReactive(copy)).toBe(false);
    expect(draft.destinations).toEqual(["昆明"]);
    expect(copy.destinations).toEqual(["昆明", "大理"]);
  });

  it("clones a plain object spread from a reactive draft with nested proxies", () => {
    const draft = reactive({ vehicleOptions: [{ vehicleType: "5", durationMinutes: 60 }] });

    const copy = cloneWebsiteDraft({ ...draft, distanceKm: "50" });
    copy.vehicleOptions[0]!.durationMinutes = 80;

    expect(isReactive(copy.vehicleOptions)).toBe(false);
    expect(draft.vehicleOptions[0]?.durationMinutes).toBe(60);
  });

  it("clones mapped inquiry input containing reactive destinations", () => {
    const draft = reactive({ ...emptyInquiry(), destinations: ["昆明"] });

    const copy = cloneWebsiteDraft(websiteInquiryInput(draft));
    copy.destinations.push("大理");

    expect(draft.destinations).toEqual(["昆明"]);
    expect(copy).toHaveProperty("ownerId", undefined);
  });
});
