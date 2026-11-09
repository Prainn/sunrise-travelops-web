import { computed, type Ref } from "vue";
import { useI18n, type Composer } from "vue-i18n";
import type { FormItemRule, FormRules } from "element-plus";
import type {
  WebsiteAttraction,
  WebsiteCity,
  WebsiteConfigHotel,
  WebsitePattern,
  WebsiteRoute,
  WebsiteSkeleton,
  WebsiteTemplate,
} from "@/types/website";

type Translate = Composer["t"];

const TEMPLATE_VARIABLES = new Map<string, readonly string[]>([
  ["arrival-basic", ["city"]],
  ["after-breakfast", ["attraction"]],
  ["later-continue", ["attraction"]],
  ["upon-arrival", ["city", "attraction"]],
  ["free-time", []],
  ["departure-basic", ["city"]],
  ["overnight", ["city"]],
  ["guide", ["language"]],
  ["private-driver", []],
  ["hsr-second-class", ["city"]],
  ["hotel-breakfast", ["hotel"]],
  ["first-entry-ticket", ["attraction"]],
  ["included-service", ["service"]],
  ["restaurant-recommendation", ["restaurant_or_meal"]],
  ["optional-not-included", ["component"]],
  ["hotel-substitution", []],
  ["peak-season", []],
  ["no-shopping", []],
]);

/**
 * 返回所选服务用途或自定义文案的可用变量。
 */
export function getWebsiteTemplateVariables(code: string): readonly string[] {
  return TEMPLATE_VARIABLES.get(code) ?? ["city", "attraction"];
}

function requiredText(t: Translate, field: string, max = 150): FormItemRule[] {
  return [
    {
      required: true,
      whitespace: true,
      message: t("resource.fieldRequired", { field: t(field) }),
      trigger: "blur",
    },
    {
      max,
      message: t("websiteConfig.validation.maxLength", { field: t(field), max }),
      trigger: "blur",
    },
  ];
}

function nameRules(t: Translate) {
  return {
    nameZh: requiredText(t, "common.nameZh"),
    nameEn: requiredText(t, "common.nameEn"),
  };
}

function cityRules(t: Translate, field = "websiteConfig.city"): FormItemRule[] {
  return [{ required: true, message: t("websiteConfig.validation.selectRequired", { field: t(field) }), trigger: "change" }];
}

export function useWebsiteCityRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsiteCity>>(() => nameRules(t));
}

export function useWebsiteHotelRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsiteConfigHotel>>(() => ({
    ...nameRules(t),
    nameEn: [{
      max: 150,
      message: t("websiteConfig.validation.maxLength", { field: t("common.nameEn"), max: 150 }),
      trigger: "blur",
    }],
    cityId: cityRules(t, "common.cityRegion"),
    price: [{
      validator: (_rule, value: string, callback) => {
        callback(typeof value === "string" && /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)
          ? undefined
          : new Error(t("websiteConfig.hotels.priceInvalid")));
      },
      trigger: "blur",
    }],
  }));
}

const VARIABLE_PATTERN = /\{([^{}]+)\}/g;

function variableSet(text: string) {
  return [...new Set([...text.matchAll(VARIABLE_PATTERN)].map(match => match[1]))].sort().join(",");
}

/**
 * 双语文案必填并限长；变量须受支持，且中英文使用相同变量。
 */
function bilingualCopyRules(
  t: Translate,
  field: string,
  options: { variables: () => readonly string[]; texts: () => [string, string] | undefined; code?: () => string },
): FormItemRule[] {
  return [
    ...requiredText(t, field, 2000),
    {
      validator: (_rule, value: string, callback) => {
        const variables = options.variables();
        const code = options.code?.() ?? "";
        for (const match of value.matchAll(VARIABLE_PATTERN)) {
          const variable = match[1] ?? "";
          if (!variables.includes(variable)) {
            return callback(new Error(code
              ? t("websiteConfig.validation.templateVariable", { code, variable })
              : t("websiteConfig.validation.unsupportedVariable", { variable })));
          }
        }
        const texts = options.texts();
        if (texts && variableSet(texts[0]) !== variableSet(texts[1])) {
          return callback(new Error(t("websiteConfig.validation.templateVariablesMatch")));
        }
        callback();
      },
      trigger: "blur",
    },
  ];
}

