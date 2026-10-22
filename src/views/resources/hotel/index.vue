<template>
  <PageShell>
    <FilterBar @reset="resetQuery">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model.trim="keywords"
          :placeholder="$t('hotel.searchPlaceholder')"
          clearable
        />
      </el-form-item>
      <el-form-item :label="$t('common.cityRegion')">
        <el-select
          v-model="city"
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          clearable
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
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          clearable
        >
          <el-option
            v-for="value in [3, 4, 5]"
            :key="value"
            :label="$t(`hotel.ratings.${value}`)"
            :value="value"
          />
        </el-select>
      </el-form-item>
    </FilterBar>

    <HotelTable
      v-model:page="pageNum"
      v-model:limit="pageSize"
      :loading="isLoading"
      :total="total"
      :rows="hotelStore"
      :error="loadError"
      :filtered="hasActiveFilters"
      @pagination="refreshHotels"
      @refresh="refreshHotels"
      @create="openCreateDialog"
      @edit="openEditDialog"
      @toggle-status="toggleStatus"
      @delete="deleteHotel"
    />

    <AppDialog
      v-model="isHotelDialogVisible"
      :title="$t(isEditing ? 'hotel.editHotel' : 'hotel.createHotel')"
      size="md"
      :busy="isSubmitting"
      destroy-on-close
    >
      <el-form
        ref="hotelFormRef"
        :model="hotelForm"
        :rules="hotelRules"
        :disabled="isSubmitting"
        label-width="auto"
      >
        <el-form-item v-if="isEditing" :label="$t('resource.code')">
          <el-input v-model="hotelForm.code" disabled />
        </el-form-item>
        <el-form-item :label="$t('resource.hotelName')" prop="name">
          <el-input v-model.trim="hotelForm.name" />
        </el-form-item>
        <el-form-item :label="$t('common.englishName')">
          <el-input v-model.trim="hotelForm.englishName" :maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('common.cityRegion')" prop="city">
          <CitySelect v-model="hotelForm.city" />
        </el-form-item>
        <el-form-item :label="$t('itinerary.priceUnit')" prop="unit">
          <el-select v-model="hotelForm.unit" autocomplete="new-password">
            <el-option
              v-for="option in hotelUnitOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('hotel.individualPrice')" prop="individualPrice">
          <el-input-number v-model="hotelForm.individualPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item :label="$t('hotel.groupPrice')">
          <el-input-number v-model="hotelForm.groupPrice" :min="0" :precision="2" />
        </el-form-item>
        <el-form-item :label="$t('hotel.minimumGroupSize')">
          <el-input-number v-model="hotelForm.minimumGroupSize" :min="1" :precision="0" />
        </el-form-item>
        <el-form-item :label="$t('resource.starRating')">
          <el-radio-group v-model="hotelForm.rating">
            <el-radio v-for="value in [3, 4, 5]" :key="value" :value="value">
              {{ $t(`hotel.ratings.${value}`) }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item :label="$t('common.address')">
          <el-input v-model.trim="hotelForm.address" />
        </el-form-item>
        <el-form-item :label="$t('resource.phone')">
          <el-input v-model.trim="hotelForm.phone" />
        </el-form-item>
        <el-form-item :label="$t('hotel.facilities')">
          <el-input v-model.trim="hotelForm.facilities" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="$t('hotel.breakfast')">
          <el-input v-model.trim="hotelForm.breakfast" type="textarea" :rows="2" />
        </el-form-item>
        <el-form-item :label="$t('hotel.nearby')">
          <el-input v-model.trim="hotelForm.nearby" type="textarea" :rows="2" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="isSubmitting" @click="isHotelDialogVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          :loading="isSaving"
          :disabled="isSubmitting"
          @click="saveHotel"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>

<script setup lang="ts">
import { useResourcePagination } from "../useResourcePagination";
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import CitySelect from "@/components/CitySelect.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import { useCityOptions } from "@/composables/useCityOptions";
import { resourceService } from "@/services/resource.service";
import type { HotelRating, HotelRecord, ResourceListQuery } from "@/types/resource";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import HotelTable from "./components/HotelTable.vue";
import { useResourceFormSubmit } from "../useResourceFormSubmit";

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
const { isSubmitting, isSaving, submitForm } = useResourceFormSubmit(hotelFormRef);
const hotelForm = reactive<HotelForm>(createEmptyHotel());
const isEditing = computed(() => Boolean(editingId.value));
const cityOptions = useCityOptions();
const { pageNum, pageSize, paginationQuery } = useResourcePagination();
const total = ref(0);
const hotelUnitOptions = computed(() => getResourceUnitOptions("hotel", locale.value));
const requestHotels = useDebounceFn(() => loadHotels(currentQuery()), 300);
const hotelRules = computed<FormRules>(() => ({
  name: [{ required: true, message: t("hotel.nameRequired"), trigger: "blur" }],
  city: [{ required: true, message: t("common.selectCity"), trigger: "change" }],
  individualPrice: [
    { required: true, message: t("hotel.individualPriceRequired"), trigger: "change" },
  ],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
}));

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

const isLoading = ref(false);
const loadError = ref("");
const hasActiveFilters = computed(() => Boolean(keywords.value || city.value || rating.value));

async function loadHotels(query?: ResourceListQuery) {
  isLoading.value = true;
  try {
    const records = await resourceService.loadHotels(query ?? currentQuery());
    hotelStore.splice(0, hotelStore.length, ...records);
    total.value = resourceService.getTotal(resourceService.hotels);
    loadError.value = "";
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : String(error);
    ElMessage.error(loadError.value);
  } finally {
    isLoading.value = false;
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
    englishName: "",
    province: "",
    city: "",
    rating: 5,
    facilities: "",
    breakfast: "",
    address: "",
    phone: "",
    nearby: "",
    individualPrice: null,
    groupPrice: null,
    minimumGroupSize: null,
    unit: "roomNight",
    status: "enabled",
  };
}
function resetQuery() {
  pageNum.value = 1;
  keywords.value = "";
  city.value = "";
  rating.value = "";
  requestHotels();
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
// Row-level mutations in flight; repeated clicks would hit a stale version.
const busyHotelIds = new Set<string>();
async function toggleStatus(hotel: HotelRecord) {
  if (busyHotelIds.has(hotel.id)) return;
  busyHotelIds.add(hotel.id);
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
  } finally {
    busyHotelIds.delete(hotel.id);
  }
}
async function deleteHotel(hotel: HotelRecord) {
  if (!(await confirmDelete("hotel.deleteHotelConfirm"))) return;
  if (busyHotelIds.has(hotel.id)) return;
  busyHotelIds.add(hotel.id);
  try {
    await resourceService.hotelApi.deleteByIds(hotel.id);
    const index = hotelStore.findIndex((item) => item.id === hotel.id);
    if (index >= 0) hotelStore.splice(index, 1);
    await loadHotels(currentQuery());
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  } finally {
    busyHotelIds.delete(hotel.id);
  }
}
async function saveHotel() {
  await submitForm(async () => {
    const formValue = {
      ...hotelForm,
      province:
        resourceService.cityOptions.find(
          (city) => city.name === hotelForm.city,
        )?.province ?? hotelForm.province,
    };
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
  });
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
