import { describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import type { FormItemRule } from "element-plus";
import type { WebsiteAttraction, WebsiteTemplate } from "@/types/website";

vi.mock("vue-i18n", () => ({
  useI18n: () => ({ t: (key: string, values?: unknown) => (values ? `${key}:${JSON.stringify(values)}` : key) }),
}));

const { useWebsiteAttractionRules, useWebsiteTemplateRules } = await import("./useWebsiteConfigRules");

/** Runs the custom validators of one field and returns the first error message. */
function validate(rules: FormItemRule[] | FormItemRule | undefined, value: unknown) {
  let message: string | undefined;
  for (const rule of [rules ?? []].flat()) {
    rule.validator?.(rule, value, (error?: string | Error) => {
      message ??= error instanceof Error ? error.message : error;
    }, {}, {});
  }
  return message;
}

function attraction(patch: Partial<WebsiteAttraction> = {}) {
  return ref({ chargeable: true, price: "0.00", descriptionZh: "", descriptionEn: "", ...patch } as WebsiteAttraction);
}

describe("website attraction price rules", () => {
  it.each([
    ["0", true],
    ["0.00", true],
    ["12.5", true],
    ["9999999999.99", true],
    ["01", false],
    ["1.234", false],
    ["12345678901", false],
    ["", false],
  ])("checks chargeable price %j", (price, valid) => {
    const rules = useWebsiteAttractionRules(attraction()).value;
    expect([rules.price].flat()[0]).toMatchObject({ required: true });
    expect(validate(rules.price, price)).toBe(valid ? undefined : "websiteConfig.attractions.priceInvalid");
  });

  it("does not require or validate the price of free attractions", () => {
    const rules = useWebsiteAttractionRules(attraction({ chargeable: false })).value;
    expect([rules.price].flat()[0]).toMatchObject({ required: false });
    expect(validate(rules.price, "1.234")).toBeUndefined();
  });
});

describe("website bilingual copy rules", () => {
  it("only allows city and attraction variables in attraction copy, used identically in both languages", () => {
    const record = attraction({ descriptionZh: "游览{attraction}", descriptionEn: "Visit {attraction} in {city}" });
    const rules = useWebsiteAttractionRules(record).value;
    expect(validate(rules.descriptionZh, "{hotel}")).toBe(
      'websiteConfig.validation.unsupportedVariable:{"variable":"hotel"}',
    );
    expect(validate(rules.descriptionZh, record.value.descriptionZh)).toBe("websiteConfig.validation.templateVariablesMatch");
    record.value.descriptionZh = "{city}游览{attraction}";
    expect(validate(rules.descriptionZh, record.value.descriptionZh)).toBeUndefined();
    expect(validate(rules.descriptionEn, record.value.descriptionEn)).toBeUndefined();
  });

  it("re-evaluates template variables against the currently selected template code", () => {
    const record = ref({ code: "after-breakfast", name: "", zh: "早餐后游览{attraction}", en: "Visit {attraction}" } as WebsiteTemplate);
    const rules = useWebsiteTemplateRules(record).value;
    expect(validate(rules.zh, record.value.zh)).toBeUndefined();
    record.value.code = "free-time";
    expect(validate(rules.zh, record.value.zh)).toBe(
      'websiteConfig.validation.templateVariable:{"code":"free-time","variable":"attraction"}',
    );
  });
});
