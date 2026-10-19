<template>
  <section class="surface-muted p-4 flex flex-col gap-3">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.attractions") }}
      </h4>
      <div v-if="editable" class="flex flex-wrap gap-2">
        <el-select
          v-model="selectedId"
          autocomplete="new-password"
          filterable
          clearable
          :placeholder="$t('websiteItineraryUi.selectAttraction')"
          class="w-[240px]!"
        >
          <el-option
            v-for="attraction in config.attractions.filter((item) => item.status === 'enabled')"
            :key="attraction.id"
            :value="attraction.id"
            :label="attraction.nameZh"
          />
        </el-select>
        <el-button @click="addSelected">
          {{ $t("websiteItineraryUi.addSelected") }}
        </el-button>
        <el-button @click="addManual">
          {{ $t("websiteItineraryUi.manualAttraction") }}
        </el-button>
      </div>
    </div>
    <FeedbackState
      v-if="!day.items.length"
      :title="$t('websiteItineraryUi.noAttractions')"
    />
    <div
      v-for="(item, index) in day.items"
      :key="item.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="flex flex-wrap gap-3 justify-between items-center mb-3">
        <span class="text-strong">
          {{ index + 1 }}. {{ item.nameZh || $t("websiteItineraryUi.manualAttractionOrComponent") }}
        </span>
        <div v-if="editable">
          <el-button :disabled="index === 0" link @click="move(index, -1)">
            {{ $t("websiteItineraryUi.moveUp") }}
          </el-button>
          <el-button :disabled="index === day.items.length - 1" link @click="move(index, 1)">
            {{ $t("websiteItineraryUi.moveDown") }}
          </el-button>
          <el-button link type="danger" @click="day.items.splice(index, 1)">
            {{ $t("websiteItineraryUi.remove") }}
          </el-button>
        </div>
      </div>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.nameZh')">
          <el-input v-model="item.nameZh" :disabled="Boolean(item.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.nameEn')">
          <el-input v-model="item.nameEn" :disabled="Boolean(item.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.coreCopyZh')">
          <el-input
            v-model="item.descriptionZh"
            type="textarea"
            :rows="3"
            :disabled="Boolean(item.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.coreCopyEn')">
          <el-input
            v-model="item.descriptionEn"
            type="textarea"
            :rows="3"
            :disabled="Boolean(item.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.appears')">
          <el-switch v-model="item.appears" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="item.feeState" />
        </el-form-item>
      </div>
      <el-button v-if="editable && item.attractionId" link @click="item.attractionId = null">
        {{ $t("websiteItineraryUi.convertToManualCopy") }}
      </el-button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessage } from "element-plus";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
const { t } = useI18n();
const selectedId = ref("");
function addSelected() {
  const attraction = props.config.attractions.find((item) => item.id === selectedId.value);
  if (!attraction) return;
  const template = props.config.templates.find(
    (item) => item.code === attraction.copyKey && item.status === "enabled",
  );
  if (!template) {
    ElMessage.error(t("websiteItineraryUi.attractionCopyMissing"));
    return;
  }
  day.value.items.push({
    id: crypto.randomUUID(),
    attractionId: attraction.id,
    nameZh: attraction.nameZh,
    nameEn: attraction.nameEn,
    descriptionZh: template.zh,
    descriptionEn: template.en,
    appears: true,
    feeState: attraction.kind === "attraction" && attraction.chargeable ? "INCLUDED" : "UNKNOWN",
  });
  selectedId.value = "";
}
function addManual() {
  day.value.items.push({
    id: crypto.randomUUID(),
    attractionId: null,
    nameZh: "",
    nameEn: "",
    descriptionZh: "",
    descriptionEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
function move(index: number, direction: number) {
  const item = day.value.items.splice(index, 1)[0];
  if (item) day.value.items.splice(index + direction, 0, item);
}
</script>
