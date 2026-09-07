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
      @refresh="loadHotels"
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
        <el-form-item
          :label="$t('hotel.basicRoomType')"
          prop="basicRoomType"
        >
          <el-input v-model.trim="hotelForm.basicRoomType" />
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
import { computed, onMounted, reactive, ref } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { YUNNAN_TOURISM_REGION_OPTIONS } from "@/constants/yunnan-tourism-regions";
import { resourceService } from "@/services/resource.service";
import type { HotelRecord } from "@/types/resource";
import { generateNextCode } from "@/utils";
import { getResourceUnitOptions } from "@/utils/resource-unit";
import HotelTable from "./components/HotelTable.vue";

type HotelForm = HotelRecord & { cityPath: string[] };

defineOptions({ name: "Hotel" });

const { t, locale } = useI18n();
const hotelStore = reactive(resourceService.hotels);
const keywords = ref("");
const city = ref("");
const isHotelDialogVisible = ref(false);
const editingId = ref("");
const hotelFormRef = ref<FormInstance>();
const hotelForm = reactive<HotelForm>(createEmptyHotel());
const isEditing = computed(() => Boolean(editingId.value));
const cityOptions = computed(() => [...new Set(hotelStore.map((hotel) => hotel.city))]);
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
  basicRoomType: [{ required: true, message: t("hotel.basicRoomTypeRequired"), trigger: "blur" }],
  individualPrice: [{ required: true, message: t("hotel.individualPriceRequired"), trigger: "change" }],
  unit: [{ required: true, message: t("resource.priceUnitRequired"), trigger: "change" }],
};

onMounted(loadHotels);

async function loadHotels() {
  try {
    await resourceService.loadHotels();
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

function createEmptyHotel(): HotelForm {
  return {
    id: "",
    code: "",
    name: "",
    province: "",
    city: "",
    cityPath: [],
    rating: "international_five_star",
    facilities: "",
    breakfast: "",
    address: "",
    phone: "",
    nearby: "",
    basicRoomType: "",
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
  loadHotels();
}
function openCreateDialog() {
  editingId.value = "";
  Object.assign(hotelForm, createEmptyHotel(), { code: generateNextCode(hotelStore, "HTL") });
  isHotelDialogVisible.value = true;
}
async function openEditDialog(hotel: HotelRecord) {
  try {
    const detail = await resourceService.hotelApi.getDetail(hotel.id);
    editingId.value = hotel.id;
    Object.assign(hotelForm, detail, { cityPath: [detail.province, detail.city] });
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
    ElMessage.success(t("common.deleteSuccess"));
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}
async function saveHotel() {
  if (!(await hotelFormRef.value?.validate().catch(() => false))) return;
  const { cityPath, ...formValue } = hotelForm;
  formValue.province = cityPath[0];
  formValue.city = cityPath[1];
  const current = hotelStore.find((hotel) => hotel.id === editingId.value);
  try {
    const saved = current
      ? await resourceService.hotelApi.update(current.id, formValue)
      : await resourceService.hotelApi.create(formValue);
    if (current) Object.assign(current, saved);
    else hotelStore.push(saved);
    isHotelDialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
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
  &__city-select { width: 150px; }
}
</style>
