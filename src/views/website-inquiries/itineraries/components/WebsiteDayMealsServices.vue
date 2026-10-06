<template>
  <section>
    <strong>{{ $t("websiteItineraryUi.mealsAndServices") }}</strong>
    <el-card
      v-for="meal in day.meals"
      :key="meal.id"
      shadow="never"
      class="mt-3"
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
    </el-card>
    <div class="flex justify-between items-center mt-3 mb-2">
      <strong>{{ $t("websiteItineraryUi.otherServices") }}</strong>
      <el-button v-if="editable" @click="addService">
        {{ $t("websiteItineraryUi.addService") }}
      </el-button>
    </div>
    <el-card
      v-for="(service, index) in day.services"
      :key="service.id"
      shadow="never"
      class="mb-3"
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
    </el-card>
  </section>
</template>
<script setup lang="ts">
import type { WebsiteDay } from "@/types/website";
import FeeStateSelect from "../../components/FeeStateSelect.vue";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const props = defineProps<{ day: WebsiteDay; editable: boolean }>();
function addService() {
  props.day.services.push({
    id: crypto.randomUUID(),
    nameZh: "",
    nameEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
</script>
