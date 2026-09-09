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
        <el-form-item :label="$t('resource.starRating')">
          <el-select
            v-model="rating"
            :placeholder="$t('common.all')"
            clearable
            class="hotel-page__rating-select"
          >
            <el-option
              :label="$t('hotel.ratings.international_five_star')"
              value="international_five_star"
            />
            <el-option
              :label="$t('hotel.ratings.ctrip_preferred')"
              value="ctrip_preferred"
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
      v-model:page="pageNum"
      v-model:limit="pageSize"
      :total="total"
      :rows="hotelStore"
      @pagination="refreshHotels"
      @refresh="refreshHotels"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteHotel"
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
        <el-form-item
          v-if="isEditing"
          :label="$t('resource.code')"
        >
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
          prop="city"
        >
          <CitySelect v-model="hotelForm.city" />
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
        <el-form-item
          :label="$t('hotel.individualPrice')"
          prop="individualPrice"
        >
          <el-input-number
            v-model="hotelForm.individualPrice"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.groupPrice')">
          <el-input-number
            v-model="hotelForm.groupPrice"
            :min="0"
            :precision="2"
          />
        </el-form-item>
        <el-form-item :label="$t('hotel.minimumGroupSize')">
          <el-input-number
            v-model="hotelForm.minimumGroupSize"
            :min="1"
            :precision="0"
          />
        </el-form-item>
        <el-form-item :label="$t('resource.starRating')">
          <el-radio-group v-model="hotelForm.rating">
            <el-radio value="international_five_star">
              {{ $t("hotel.ratings.international_five_star") }}
            </el-radio>
            <el-radio value="ctrip_preferred">
              {{ $t("hotel.ratings.ctrip_preferred") }}
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
        <el-form-item :label="$t('hotel.breakfastIncluded')">
          <el-switch v-model="hotelForm.breakfastIncluded" />
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
  </div>
</template>

<script setup lang="ts">
import { useResourcePagination } from "../useResourcePagination";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import CitySelect from "@/components/CitySelect.vue";
import { useCityOptions } from "@/composables/useCityOptions";
import { resourceService } from "@/services/resource.service";
import type { HotelRating, HotelRecord, ResourceListQuery } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import HotelTable from "./components/HotelTable.vue";

type HotelForm = HotelRecord;

defineOptions({ name: "Hotel" });

const { t, locale } = useI18n();
const hotelStore = reactive<HotelRecord[]>([]);
const keywords = ref("");
const city = ref("");
const rating = ref<HotelRating | "">("");
const isHotelDialogVisible = ref(false);
const editingId = ref("");
const hotelFormRef = ref<FormInstance>();
const hotelForm = reactive<HotelForm>(createEmptyHotel());
const isEditing = computed(() => Boolean(editingId.value));
const cityOptions = useCityOptions();
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const total = ref(0);
const hotelUnitOptions = computed(() => getResourceUnitOptions("hotel", locale.value));
const requestHotels = useDebounceFn(() => loadHotels(currentQuery()), 300);
const hotelRules: FormRules = {
  name: [{ required: true, message: t("hotel.nameRequired"), trigger: "blur" }],
  city: [{ required: true, message: t("hotel.cityRequired"), trigger: "change" }],
  individualPrice: [{ required: true, message: t("hotel.individualPriceRequired"), trigger: "change" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
};

onMounted(loadHotels);

watch([keywords, city, rating], () => {
  pageNum.value = 1;
  requestHotels();
});

function currentQuery(): ResourceListQuery {
  return {
    ...paginationQuery(),
    keyword: keywords.value,
    city: city.value,
    rating: rating.value || undefined,
  };
}

async function loadHotels(query?: ResourceListQuery) {
  try {
    const records = await resourceService.loadHotels(query ?? currentQuery());
    hotelStore.splice(0, hotelStore.length, ...records);
    total.value = resourceService.getTotal(resourceService.hotels);
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function refreshHotels() {
  loadHotels(currentQuery());
}

function createEmptyHotel(): HotelForm {
  return {
    id: "",
    code: "",
    name: "",
    province: "",
    city: "",
    rating: "international_five_star",
    facilities: "",
    breakfastIncluded: true,
    breakfast: "",
    address: "",
    phone: "",
    nearby: "",
    individualPrice: 0,
    groupPrice: null,
    minimumGroupSize: null,
    unit: "roomNight",
    status: "enabled",
  };
}
function resetQuery() {
  keywords.value = "";
  city.value = "";
  rating.value = "";
}
function openCreateDialog() {
  editingId.value = "";
  Object.assign(hotelForm, createEmptyHotel());
  isHotelDialogVisible.value = true;
}
async function openEditDialog(hotel: HotelRecord) {
  try {
    const detail = await resourceService.hotelApi.getDetail(hotel.id);
    editingId.value = hotel.id;
    Object.assign(hotelForm, detail);
    isHotelDialogVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
async function toggleStatus(hotel: HotelRecord) {
  try {
    const updated = await resourceService.hotelApi.update(hotel.id, {
      ...hotel,
      status: hotel.status === "enabled" ? "disabled" : "enabled",
    });
    Object.assign(hotel, updated);
    await loadHotels(currentQuery());
    ElMessage.success(t("common.updateSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
async function deleteHotel(hotel: HotelRecord) {
  if (!(await confirmDelete("hotel.deleteHotelConfirm"))) return;
  try {
    await resourceService.hotelApi.deleteByIds(hotel.id);
    const index = hotelStore.findIndex((item) => item.id === hotel.id);
    if (index >= 0) hotelStore.splice(index, 1);
    await loadHotels(currentQuery());
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
async function saveHotel() {
  if (!(await hotelFormRef.value?.validate().catch(() => false))) return;
  const formValue = { ...hotelForm, province: resourceService.cityOptions.find((city) => city.name === hotelForm.city)?.province ?? hotelForm.province };
  const current = hotelStore.find((hotel) => hotel.id === editingId.value);
  try {
    const saved = editingId.value
      ? await resourceService.hotelApi.update(editingId.value, formValue)
      : await resourceService.hotelApi.create(formValue);
    if (current) Object.assign(current, saved);
    else if (!editingId.value) hotelStore.push(saved);
    await loadHotels(currentQuery());
    isHotelDialogVisible.value = false;
    ElMessage.success(t(editingId.value ? "common.updateSuccess" : "common.createSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
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
  &__city-select { @apply 'w-[150px]'; }
  &__rating-select { @apply 'w-[150px]'; }
}
</style>
