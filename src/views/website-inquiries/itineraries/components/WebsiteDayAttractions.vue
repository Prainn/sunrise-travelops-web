<template>
  <section class="flex flex-col gap-3" :class="{ 'surface-muted p-4': !itemId }">
    <div v-if="!itemId" class="flex flex-wrap justify-between items-center gap-3">
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
      v-for="{ item, index } in visibleItems"
      :key="item.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="flex items-start gap-3">
        <span class="min-w-0 flex-1 text-strong [overflow-wrap:anywhere]">
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
        <el-button
          v-if="editable"
          class="shrink-0 self-start"
          link
          type="primary"
          @click="openEdit(item)"
        >
          {{ $t("common.edit") }}
        </el-button>
      </div>
      <p v-if="item.descriptionZh || item.descriptionEn" class="m-0 mt-2 text-[13px] text-muted whitespace-pre-wrap [overflow-wrap:anywhere]">
        {{ (locale === 'en' ? item.descriptionEn : item.descriptionZh) || item.descriptionZh || item.descriptionEn }}
      </p>
    </div>
  </section>
  <AppDialog
    :model-value="Boolean(draft)"
    :title="$t('websiteItineraryUi.attractions')"
    size="lg"
    append-to-body
    @close="draft = null"
  >
    <el-form
      v-if="draft"
      label-position="top"
      :disabled="!editable"
      @submit.prevent
    >
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('common.nameZh')">
          <el-input v-model="draft.nameZh" :disabled="Boolean(draft.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('common.nameEn')">
          <el-input v-model="draft.nameEn" :disabled="Boolean(draft.attractionId)" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.coreCopyZh')">
          <el-input
            v-model="draft.descriptionZh"
            type="textarea"
            :rows="3"
            :disabled="Boolean(draft.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.coreCopyEn')">
          <el-input
            v-model="draft.descriptionEn"
            type="textarea"
            :rows="3"
            :disabled="Boolean(draft.attractionId)"
            maxlength="20000"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.appears')">
          <el-switch v-model="draft.appears" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="draft.feeState" />
        </el-form-item>
      </div>
      <el-button
        v-if="draft.attractionId"
        type="primary"
        plain
        size="small"
        @click="draft.attractionId = null"
      >
        {{ $t("websiteItineraryUi.convertToManualCopy") }}
      </el-button>
    </el-form>
    <template #footer>
      <el-button @click="draft = null">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!editable" @click="saveEdit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { WebsiteConfig, WebsiteDay, WebsiteItem } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{ config: WebsiteConfig; editable: boolean; itemId?: string }>();
const emit = defineEmits<{ add: [] }>();
const { locale } = useI18n();
const draft = ref<WebsiteItem | null>(null);
const visibleItems = computed(() => day.value.items
  .map((item, index) => ({ item, index }))
  .filter(({ item }) => !props.itemId || item.id === props.itemId));
function itemName(item: WebsiteItem) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function configKind(item: WebsiteItem) {
  return props.config.attractions.find((attraction) => attraction.id === item.attractionId)?.kind;
}
function openEdit(item: WebsiteItem) {
  if (props.editable) draft.value = { ...item };
}
function saveEdit() {
  if (!props.editable || !draft.value) return;
  const id = draft.value.id;
  const original = day.value.items.find(item => item.id === id);
  if (original) Object.assign(original, draft.value);
  draft.value = null;
}
defineExpose({ openEdit });
</script>
