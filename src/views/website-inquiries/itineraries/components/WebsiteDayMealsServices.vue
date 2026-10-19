<template>
  <section class="surface-muted p-4 flex flex-col gap-3">
    <h4 class="m-0 text-[14px] text-strong font-600">
      {{ $t("websiteItineraryUi.mealsAndServices") }}
    </h4>
    <div
      v-for="meal in day.meals"
      :key="meal.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t(`websiteItineraryUi.mealFees.${meal.slot}`)">
          <FeeStateSelect v-model="meal.feeState" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.sharedRestaurant')">
          <WebsiteResourceSelect
            v-model="meal.resourceId"
            kind="restaurant"
            :selected-name="meal.restaurantZh"
            @select="
              (resource) => {
                if (resource) meal.restaurantZh = resource.name;
              }
            "
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.restaurantOrMealNameZh')">
          <el-input v-model="meal.restaurantZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.restaurantOrMealNameEn')">
          <el-input v-model="meal.restaurantEn" maxlength="150" />
        </el-form-item>
      </div>
    </div>
    <div class="flex flex-wrap justify-between items-center gap-3 mt-1">
      <h5 class="m-0 text-[13px] text-strong font-600">
        {{ $t("websiteItineraryUi.otherServices") }}
      </h5>
      <el-button v-if="editable" @click="addService">
        {{ $t("websiteItineraryUi.addService") }}
      </el-button>
    </div>
    <div
      v-for="(service, index) in day.services"
      :key="service.id"
      class="p-3 rounded-[var(--custom-radius)] bg-surface border border-solid border-[var(--divider-color)]"
    >
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.serviceNameZh')">
          <el-input v-model="service.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.serviceNameEn')">
          <el-input v-model="service.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.appears')">
          <el-switch v-model="service.appears" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.feeState')">
          <FeeStateSelect v-model="service.feeState" />
        </el-form-item>
      </div>
      <el-button
        v-if="editable"
        link
        type="danger"
        @click="day.services.splice(index, 1)"
      >
        {{ $t("websiteItineraryUi.removeService") }}
      </el-button>
    </div>
  </section>
</template>
<script setup lang="ts">
import type { WebsiteDay } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const day = defineModel<WebsiteDay>("day", { required: true });
defineProps<{ editable: boolean }>();
function addService() {
  day.value.services.push({
    id: crypto.randomUUID(),
    nameZh: "",
    nameEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
</script>
