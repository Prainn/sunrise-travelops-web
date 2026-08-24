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
          <el-button type="primary">
            {{ $t("common.search") }}
          </el-button>
          <el-button @click="resetQuery">
            {{ $t("common.reset") }}
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card
      class="page-content"
      shadow="never"
    >
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            type="primary"
            @click="openCreateDialog"
          >
            {{ $t("hotel.createHotel") }}
          </el-button>
        </div>
      </div>
      <div class="page-table-wrapper">
        <el-table
          :data="filteredHotels"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column
            type="expand"
            width="48"
          >
            <template #default="scope">
              <div class="hotel-page__prices">
                <div class="hotel-page__price-header">
                  <strong>{{ $t("hotel.roomPriceTitle") }}</strong>
                  <el-button
                    type="primary"
                    link
                    @click="openPriceDialog(scope.row as HotelRecord)"
                  >
                    {{ $t("hotel.addRoomPrice") }}
                  </el-button>
                </div>
                <el-table
                  :data="flattenPricePlans(scope.row as HotelRecord)"
                  size="small"
                  border
                >
                  <el-table-column
                    prop="roomType"
                    :label="$t('hotel.roomType')"
                    min-width="170"
                  />
                  <el-table-column
                    prop="rackRate"
                    :label="$t('hotel.rackRate')"
                    width="100"
                    align="right"
                  />
                  <el-table-column
                    prop="periodName"
                    :label="$t('hotel.pricePeriod')"
                    width="100"
                  />
                  <el-table-column
                    prop="effectivePeriod"
                    :label="$t('hotel.effectivePeriod')"
                    min-width="190"
                  />
                  <el-table-column
                    prop="individualPrice"
                    :label="$t('hotel.individualPrice')"
                    width="100"
                    align="right"
                  />
                  <el-table-column
                    prop="groupPrice"
                    :label="$t('hotel.groupPrice')"
                    width="100"
                    align="right"
                  />
                  <el-table-column
                    prop="minimumRooms"
                    :label="$t('hotel.minimumRooms')"
                    width="100"
                    align="center"
                  />
                  <el-table-column
                    :label="$t('common.actions')"
                    width="120"
                    align="center"
                  >
                    <template #default="priceScope">
                      <el-button
                        type="primary"
                        link
                        @click="openEditPriceDialog(scope.row as HotelRecord, priceScope.row as RoomPriceRow)"
                      >
                        {{ $t("common.edit") }}
                      </el-button>
                      <el-button
                        type="danger"
                        link
                        @click="deletePricePlan(scope.row as HotelRecord, priceScope.row as RoomPriceRow)"
                      >
                        {{ $t("common.delete") }}
                      </el-button>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </template>
          </el-table-column>
          <el-table-column
            prop="code"
            :label="$t('resource.code')"
            width="110"
          />
          <el-table-column
            prop="name"
            :label="$t('resource.hotelName')"
            min-width="190"
          />
          <el-table-column
            prop="city"
            :label="$t('resource.city')"
            width="100"
          />
          <el-table-column
            prop="rating"
            :label="$t('resource.starRating')"
            width="90"
          />
          <el-table-column
            :label="$t('hotel.roomTypeCount')"
            width="100"
            align="center"
          >
            <template #default="scope">
              {{ scope.row.roomTypes.length }}
            </template>
          </el-table-column>
          <el-table-column
            prop="address"
            :label="$t('hotel.address')"
            min-width="220"
            show-overflow-tooltip
          />
          <el-table-column
            prop="phone"
            :label="$t('resource.phone')"
            width="150"
          />
          <el-table-column
            :label="$t('common.status')"
            width="90"
            align="center"
          >
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(`common.${scope.row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            width="180"
            fixed="right"
          >
            <template #default="scope">
              <el-button
                type="primary"
                link
                @click="openEditDialog(scope.row as HotelRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="warning"
                link
                @click="toggleStatus(scope.row as HotelRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </el-card>

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
        label-width="110px"
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
        label-width="120px"
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
        <el-form-item :label="$t('hotel.minimumRooms')">
          <el-input-number
            v-model="priceForm.minimumRooms"
            :min="1"
          />
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
import {
  hotels,
  type HotelPricePlanRecord,
  type HotelRecord,
} from "@/data/data";

type HotelForm = HotelRecord & { cityPath: string[] };
type RoomPriceRow = HotelPricePlanRecord & {
  roomId: string;
  pricePlanId: string;
  roomType: string;
  rackRate: number;
  effectivePeriod: string;
};

defineOptions({ name: "Hotel" });

const { t } = useI18n();
const hotelStore = reactive(hotels);
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
const filteredHotels = computed(() => hotelStore.filter((hotel) =>
  (!city.value || hotel.city === city.value)
  && (!keywords.value || [hotel.code, hotel.name, hotel.address].some((field) => field.toLowerCase().includes(keywords.value.toLowerCase())))
));
const hotelRules: FormRules = {
  name: [{ required: true, message: t("hotel.nameRequired"), trigger: "blur" }],
  cityPath: [{ required: true, message: t("hotel.cityRequired"), trigger: "change" }],
};
const priceRules: FormRules = {
  roomType: [{ required: true, message: t("hotel.roomTypeRequired"), trigger: "blur" }],
  periodName: [{ required: true, message: t("hotel.periodRequired"), trigger: "blur" }],
  dates: [{ required: true, message: t("hotel.datesRequired"), trigger: "change" }],
};

function createEmptyHotel(): HotelForm {
  return { id: "", code: "", name: "", province: "", city: "", cityPath: [], rating: "", facilities: "", breakfast: "", address: "", phone: "", nearby: "", status: "enabled", roomTypes: [] };
}
function createEmptyPriceForm() {
  return { roomType: "", rackRate: 0, periodName: "常规期", dates: [] as string[], individualPrice: 0, groupPrice: 0, minimumRooms: 5 };
}
function resetQuery() { keywords.value = ""; city.value = ""; }
function generateHotelCode() {
  const max = hotelStore.reduce((value, hotel) => Math.max(value, Number(hotel.code.match(/^HTL-(\d+)$/)?.[1] ?? 0)), 0);
  return `HTL-${String(max + 1).padStart(3, "0")}`;
}
function openCreateDialog() { editingId.value = ""; Object.assign(hotelForm, createEmptyHotel(), { code: generateHotelCode() }); isHotelDialogVisible.value = true; }
function openEditDialog(hotel: HotelRecord) { editingId.value = hotel.id; Object.assign(hotelForm, hotel, { cityPath: [hotel.province, hotel.city] }); isHotelDialogVisible.value = true; }
function openPriceDialog(hotel: HotelRecord) {
  selectedHotel.value = hotel;
  editingRoomId.value = "";
  editingPricePlanId.value = "";
  Object.assign(priceForm, createEmptyPriceForm());
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
    minimumRooms: row.minimumRooms,
  });
  isPriceDialogVisible.value = true;
}
function toggleStatus(hotel: HotelRecord) { hotel.status = hotel.status === "enabled" ? "disabled" : "enabled"; ElMessage.success(t("common.updateSuccess")); }
function flattenPricePlans(hotel: HotelRecord) {
  return hotel.roomTypes.flatMap((room) => room.pricePlans.map((plan): RoomPriceRow => ({ ...plan, roomId: room.id, pricePlanId: plan.id, roomType: room.name, rackRate: room.rackRate, effectivePeriod: plan.startDate && plan.endDate ? `${plan.startDate} — ${plan.endDate}` : t("common.notSet") })));
}
async function saveHotel() {
  if (!(await hotelFormRef.value?.validate().catch(() => false))) return;
  const { cityPath, ...formValue } = hotelForm;
  formValue.province = cityPath[0];
  formValue.city = cityPath[1];
  const current = hotelStore.find((hotel) => hotel.id === editingId.value);
  if (current) Object.assign(current, formValue, { roomTypes: current.roomTypes });
  else hotelStore.push({ ...formValue, id: `hotel-${Date.now()}`, roomTypes: [] });
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
    room = { id: `room-${Date.now()}`, name: priceForm.roomType, rackRate: priceForm.rackRate, pricePlans: [] };
    selectedHotel.value.roomTypes.push(room);
  }
  room.pricePlans.push(createPricePlanValue(`price-${Date.now()}`));
  isPriceDialogVisible.value = false;
  ElMessage.success(t("common.createSuccess"));
}
function createPricePlanValue(id: string): HotelPricePlanRecord {
  return { id, periodName: priceForm.periodName, startDate: priceForm.dates[0], endDate: priceForm.dates[1], individualPrice: priceForm.individualPrice, groupPrice: priceForm.groupPrice, minimumRooms: priceForm.minimumRooms };
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
</script>

<style scoped lang="scss">
.hotel-page {
  &__city-select { width: 150px; }
  &__prices { padding: 16px 48px; background: var(--el-fill-color-lighter); }
  &__price-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
}
</style>
