<template>
  <div class="hotel-page page-container">
    <el-card
      class="page-search"
      shadow="never"
    >
      <el-form :inline="true">
        <el-form-item :label="$t('common.keywords')">
          <el-input
            v-model.trim="keywords"
            :placeholder="$t('hotel.searchPlaceholder')"
            class="page-search__keywords"
            clearable
          />
        </el-form-item>
        <el-form-item :label="$t('resource.city')">
          <el-select
            v-model="city"
            :placeholder="$t('common.all')"
            clearable
            class="hotel-page__city-select"
          >
            <el-option
              v-for="option in cityOptions"
              :key="option"
              :label="option"
              :value="option"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button @click="resetQuery">
            {{ $t("common.reset") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <HotelTable
      :rows="filteredHotels"
      :ground-operator-options="groundOperatorOptions"
      @refresh="resetQuery"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteHotel"
      @create-price="openPriceDialog"
      @edit-price="openEditPriceDialog"
      @delete-price="deletePricePlan"
      @delete-room="deleteRoomType"
    />

    <el-dialog
      v-model="isHotelDialogVisible"
      :title="$t(isEditing ? 'hotel.editHotel' : 'hotel.createHotel')"
      width="680px"
      destroy-on-close
    >
      <el-form
        ref="hotelFormRef"
        :model="hotelForm"
        :rules="hotelRules"
        label-width="auto"
      >
        <el-form-item :label="$t('resource.code')">
          <el-input
            v-model="hotelForm.code"
            disabled
          />
        </el-form-item>
        <el-form-item
          :label="$t('resource.hotelName')"
          prop="name"
        >
          <el-input v-model.trim="hotelForm.name" />
        </el-form-item>
        <el-form-item
          :label="$t('resource.city')"
          prop="cityPath"
        >
          <el-cascader
            v-model="hotelForm.cityPath"
            :options="YUNNAN_TOURISM_REGION_OPTIONS"
            :placeholder="$t('hotel.cityPlaceholder')"
            clearable
            filterable
          />
        </el-form-item>
        <el-form-item
          :label="$t('resource.priceUnit')"
          prop="unit"
        >
          <el-select v-model="hotelForm.unit">
            <el-option
              v-for="option in hotelUnitOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('resource.starRating')">
          <el-radio-group v-model="hotelForm.rating">
            <el-radio value="三星">
              {{ $t("hotel.threeStars") }}
            </el-radio>
            <el-radio value="四星">
              {{ $t("hotel.fourStars") }}
            </el-radio>
            <el-radio value="五星">
              {{ $t("hotel.fiveStars") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('hotel.address')">
          <el-input v-model.trim="hotelForm.address" />
        </el-form-item>
        <el-form-item :label="$t('resource.phone')">
          <el-input v-model.trim="hotelForm.phone" />
        </el-form-item>
        <el-form-item :label="$t('hotel.facilities')">
          <el-input
            v-model.trim="hotelForm.facilities"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.breakfast')">
          <el-input
            v-model.trim="hotelForm.breakfast"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.nearby')">
          <el-input
            v-model.trim="hotelForm.nearby"
            type="textarea"
            :rows="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="isHotelDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          @click="saveHotel"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="isPriceDialogVisible"
      :title="$t(isEditingPrice ? 'hotel.editRoomPrice' : 'hotel.addRoomPrice')"
      width="620px"
      destroy-on-close
    >
      <el-form
        ref="priceFormRef"
        :model="priceForm"
        :rules="priceRules"
        label-width="auto"
      >
        <el-form-item
          :label="$t('hotel.roomType')"
          prop="roomType"
        >
          <el-input v-model.trim="priceForm.roomType" />
        </el-form-item>
        <el-form-item :label="$t('hotel.rackRate')">
          <el-input-number
            v-model="priceForm.rackRate"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item
          :label="$t('hotel.pricePeriod')"
          prop="periodName"
        >
          <el-input v-model.trim="priceForm.periodName" />
        </el-form-item>
        <el-form-item
          :label="$t('hotel.effectivePeriod')"
          prop="dates"
        >
          <el-date-picker
            v-model="priceForm.dates"
            type="daterange"
            value-format="YYYY-MM-DD"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.individualPrice')">
          <el-input-number
            v-model="priceForm.individualPrice"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.groupPrice')">
          <el-input-number
            v-model="priceForm.groupPrice"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item
          :label="$t('resource.priceUnit')"
          prop="unit"
        >
          <el-select v-model="priceForm.unit">
            <el-option
              v-for="option in hotelUnitOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('hotel.minimumRooms')">
          <el-input-number
            v-model="priceForm.minimumRooms"
            :min="1"
          />
        </el-form-item>
        <el-form-item :label="$t('resource.isGroundOperatorProvided')">
          <el-switch
            v-model="priceForm.isGroundOperatorProvided"
            @change="changePriceProvider"
          />
        </el-form-item>
        <el-form-item
          v-if="priceForm.isGroundOperatorProvided"
          :label="$t('resource.supplierName')"
          prop="groundOperatorId"
        >
          <el-select v-model="priceForm.groundOperatorId">
            <el-option
              v-for="option in groundOperatorOptions"
              :key="option.id"
              :label="option.name"
              :value="option.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="isPriceDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          @click="savePricePlan"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { YUNNAN_TOURISM_REGION_OPTIONS } from "@/constants/yunnan-tourism-regions";
import { resourceService } from "@/services/resource.service";
import type { HotelPricePlanRecord, HotelRecord } from "@/types/resource";
import { createId, generateNextCode } from "@/utils";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import HotelTable from "./components/HotelTable.vue";
import type { RoomPriceRow } from "./types";

type HotelForm = HotelRecord & { cityPath: string[] };

defineOptions({ name: "Hotel" });

const { t, locale } = useI18n();
const hotelStore = reactive(resourceService.hotels);
const keywords = ref("");
const city = ref("");
const isHotelDialogVisible = ref(false);
const isPriceDialogVisible = ref(false);
const editingId = ref("");
const editingRoomId = ref("");
const editingPricePlanId = ref("");
const selectedHotel = ref<HotelRecord>();
const hotelFormRef = ref<FormInstance>();
const priceFormRef = ref<FormInstance>();
const hotelForm = reactive<HotelForm>(createEmptyHotel());
const priceForm = reactive(createEmptyPriceForm());
const isEditing = computed(() => Boolean(editingId.value));
const isEditingPrice = computed(() => Boolean(editingRoomId.value && editingPricePlanId.value));
const cityOptions = computed(() => [...new Set(hotelStore.map((hotel) => hotel.city))]);
const groundOperatorOptions = computed(() =>
  resourceService.suppliers.filter((item) => item.status === "enabled")
);
const hotelUnitOptions = computed(() => getResourceUnitOptions("hotel", locale.value));
const filteredHotels = computed(() => {
  const query = keywords.value.toLowerCase();
  return hotelStore.filter((hotel) => {
    const matchesCity = !city.value || hotel.city === city.value;
    const matchesKeywords =
      !query ||
      [hotel.code, hotel.name, hotel.address].some((field) =>
        field.toLowerCase().includes(query)
      );
    return matchesCity && matchesKeywords;
  });
});
const hotelRules: FormRules = {
  name: [{ required: true, message: t("hotel.nameRequired"), trigger: "blur" }],
  cityPath: [{ required: true, message: t("hotel.cityRequired"), trigger: "change" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
};
const priceRules = computed<FormRules>(() => ({
  roomType: [{ required: true, message: t("hotel.roomTypeRequired"), trigger: "blur" }],
  periodName: [{ required: true, message: t("hotel.periodRequired"), trigger: "blur" }],
  dates: [{ required: true, message: t("hotel.datesRequired"), trigger: "change" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
  groundOperatorId: [
    {
      required: priceForm.isGroundOperatorProvided,
      message: t("resource.groundOperatorRequired"),
      trigger: "change",
    },
  ],
}));

function createEmptyHotel(): HotelForm {
  return {
    id: "",
    code: "",
    name: "",
    province: "",
    city: "",
    cityPath: [],
    rating: "",
    facilities: "",
    breakfast: "",
    address: "",
    phone: "",
    nearby: "",
    unit: "roomNight",
    status: "enabled",
    roomTypes: [],
  };
}
function createEmptyPriceForm() {
  return {
    roomType: "",
    rackRate: 0,
    periodName: "常规期",
    dates: [] as string[],
    individualPrice: 0,
    groupPrice: 0,
    unit: "roomNight",
    minimumRooms: 5,
    isGroundOperatorProvided: false,
    groundOperatorId: "",
  };
}
function resetQuery() {
  keywords.value = "";
  city.value = "";
}
function openCreateDialog() {
  editingId.value = "";
  Object.assign(hotelForm, createEmptyHotel(), { code: generateNextCode(hotelStore, "HTL") });
  isHotelDialogVisible.value = true;
}
function openEditDialog(hotel: HotelRecord) {
  editingId.value = hotel.id;
  Object.assign(hotelForm, hotel, { cityPath: [hotel.province, hotel.city] });
  isHotelDialogVisible.value = true;
}
function openPriceDialog(hotel: HotelRecord) {
  selectedHotel.value = hotel;
  editingRoomId.value = "";
  editingPricePlanId.value = "";
  Object.assign(priceForm, createEmptyPriceForm(), { unit: hotel.unit });
  isPriceDialogVisible.value = true;
}
function openEditPriceDialog(hotel: HotelRecord, row: RoomPriceRow) {
  selectedHotel.value = hotel;
  editingRoomId.value = row.roomId;
  editingPricePlanId.value = row.pricePlanId;
  Object.assign(priceForm, {
    roomType: row.roomType,
    rackRate: row.rackRate,
    periodName: row.periodName,
    dates: [row.startDate, row.endDate],
    individualPrice: row.individualPrice,
    groupPrice: row.groupPrice,
    unit: row.unit,
    minimumRooms: row.minimumRooms,
    isGroundOperatorProvided: row.isGroundOperatorProvided,
    groundOperatorId: row.groundOperatorId,
  });
  isPriceDialogVisible.value = true;
}
function toggleStatus(hotel: HotelRecord) {
  hotel.status = hotel.status === "enabled" ? "disabled" : "enabled";
  ElMessage.success(t("common.updateSuccess"));
}
async function deleteHotel(hotel: HotelRecord) {
  if (!(await confirmDelete("hotel.deleteHotelConfirm"))) return;
  const index = hotelStore.findIndex((item) => item.id === hotel.id);
  if (index < 0) return;
  hotelStore.splice(index, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
function changePriceProvider(value: string | number | boolean) {
  if (!value) priceForm.groundOperatorId = "";
}
async function saveHotel() {
  if (!(await hotelFormRef.value?.validate().catch(() => false))) return;
  const { cityPath, ...formValue } = hotelForm;
  formValue.province = cityPath[0];
  formValue.city = cityPath[1];
  const current = hotelStore.find((hotel) => hotel.id === editingId.value);
  if (current) {
    Object.assign(current, formValue, { roomTypes: current.roomTypes });
    current.roomTypes.forEach((room) => room.pricePlans.forEach((price) => { price.unit = current.unit; }));
  }
  else hotelStore.push({ ...formValue, id: createId("hotel"), roomTypes: [] });
  isHotelDialogVisible.value = false;
  ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
}
async function savePricePlan() {
  if (!(await priceFormRef.value?.validate().catch(() => false)) || !selectedHotel.value) return;

  if (isEditingPrice.value) {
    const room = selectedHotel.value.roomTypes.find((item) => item.id === editingRoomId.value);
    const pricePlan = room?.pricePlans.find((item) => item.id === editingPricePlanId.value);
    if (!room || !pricePlan) return;

    Object.assign(room, { name: priceForm.roomType, rackRate: priceForm.rackRate });
    Object.assign(pricePlan, createPricePlanValue(pricePlan.id));
    isPriceDialogVisible.value = false;
    ElMessage.success(t("common.updateSuccess"));
    return;
  }

  let room = selectedHotel.value.roomTypes.find((item) => item.name === priceForm.roomType);
  if (!room) {
    room = {
      id: createId("room"),
      name: priceForm.roomType,
      rackRate: priceForm.rackRate,
      pricePlans: [],
    };
    selectedHotel.value.roomTypes.push(room);
  }
  room.pricePlans.push(createPricePlanValue(createId("price")));
  isPriceDialogVisible.value = false;
  ElMessage.success(t("common.createSuccess"));
}
function createPricePlanValue(id: string): HotelPricePlanRecord {
  return {
    id,
    periodName: priceForm.periodName,
    startDate: priceForm.dates[0],
    endDate: priceForm.dates[1],
    individualPrice: priceForm.individualPrice,
    groupPrice: priceForm.groupPrice,
    unit: priceForm.unit,
    minimumRooms: priceForm.minimumRooms,
    isGroundOperatorProvided: priceForm.isGroundOperatorProvided,
    groundOperatorId: priceForm.groundOperatorId,
  };
}
async function deletePricePlan(hotel: HotelRecord, row: RoomPriceRow) {
  try {
    await ElMessageBox.confirm(t("hotel.deleteRoomPriceConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return;
  }

  const room = hotel.roomTypes.find((item) => item.id === row.roomId);
  if (!room) return;
  const pricePlanIndex = room.pricePlans.findIndex((item) => item.id === row.pricePlanId);
  if (pricePlanIndex < 0) return;

  room.pricePlans.splice(pricePlanIndex, 1);
  if (room.pricePlans.length === 0) {
    const roomIndex = hotel.roomTypes.findIndex((item) => item.id === room.id);
    hotel.roomTypes.splice(roomIndex, 1);
  }
  ElMessage.success(t("common.deleteSuccess"));
}
async function deleteRoomType(hotel: HotelRecord, row: RoomPriceRow) {
  if (!(await confirmDelete("hotel.deleteRoomTypeConfirm"))) return;
  const roomIndex = hotel.roomTypes.findIndex((item) => item.id === row.roomId);
  if (roomIndex < 0) return;
  hotel.roomTypes.splice(roomIndex, 1);
  ElMessage.success(t("common.deleteSuccess"));
}
async function confirmDelete(messageKey: string) {
  try {
    await ElMessageBox.confirm(t(messageKey), t("common.tip"), { type: "warning" });
    return true;
  } catch {
    return false;
  }
}
</script>

<style scoped lang="scss">
.hotel-page {
  &__city-select { width: 150px; }
}
</style>
