import { describe, expect, it } from "vitest";
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { ElForm, ElFormItem, ElOption, ElSelect } from "element-plus";
import { createI18n } from "vue-i18n";
import RemoteSelect from "./index.vue";

async function render(formDisabled: boolean, disabled?: boolean) {
  const app = createSSRApp({
    render: () => h(ElForm, { disabled: formDisabled }, {
      default: () => h(ElFormItem, {}, {
        default: () => h(RemoteSelect, {
          modelValue: "operator-id",
          selectedLabel: "Operator",
          loadOptions: async () => ({ list: [], total: 0 }),
          ...(disabled === undefined ? {} : { disabled }),
        }),
      }),
    }),
  });
  app.use(createI18n({ legacy: false, locale: "en", messages: { en: {} }, missingWarn: false, fallbackWarn: false }));
  app.component("ElSelect", ElSelect);
  app.component("ElOption", ElOption);
  return renderToString(app);
}

describe("RemoteSelect form disabled state", () => {
  it("disables its input inside a readonly or saving form", async () => {
    expect(await render(true)).toMatch(/<input\b[^>]*\sdisabled(?:[\s=>])/);
  });

  it("allows selection in an editable form", async () => {
    expect(await render(false)).not.toMatch(/<input\b[^>]*\sdisabled(?:[\s=>])/);
  });

  it("retains an explicitly disabled selector in an editable form", async () => {
    expect(await render(false, true)).toMatch(/<input\b[^>]*\sdisabled(?:[\s=>])/);
  });
});
