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
 * 返回所选服务用途或自定义景点正文的可用变量。
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
    cityId: cityRules(t, "websiteConfig.belongsToCity"),
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

export function useWebsiteAttractionRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsiteAttraction>>(() => ({
    ...nameRules(t),
    cityId: cityRules(t, "websiteConfig.belongsToCity"),
    copyKey: requiredText(t, "websiteConfig.attractions.copyKey", 100),
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
    cityId: cityRules(t, "websiteConfig.belongsToCity"),
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
  const copyRules = (field: string): FormItemRule[] => [
    ...requiredText(t, field, 20000),
    {
      validator: (_rule, value: string, callback) => {
        const code = record.value?.code ?? "";
        const variables = getWebsiteTemplateVariables(code);
        for (const match of value.matchAll(/\{([^{}]+)\}/g)) {
          const variable = match[1] ?? "";
          if (!variables.includes(variable)) {
            return callback(new Error(t("websiteConfig.validation.templateVariable", { code, variable })));
          }
        }
        callback();
      },
      trigger: "blur",
    },
  ];
  return computed<FormRules<WebsiteTemplate>>(() => ({
    name: requiredText(t, "websiteConfig.templates.name"),
    code: requiredText(t, "websiteConfig.templates.code", 100),
    zh: copyRules("websiteConfig.templates.zh"),
    en: copyRules("websiteConfig.templates.en"),
  }));
}

export function transportRules(t: (key: string) => string): FormRules {
  return {
    vehicleType: [{ max: 100, message: t("websiteReport.vehicleInvalid"), trigger: "change" }],
    vehicleOptions: [{ validator: (_rule, values: {vehicleType: string; durationMinutes: number | null}[], callback) => {
      const trimmed = values.map(value => value.vehicleType.trim());
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