export function useWebsiteAttractionRules(record: Ref<WebsiteAttraction | undefined>) {
  const { t } = useI18n();
  const attractionCopy = {
    variables: () => ["city", "attraction"],
    texts: () => record.value && [record.value.descriptionZh, record.value.descriptionEn] as [string, string],
  };
  return computed<FormRules<WebsiteAttraction>>(() => ({
    ...nameRules(t),
    cityId: cityRules(t, "common.cityRegion"),
    price: [{
      required: Boolean(record.value?.chargeable),
      validator: (_rule, value: string, callback) => {
        callback(!record.value?.chargeable || (typeof value === "string" && /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value))
          ? undefined
          : new Error(t("websiteConfig.attractions.priceInvalid")));
      },
      trigger: "blur",
    }],
    descriptionZh: bilingualCopyRules(t, "websiteConfig.templates.zh", attractionCopy),
    descriptionEn: bilingualCopyRules(t, "websiteConfig.templates.en", attractionCopy),
  }));
}

export function useWebsiteRouteRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsiteRoute>>(() => ({
    ...transportRules(t),
    nameZh: requiredText(t, "websiteConfig.routes.nameZh"),
    nameEn: requiredText(t, "websiteConfig.routes.nameEn"),
    fromCityId: cityRules(t, "websiteConfig.routes.fromCity"),
    toCityId: cityRules(t, "websiteConfig.routes.toCity"),
  }));
}

export function useWebsitePatternRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsitePattern>>(() => ({
    ...nameRules(t),
    cityId: cityRules(t, "common.cityRegion"),
    attractionIds: [{ type: "array", max: 200, message: t("websiteConfig.validation.maxAttractions"), trigger: "change" }],
  }));
}

export function useWebsiteSkeletonRules(record: Ref<WebsiteSkeleton | undefined>) {
  const { t } = useI18n();
  return computed<FormRules<WebsiteSkeleton>>(() => {
    const rules: FormRules<WebsiteSkeleton> = {
      ...nameRules(t),
      days: [{ type: "array", required: true, min: 1, max: 365, message: t("websiteConfig.validation.skeletonDays"), trigger: "change" }],
    };
    record.value?.days.forEach((_day, index) => {
      rules[`days.${index}.cityId`] = cityRules(t);
    });
    return rules;
  });
}

export function useWebsiteTemplateRules(record: Ref<WebsiteTemplate | undefined>) {
  const { t } = useI18n();
  const templateCopy = {
    variables: () => getWebsiteTemplateVariables(record.value?.code ?? ""),
    texts: () => record.value && [record.value.zh, record.value.en] as [string, string],
    code: () => record.value?.code ?? "",
  };
  return computed<FormRules<WebsiteTemplate>>(() => ({
    name: requiredText(t, "websiteConfig.templates.name"),
    code: requiredText(t, "websiteConfig.templates.code", 100),
    zh: bilingualCopyRules(t, "websiteConfig.templates.zh", templateCopy),
    en: bilingualCopyRules(t, "websiteConfig.templates.en", templateCopy),
  }));
}

export function transportRules(t: (key: string) => string): FormRules {
  return {
    vehicleType: [{ max: 100, message: t("websiteReport.vehicleInvalid"), trigger: "change" }],
    vehicleOptions: [{ validator: (_rule, values: {vehicleType: string | null | undefined; durationMinutes: number | null}[], callback) => {
      const trimmed = values.map(value => (value.vehicleType ?? "").trim());
      callback(trimmed.length <= 100 && trimmed.every(value => value.length >= 1 && value.length <= 100) && new Set(trimmed).size === trimmed.length
        && values.every(value => value.durationMinutes == null || (Number.isInteger(value.durationMinutes) && value.durationMinutes >= 1 && value.durationMinutes <= 525600))
        ? undefined : new Error(t("websiteReport.vehicleOptionsInvalid")));
    }, trigger: "change" }],
    distanceKm: [{ validator: (_rule, value: string | null | undefined, callback) => {
      callback(value == null || /^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)
        ? undefined : new Error(t("websiteReport.distanceInvalid")));
    }, trigger: "blur" }],
    durationMinutes: [{ validator: (_rule, value: number | null | undefined, callback) => {
      callback(value == null || (Number.isInteger(value) && value >= 1 && value <= 525600)
        ? undefined : new Error(t("websiteReport.durationInvalid")));
    }, trigger: "change" }],
  };
}
