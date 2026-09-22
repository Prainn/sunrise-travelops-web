<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('planning.guideService')"
    width="min(600px, 96vw)"
    :close-on-click-modal="false"
    @close="emit('cancel')"
  >
    <section id="itinerary-guides">
      <el-form label-position="left">
        <div class="grid grid-cols-1 gap-x-6 md:grid-cols-[2fr_1fr]">
          <el-form-item :label="$t('planning.secondLanguage')">
            <el-select
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

        <el-divider v-if="plan" />

        <template v-if="plan">
          <el-form-item :label="$t('planning.dailyPrice')" label-width="160px">
            <el-input-number
              class="w-full"
              :model-value="plan.dailyPrice"
              :min="0"
              :precision="2"
              :disabled="!editable"
              controls-position="right"
              @update:model-value="emit('update-price', Number($event ?? 0))"
            />
          </el-form-item>
          <el-form-item :label="$t('identity.reason')" label-width="160px">
            <el-input
              :model-value="plan.adjustmentReason ?? ''"
              :disabled="!editable"
              :placeholder="$t('identity.reasonPlaceholder')"
              type="textarea"
              :rows="2"
              @update:model-value="emit('update-reason', $event)"
            />
          </el-form-item>
          <div class="flex items-center">
            <el-form-item :label="$t('planning.guideTotalPrice')" label-width="160px">
              <el-input :model-value="formatMoney(totalPrice)" readonly>
                <template #prepend> ¥ </template>
              </el-input>
              <el-text type="info" size="small">
                ¥{{ formatMoney(plan.dailyPrice) }} × {{ plan.serviceDays }}
              </el-text>
              <el-tag type="info" effect="plain" size="small" class="ml-2">
                {{ $t("planning.serviceDays") }}：{{ plan.serviceDays }}
              </el-tag>
            </el-form-item>
          </div>
        </template>
      </el-form>
      <div v-if="missing" class="flex items-center gap-[10px] mt-[14px]">
        <el-text type="danger">
          {{ $t("planning.noMatchingGuide") }}
        </el-text>
        <el-button v-if="canCreate" type="primary" link @click="emit('create-guide')">
          {{ $t("common.create") }}
        </el-button>
      </div>
    </section>
    <template #footer>
      <el-button @click="emit('cancel')">
        {{ $t(editable ? "common.cancel" : "common.close") }}
      </el-button>
      <el-button v-if="editable" type="primary" :loading="saving" @click="emit('save')">
        {{ $t("itinerary.save") }}
      </el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { computed } from "vue";
import type { ItineraryGuidePlan } from "@/types/itinerary";
import { GUIDE_LANGUAGE_OPTIONS } from "@/types/resource";
import { formatMoney, multiplyMoney } from "@/utils";

const props = defineProps<{
  plans: ItineraryGuidePlan[];
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
  "update-price": [price: number];
  "update-reason": [reason: string];
  "create-guide": [];
  save: [];
  cancel: [];
}>();
const plan = computed(() => props.plans[0]);
const totalPrice = computed(() =>
  plan.value ? multiplyMoney(plan.value.dailyPrice, plan.value.serviceDays) : 0,
);

function updateLanguage(value: string) {
  emit("update-type", value, props.shopping);
}

function updateShopping(value: string | number | boolean) {
  emit("update-type", props.secondLanguage, Boolean(value));
}
</script>
