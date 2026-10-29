<template>
  <AppDialog
    :model-value="modelValue"
    size="lg"
    :title="$t('itineraryWorkspace.resourceDialogTitle', { day: dayLabel, type: $t('websiteItineraryUi.hotelPlans') })"
    @close="close"
  >
    <el-form label-position="top" @submit.prevent>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item
          :label="$t('websiteItineraryUi.hotelTier')"
          :error="tierTaken ? $t('websiteItineraryUi.hotelTierTaken') : ''"
        >
          <el-select v-model="draft.tier" autocomplete="new-password">
            <el-option
              v-for="tier in HOTEL_TIERS"
              :key="tier"
              :value="tier"
              :label="$t(`websiteItineraryUi.hotelTier${tier}`)"
              :disabled="usedTiers.has(tier)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.overnightCity')" required>
          <el-select v-model="draft.cityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="localName(city)"
            />
          </el-select>
        </el-form-item>
      </div>
      <el-form-item :label="$t('websiteItineraryUi.resourceSource')">
        <el-radio-group :model-value="source" @update:model-value="changeSource">
          <el-radio-button value="config">
            {{ $t("websiteItineraryUi.sourceConfigHotel") }}
          </el-radio-button>
          <el-radio-button value="public">
            {{ $t("websiteItineraryUi.sourcePublic") }}
          </el-radio-button>
          <el-radio-button value="manual">
            {{ $t("websiteItineraryUi.sourceManual") }}
          </el-radio-button>
        </el-radio-group>
      </el-form-item>
      <template v-if="source === 'config'">
        <el-form-item :label="$t('common.keywords')">
          <el-input v-model="keyword" clearable :placeholder="$t('websiteItineraryUi.bilingualKeywordPlaceholder')" />
        </el-form-item>
        <DataTable
          :data="configHotels"
          row-key="id"
          size="small"
          :height="220"
          :filtered="Boolean(keyword.trim())"
          highlight-current-row
          :current-row-key="draft.configHotelId ?? undefined"
          @row-click="pickConfigHotel"
        >
          <el-table-column width="48" align="center">
            <template #default="{ row }">
              <el-radio
                :model-value="draft.configHotelId ?? undefined"
                :value="row.id"
                :aria-label="localName(row as WebsiteConfigHotel)"
                @change="pickConfigHotel(row as WebsiteConfigHotel)"
              />
            </template>
          </el-table-column>
          <el-table-column :label="$t('websiteItineraryUi.hotelNameZh')" min-width="200">
            <template #default="{ row }">
              {{ localName(row as WebsiteConfigHotel) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('websiteItineraryUi.configHotelPriceColumn')" min-width="120" align="right">
            <template #default="{ row }">
              {{ formatMoney(row.price) }}
            </template>
          </el-table-column>
        </DataTable>
      </template>
      <WebsitePublicResourcePicker
        v-else-if="source === 'public'"
        kind="hotel"
        :model-value="draft.resourceId"
        :linked-city-id="linkedCityId"
        @update:model-value="draft.resourceId = $event"
        @select="pickPublicHotel"
      />
      <p class="m-0 my-3 text-[12px] text-muted">
        {{ $t(source === "public" ? "websiteItineraryUi.publicResourceNote" : "websiteItineraryUi.hotelNameNote") }}
      </p>
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item :label="$t('websiteItineraryUi.hotelNameZh')">
          <el-input v-model="draft.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.hotelNameEn')">
          <el-input v-model="draft.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.roomType')">
          <el-input
            v-model="draft.roomType"
            :placeholder="$t('websiteItineraryUi.roomTypePlaceholder')"
            maxlength="200"
          />
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.hotelBreakfastIncluded')">
          <el-switch v-model="draft.breakfastIncluded" />
        </el-form-item>
      </div>
    </el-form>
    <template #footer>
      <el-button @click="close">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :disabled="!canSubmit" @click="submit">
        {{ $t("common.confirm") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { HOTEL_TIERS } from "../vehicle-price";
import { useI18n } from "vue-i18n";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import { formatMoney } from "@/utils";
import type { WebsiteResourceOption } from "@/services/website.service";
import type { WebsiteConfig, WebsiteConfigHotel, WebsiteDay, WebsiteHotelStay } from "@/types/website";
import WebsitePublicResourcePicker from "../../components/WebsitePublicResourcePicker.vue";

type HotelSource = "config" | "public" | "manual";

/**
 * 独立站酒店新增/编辑：在弹窗内暂存，确认后才写回当天。
 *
 * 来源明确区分：独立站配置酒店写 configHotelId（及其关联 resourceId），公共酒店只写 resourceId，手填两者皆空。
 */
const props = defineProps<{
  modelValue: boolean;
  dayLabel: string;
  day?: WebsiteDay;
  config: WebsiteConfig;
  /** 编辑的酒店；为空时新增 */
  hotel?: WebsiteHotelStay;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  submit: [hotel: WebsiteHotelStay];
}>();
const { locale } = useI18n();
const source = ref<HotelSource>("config");
const keyword = ref("");
const draft = ref<WebsiteHotelStay>(emptyHotel());

const configHotels = computed(() => {
  const query = keyword.value.trim().toLowerCase();
  return props.config.hotels.filter(
    (item) =>
      item.status === "enabled" &&
      item.cityId === draft.value.cityId &&
      (!query || item.nameZh.toLowerCase().includes(query) || item.nameEn.toLowerCase().includes(query)),
  );
});
const linkedCityId = computed(
  () => props.config.cities.find((city) => city.id === draft.value.cityId)?.resourceId ?? null,
);
/** 同日每个档次最多一家酒店；编辑时排除自身，原档次可保存。 */
const usedTiers = computed(() => new Set(
  (props.day?.hotels ?? []).filter((hotel) => hotel.id !== draft.value.id).map((hotel) => hotel.tier),
));
const tierTaken = computed(() => usedTiers.value.has(draft.value.tier));
const canSubmit = computed(() =>
  Boolean(draft.value.cityId && (draft.value.nameZh.trim() || draft.value.nameEn.trim())) && !tierTaken.value,
);

watch(
  () => props.modelValue,
  (visible) => {
    if (!visible) return;
    keyword.value = "";
    draft.value = props.hotel ? { ...props.hotel } : emptyHotel();
    source.value = draft.value.configHotelId ? "config" : draft.value.resourceId ? "public" : props.hotel ? "manual" : "config";
  },
  { immediate: true },
);
// 配置酒店属于具体配置城市；城市改变后清除不匹配的配置酒店选择，不修改当天住宿城市。
watch(
  () => draft.value.cityId,
  (cityId) => {
    const configHotel = props.config.hotels.find((item) => item.id === draft.value.configHotelId);
    if (configHotel && configHotel.cityId !== cityId) {
      draft.value.configHotelId = null;
      draft.value.resourceId = null;
    }
  },
);

function emptyHotel(): WebsiteHotelStay {
  return {
    id: crypto.randomUUID(),
    tier: HOTEL_TIERS.find((tier) => !props.day?.hotels.some((hotel) => hotel.tier === tier)) ?? "A",
    cityId: props.day?.overnightCityId ?? props.day?.endCityId ?? "",
    configHotelId: null,
    resourceId: null,
    nameZh: "",
    nameEn: "",
    roomType: "",
    breakfastIncluded: true,
  };
}
function localName(item: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function changeSource(value: string | number | boolean | undefined) {
  const next = value as HotelSource;
  if (next === source.value) return;
  source.value = next;
  // 切换来源后清除不属于该来源的 ID，名称保留供人工修改。
  draft.value.configHotelId = null;
  draft.value.resourceId = null;
}
function pickConfigHotel(row: WebsiteConfigHotel) {
  draft.value.configHotelId = row.id;
  draft.value.resourceId = row.resourceId;
  draft.value.nameZh = row.nameZh;
  draft.value.nameEn = row.nameEn;
}
function pickPublicHotel(option: WebsiteResourceOption | undefined) {
  draft.value.configHotelId = null;
  // 公共酒店只提供名称；英文名继续人工补充，不构造缺失字段。
  if (option) draft.value.nameZh = option.name;
}
function close() {
  emit("update:modelValue", false);
}
function submit() {
  if (!canSubmit.value) return;
  emit("submit", { ...draft.value, nameZh: draft.value.nameZh.trim(), nameEn: draft.value.nameEn.trim() });
  close();
}
</script>
