<template>
  <section class="surface-muted p-4 flex flex-col gap-3">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.attractions") }}
      </h4>
      <el-button
        v-if="editable"
        link
        type="primary"
        @click="emit('add')"
      >
        {{ $t("itineraryWorkspace.actions.attraction") }}
      </el-button>
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
          {{ index + 1 }}. {{ itemName(item) || $t("websiteItineraryUi.manualAttractionOrComponent") }}
          <el-tag
            v-if="configKind(item)"
            size="small"
            effect="plain"
            class="ml-1"
          >
            {{ $t(`websiteItineraryUi.attractionKinds.${configKind(item)}`) }}
          </el-tag>
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
import { useI18n } from "vue-i18n";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { WebsiteConfig, WebsiteDay, WebsiteItem } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean }>();
const emit = defineEmits<{ add: [] }>();
const { locale } = useI18n();
function itemName(item: WebsiteItem) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function configKind(item: WebsiteItem) {
  return props.config.attractions.find((attraction) => attraction.id === item.attractionId)?.kind;
}
function move(index: number, direction: number) {
  const item = day.value.items.splice(index, 1)[0];
  if (item) day.value.items.splice(index + direction, 0, item);
}
</script>
