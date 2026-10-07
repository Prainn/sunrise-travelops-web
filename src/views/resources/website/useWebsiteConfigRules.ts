import { computed, type Ref } from "vue";
import { useI18n, type Composer } from "vue-i18n";
import type { FormItemRule, FormRules } from "element-plus";
import type {
  WebsiteAttraction,
  WebsiteCity,
  WebsiteConfig,
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
  ["guide", ["language", "service_scope"]],
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
    nameZh: requiredText(t, "websiteConfig.nameZh"),
    nameEn: requiredText(t, "websiteConfig.nameEn"),
  };
}

function cityRules(t: Translate, config: () => WebsiteConfig, field = "websiteConfig.city"): FormItemRule[] {
  return [
    {
      required: true,
      message: t("websiteConfig.validation.selectRequired", { field: t(field) }),
      trigger: "change",
    },
    {
      validator: (_rule, value: string, callback) => {
        callback(value && !config().cities.some((city) => city.id === value)
          ? new Error(t("websiteConfig.validation.cityMissing"))
          : undefined);
      },
      trigger: "change",
    },
  ];
}

export function useWebsiteCityRules() {
  const { t } = useI18n();
  return computed<FormRules<WebsiteCity>>(() => nameRules(t));
}

export function useWebsiteAttractionRules(config: () => WebsiteConfig, record: Ref<WebsiteAttraction | undefined>) {
  const { t } = useI18n();
  return computed<FormRules<WebsiteAttraction>>(() => ({
    ...nameRules(t),
    cityId: cityRules(t, config, "websiteConfig.belongsToCity"),
    copyKey: requiredText(t, "websiteConfig.attractions.copyKey", 100),
    parentId: [{
      validator: (_rule, value: string | null, callback) => {
        const item = record.value;
        if (!value || !item) return callback();
        const attractions = new Map(config().attractions.map((row) => [row.id, row]));
        let parent = attractions.get(value);
        if (!parent || parent.cityId !== item.cityId) {
          return callback(new Error(t("websiteConfig.validation.parentSameCity")));
        }
        const visited = new Set([item.id]);
        while (parent) {
          if (visited.has(parent.id)) return callback(new Error(t("websiteConfig.validation.parentCycle")));
          visited.add(parent.id);
          if (!parent.parentId) break;
          parent = attractions.get(parent.parentId);
          if (!parent) return callback(new Error(t("websiteConfig.validation.parentSameCity")));
        }
        callback();
      },
      trigger: "change",
    }],
  }));
}

export function useWebsiteRouteRules(config: () => WebsiteConfig, record: Ref<WebsiteRoute | undefined>) {
  const { t } = useI18n();
  return computed<FormRules<WebsiteRoute>>(() => ({
    nameZh: requiredText(t, "websiteConfig.routes.nameZh"),
    nameEn: requiredText(t, "websiteConfig.routes.nameEn"),
    fromCityId: cityRules(t, config, "websiteConfig.routes.fromCity"),
    toCityId: [
      ...cityRules(t, config, "websiteConfig.routes.toCity"),
      {
        validator: (_rule, value: string, callback) => {
          callback(value && value === record.value?.fromCityId
            ? new Error(t("websiteConfig.validation.routeDistinct"))
            : undefined);
        },
        trigger: "change",
      },
    ],
  }));
}

export function useWebsitePatternRules(config: () => WebsiteConfig, record: Ref<WebsitePattern | undefined>) {
  const { t } = useI18n();
  return computed<FormRules<WebsitePattern>>(() => ({
    ...nameRules(t),
    cityId: cityRules(t, config, "websiteConfig.belongsToCity"),
    attractionIds: [
      { type: "array", max: 200, message: t("websiteConfig.validation.maxAttractions"), trigger: "change" },
      {
        validator: (_rule, value: string[], callback) => {
          const cityId = record.value?.cityId;
          callback(value.some((id) => !config().attractions.some((item) => item.id === id && item.cityId === cityId))
            ? new Error(t("websiteConfig.validation.patternAttractions"))
            : undefined);
        },
        trigger: "change",
      },
    ],
  }));
}

export function useWebsiteSkeletonRules(config: () => WebsiteConfig, record: Ref<WebsiteSkeleton | undefined>) {
  const { t } = useI18n();
  return computed<FormRules<WebsiteSkeleton>>(() => {
    const rules: FormRules<WebsiteSkeleton> = {
      ...nameRules(t),
      days: [{ type: "array", required: true, min: 1, max: 365, message: t("websiteConfig.validation.skeletonDays"), trigger: "change" }],
    };
    record.value?.days.forEach((day, index) => {
      rules[`days.${index}.cityId`] = cityRules(t, config);
      rules[`days.${index}.patternId`] = [{
        validator: (_rule, value: string | null, callback) => {
          callback(value && !config().patterns.some((pattern) => pattern.id === value && pattern.cityId === day.cityId)
            ? new Error(t("websiteConfig.validation.patternCity"))
            : undefined);
        },
        trigger: "change",
      }];
    });
    return rules;
  });
}

export function useWebsiteTemplateRules(config: () => WebsiteConfig, record: Ref<WebsiteTemplate | undefined>) {
  const { t } = useI18n();
  const copyRules = (field: string): FormItemRule[] => [
    ...requiredText(t, field, 20000),
    {
      validator: (_rule, value: string, callback) => {
        const code = record.value?.code ?? "";
        const variables = getWebsiteTemplateVariables(code);
        for (const match of value.matchAll(/\{([^{}]+)\}/g)) {
          if (!variables.includes(match[1])) {
            return callback(new Error(t("websiteConfig.validation.templateVariable", { code, variable: match[1] })));
          }
        }
        callback();
      },
      trigger: "blur",
    },
  ];
  return computed<FormRules<WebsiteTemplate>>(() => ({
    name: requiredText(t, "websiteConfig.templates.name"),
    code: [
      ...requiredText(t, "websiteConfig.templates.code", 100),
      {
        validator: (_rule, value: string, callback) => {
          callback(config().templates.some((template) => template.id !== record.value?.id && template.code === value)
            ? new Error(t("websiteConfig.validation.templateCodeDuplicate"))
            : undefined);
        },
        trigger: "change",
      },
    ],
    zh: copyRules("websiteConfig.templates.zh"),
    en: copyRules("websiteConfig.templates.en"),
  }));
}
