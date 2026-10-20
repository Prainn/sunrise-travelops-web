<template>
  <section class="surface-muted p-4 flex flex-col gap-3">
    <div class="flex flex-wrap justify-between items-center gap-3">
      <h4 class="m-0 text-[14px] text-strong font-600">
        {{ $t("websiteItineraryUi.transportLegs") }}
      </h4>
      <el-button
        v-if="editable"
        link
        type="primary"
        @click="emit('add')"
      >
        {{ $t("itineraryWorkspace.actions.transport") }}
      </el-button>
    </div>
    <div
      v-for="(leg, index) in day.legs"
      :key="leg.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')">
          <el-select v-model="leg.fromCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.arrivalCity')">
          <el-select v-model="leg.toCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportMode')">
          <el-select v-model="leg.mode" autocomplete="new-password">
            <el-option
              v-for="option in TRANSPORT_OPTIONS"
              :key="option.value"
              :value="option.value"
              :label="$t(option.labelKey)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameZh')">
          <el-input v-model="leg.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportNameEn')">
          <el-input v-model="leg.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="leg.feeState" />
        </el-form-item>
      </div>
      <el-button
        v-if="editable"
        link
        type="danger"
        @click="day.legs.splice(index, 1)"
      >
        {{ $t("websiteItineraryUi.removeTransportLeg") }}
      </el-button>
    </div>
  </section>
</template>
<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { TRANSPORT_OPTIONS } from "../../options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
defineProps<{ config: WebsiteConfig; editable: boolean }>();
const emit = defineEmits<{ add: [] }>();
const { locale } = useI18n();
</script>
