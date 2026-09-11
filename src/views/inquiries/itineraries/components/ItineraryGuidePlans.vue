<template>
  <section class="mt-[24px]">
    <h3 class="mb-[14px]">
      {{ $t('planning.guideService') }}
    </h3>
    <el-card
      v-loading="loading"
      shadow="never"
    >
      <el-form label-position="top">
        <div class="grid grid-cols-1 gap-x-[24px] md:grid-cols-2 p-[16px] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)]">
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

        <div
          v-if="plan"
          class="grid grid-cols-1 gap-x-[24px] md:grid-cols-2 p-[16px] [border:1px_solid_var(--el-border-color-lighter)] rounded-[8px] [background:var(--el-fill-color-extra-light)]"
        >
          <el-form-item :label="$t('planning.dailyPrice')">
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
          <el-form-item :label="$t('planning.guideTotalPrice')">
            <div class="w-full">
              <el-input
                :model-value="formatMoney(totalPrice)"
                readonly
              >
                <template #prepend>
                  ¥
                </template>
              </el-input>
              <div class="mt-[8px] flex items-center justify-between gap-[12px]">
                <el-text
                  type="info"
                  size="small"
                >
                  ¥{{ formatMoney(plan.dailyPrice) }} × {{ plan.serviceDays }}
                </el-text>
                <el-tag
                  type="info"
                  effect="plain"
                  size="small"
                >
                  {{ $t('planning.serviceDays') }}：{{ plan.serviceDays }}
                </el-tag>
              </div>
            </div>
          </el-form-item>
        </div>
      </el-form>

      <div
        v-if="missing"
        class="flex items-center gap-[10px] mt-[14px]"
      >
        <el-text type="danger">
          {{ $t('planning.noMatchingGuide') }}
        </el-text>
        <el-button
          v-if="canCreate"
          type="primary"
          link
          @click="emit('create-guide')"
        >
          {{ $t('common.create') }}
        </el-button>
      </div>
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue';
import type { ItineraryGuidePlan } from '@/types/itinerary';
import { GUIDE_LANGUAGE_OPTIONS } from '@/types/resource';
import { formatMoney, multiplyMoney } from '@/utils';

const props = defineProps<{
  plans: ItineraryGuidePlan[];
  secondLanguage: string;
  shopping: boolean;
  editable: boolean;
  loading: boolean;
  missing: boolean;
  canCreate: boolean;
}>();
const emit = defineEmits<{
  'update-type': [secondLanguage: string, shopping: boolean];
  'update-price': [price: number];
  'create-guide': [];
}>();
const plan = computed(() => props.plans[0]);
const totalPrice = computed(() => plan.value ? multiplyMoney(plan.value.dailyPrice, plan.value.serviceDays) : 0);

function updateLanguage(value: string) {
  emit('update-type', value, props.shopping);
}

function updateShopping(value: string | number | boolean) {
  emit('update-type', props.secondLanguage, Boolean(value));
}
</script>
