<template>
  <section>
    <div class="flex justify-between items-center mb-3">
      <strong>{{ $t("websiteItineraryUi.transportLegs") }}</strong>
      <div v-if="editable" class="flex gap-2">
        <el-select
          v-model="selectedId"
          filterable
          clearable
          :placeholder="$t('websiteItineraryUi.selectRoute')"
          class="w-[240px]!"
        >
          <el-option
            v-for="route in config.routes.filter((item) => item.status === 'enabled')"
            :key="route.id"
            :value="route.id"
            :label="route.nameZh"
          />
        </el-select>
        <el-button @click="addRoute">
          {{ $t("websiteItineraryUi.addSelected") }}
        </el-button>
        <el-button @click="addManual">
          {{ $t("websiteItineraryUi.manualTransportLeg") }}
        </el-button>
      </div>
    </div>
    <el-card
      v-for="(leg, index) in day.legs"
      :key="leg.id"
      shadow="never"
      class="mb-3"
    >
      <div class="grid grid-cols-3 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')">
          <el-select v-model="leg.fromCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.arrivalCity')">
          <el-select v-model="leg.toCityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.transportMode')">
          <el-select v-model="leg.mode">
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
    </el-card>
  </section>
</template>
<script setup lang="ts">
import { ref } from "vue";
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import { TRANSPORT_OPTIONS } from "../../options";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
const selectedId = ref("");
function addRoute() {
  const route = props.config.routes.find((item) => item.id === selectedId.value);
  if (!route) return;
  props.day.legs.push({
    id: crypto.randomUUID(),
    routeId: route.id,
    fromCityId: route.fromCityId,
    toCityId: route.toCityId,
    mode: route.mode,
    nameZh: route.nameZh,
    nameEn: route.nameEn,
    feeState: route.feeState,
  });
  selectedId.value = "";
}
function addManual() {
  props.day.legs.push({
    id: crypto.randomUUID(),
    routeId: null,
    fromCityId: props.day.departCityId,
    toCityId: props.day.endCityId,
    mode: "private_vehicle",
    nameZh: "",
    nameEn: "",
    feeState: "INCLUDED",
  });
}
</script>
