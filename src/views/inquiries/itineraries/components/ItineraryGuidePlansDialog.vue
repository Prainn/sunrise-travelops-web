<template>
  <AppDialog
    :model-value="modelValue"
    :title="$t('planning.guideService')"
    size="md"
    :close-on-click-modal="false"
    :busy="saving"
    @close="emit('cancel')"
  >
    <section id="itinerary-guides">
      <el-form label-position="top" @submit.prevent>
        <div class="grid grid-cols-2 gap-x-4 max-[560px]:grid-cols-1">
          <el-form-item :label="$t('planning.secondLanguage')">
            <el-select
              autocomplete="new-password"
              class="w-full"
              :model-value="secondLanguage"
              :disabled="!editable"
              :placeholder="$t('planning.selectLanguage')"
              @change="updateLanguage"
            >
              <el-option
                v-for="item in GUIDE_LANGUAGE_OPTIONS"
                :key="item.value"
                :value="item.value"
                :label="$t(`planning.languages.${item.value}`)"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('planning.shopping')">
            <el-switch
              :model-value="shopping"
              :disabled="!editable"
              :active-text="$t('common.yes')"
              :inactive-text="$t('common.no')"
              @change="updateShopping"
            />
          </el-form-item>
        </div>

        <div
          v-if="plan"
          class="mt-1 p-4 rounded-[var(--custom-radius)] surface-muted [border:1px_solid_var(--divider-color)]"
        >
          <div class="grid grid-cols-2 gap-x-4 max-[560px]:grid-cols-1">
            <el-form-item :label="$t('planning.dailyPrice')">
              <el-input-number
                class="w-full!"
                :model-value="plan.dailyPrice"
                :min="0"
                :precision="2"
                :disabled="!editable"
                controls-position="right"
                @update:model-value="emit('update-price', $event ?? null)"
              />
            </el-form-item>
            <el-form-item :label="$t('planning.guideTotalPrice')">
              <el-input :model-value="formatMoney(totalPrice)" readonly>
                <template #prepend>
                  ¥
                </template>
              </el-input>
            </el-form-item>
          </div>
          <el-form-item
            v-if="needsReason"
            :label="$t('identity.reason')"
            required
          >
            <el-input
              :model-value="plan.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              type="textarea"
              :rows="2"
              @update:model-value="emit('update-reason', $event)"
            />
          </el-form-item>
          <p class="m-0 flex flex-wrap items-center gap-2 text-[12px] text-muted">
            <span>¥{{ formatMoney(plan.dailyPrice) }} × {{ plan.serviceDays }}</span>
            <el-tag type="info" effect="plain" size="small">
              {{ $t("planning.serviceDays") }}：{{ plan.serviceDays }}
            </el-tag>
          </p>
        </div>
      </el-form>
      <div v-if="missing" class="flex items-center gap-[10px] mt-[14px]">
        <el-text type="danger">
          {{ $t("planning.noMatchingGuide") }}
        </el-text>
        <el-button
          v-if="canCreate"
          type="primary"
          link
          @click="emit('create-guide')"
        >
          {{ $t("common.create") }}
        </el-button>
      </div>
    </section>
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button
        v-if="editable"
        type="primary"
        :loading="saving"
        @click="emit('save')"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>
<script setup lang="ts">
import { computed } from "vue";
import AppDialog from "@/components/AppDialog/index.vue";
import type { ItineraryGuidePlan } from "@/types/itinerary";
import { GUIDE_LANGUAGE_OPTIONS } from "@/types/resource";
import { formatMoney, multiplyMoney } from "@/utils";
import { selectionPriceNeedsReason } from "../price-adjustments";

const props = defineProps<{
  plans: ItineraryGuidePlan[];
  savedPlans: ItineraryGuidePlan[];
  secondLanguage: string;
  shopping: boolean;
  editable: boolean;
  loading: boolean;
  missing: boolean;
  canCreate: boolean;
  modelValue: boolean;
  saving: boolean;
}>();
const emit = defineEmits<{
  "update-type": [secondLanguage: string, shopping: boolean];
  "update-price": [price: number | null];
  "update-reason": [reason: string];
  "create-guide": [];
  save: [];
  cancel: [];
}>();
const plan = computed(() => props.plans[0]);
const needsReason = computed(() => {
  const guide = plan.value;
  if (!guide) return false;
  const saved = props.savedPlans.find((item) => item.guideId === guide.guideId);
  return selectionPriceNeedsReason(guide.dailyPrice, guide, saved?.dailyPrice ?? undefined);
});
const totalPrice = computed(() =>
  plan.value?.dailyPrice != null
    ? multiplyMoney(plan.value.dailyPrice, plan.value.serviceDays)
    : null,
);

function updateLanguage(value: string) {
  emit("update-type", value, props.shopping);
}

function updateShopping(value: string | number | boolean) {
  emit("update-type", props.secondLanguage, Boolean(value));
}
</script>
