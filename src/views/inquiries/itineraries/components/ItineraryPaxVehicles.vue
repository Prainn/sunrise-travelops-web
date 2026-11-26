<template>
  <div v-for="vehicle in vehicles" :key="vehicle.vehicleId" class="mb-2 flex items-center gap-2">
    <span class="min-w-0 flex-1">{{ vehicle.vehicleName }} ({{ vehicle.seats }} {{ $t("planning.seats") }})</span>
    <el-input-number
      :model-value="vehicle.quantity"
      :aria-label="$t('planning.vehicleQuantity', { name: vehicle.vehicleName })"
      :min="1"
      :max="10000"
      :precision="0"
      :disabled="!editable"
      class="!w-[100px]"
      controls-position="right"
      @change="changeQuantity(vehicle.vehicleId, Number($event ?? 1))"
    />
    <span>{{ $t("planning.vehicles") }}</span>
    <el-button
      v-if="editable"
      link
      type="danger"
      @click="removeVehicle(vehicle.vehicleId)"
    >
      {{ $t("common.delete") }}
    </el-button>
  </div>
  <template v-if="editable">
    <el-form-item v-if="selecting" :label="$t('planning.arrangementVehicles')" class="[&_.el-form-item__content]:flex-nowrap">
      <ResourceSelect
        kind="transports"
        model-value=""
        :filters="{ serviceLevel: tier }"
        :disabled="loading"
        :disabled-option-ids="vehicles.map((vehicle) => vehicle.vehicleId)"
        :placeholder="$t('planning.addVehicle')"
        class="min-w-0 flex-1!"
        @update:model-value="addVehicle"
      />
      <el-button class="ml-2" :disabled="loading" @click="selecting = false">
        {{ $t("common.cancel") }}
      </el-button>
    </el-form-item>
    <el-button v-else class="mb-2" @click="selecting = true">
      {{ $t("planning.addVehicle") }}
    </el-button>
  </template>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import ResourceSelect from "@/components/ResourceSelect/index.vue";
import { resourceService } from "@/services/resource.service";
import type { ItineraryVehicleSelection, ItineraryVehicleTier } from "@/types/itinerary";

const props = defineProps<{
  tier: ItineraryVehicleTier;
  vehicles: ItineraryVehicleSelection[];
  editable: boolean;
}>();
const emit = defineEmits<{ change: [vehicles: ItineraryVehicleSelection[]] }>();
const selecting = ref(!props.vehicles.length);
const loading = ref(false);

function changeQuantity(id: string, quantity: number) {
  emit("change", props.vehicles.map((vehicle) => vehicle.vehicleId === id ? { ...vehicle, quantity } : vehicle));
}

function removeVehicle(id: string) {
  emit("change", props.vehicles.filter((vehicle) => vehicle.vehicleId !== id));
}

async function addVehicle(id: string) {
  if (!id || !props.editable || loading.value) return;
  loading.value = true;
  try {
    const resource = await resourceService.transportApi.getDetail(id);
    if (!props.editable || resource.serviceLevel !== props.tier || props.vehicles.some((v) => v.vehicleId === id)) return;
    emit("change", [...props.vehicles, { vehicleId: id, vehicleName: resource.name, seats: resource.seats, quantity: 1 }]);
    selecting.value = false;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    loading.value = false;
  }
}
</script>
