<template>
  <ItineraryDayCardFrame
    ref="frame"
    :day-number="day.dayNumber"
    :departure="departureName || $t('websiteItineraryUi.departureCity')"
    :destination="destinationName || $t('websiteItineraryUi.endCity')"
    :date="date"
    :body-id="`website-day-body-${day.id}`"
  >
    <template v-if="editable" #actions>
      <el-button :disabled="index === 0" link @click="emit('move', -1)">
        {{ $t("common.moveUp") }}
      </el-button>
      <el-button :disabled="last" link @click="emit('move', 1)">
        {{ $t("common.moveDown") }}
      </el-button>
      <el-button link type="danger" @click="emit('remove')">
        {{ $t("websiteItineraryUi.removeDay") }}
      </el-button>
    </template>
    <el-form
      label-position="top"
      :disabled="!editable"
      class="flex flex-col gap-4"
      @submit.prevent
    >
      <ItineraryDayResourceBar
        v-if="editable || guideSummaries.length"
        :actions="editable ? resourceActions : []"
        :summaries="guideSummaries"
        @select="selectResource"
      />
      <div v-if="sequence?.length" class="text-sm">
        <span class="text-muted">{{ $t('itineraryWorkspace.eventOrder') }}</span>
        <ol class="flex flex-wrap gap-2 list-none p-0 m-0 mt-2">
          <li v-for="(item, position) in sequence" :key="item.id">
            {{ position + 1 }}. {{ item.label }}
          </li>
        </ol>
      </div>
      <ItineraryDayPanel :columns="3">
        <el-form-item :label="$t('websiteItineraryUi.departureCity')" required>
          <el-select v-model="day.departCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.endCity')" required>
          <el-select v-model="day.endCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.overnightCity')">
          <el-select
            :model-value="day.overnightCityId"
            autocomplete="new-password"
            filterable
            clearable
            :disabled="!editable || (last && day.overnightCityId === null)"
            :placeholder="$t('itinerary.noOvernightStay')"
            :empty-values="[null, undefined]"
            :value-on-clear="null"
            @update:model-value="setOvernight"
          >
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
          <el-checkbox
            v-if="last"
            class="mt-2"
            :model-value="day.overnightCityId === null"
            @update:model-value="toggleNoStay"
          >
            {{ $t("itinerary.noOvernightStay") }}
          </el-checkbox>
        </el-form-item>
      </ItineraryDayPanel>
      <WebsiteDayAttractions
        v-if="day.items.length"
        v-model:day="day"
        :config="config"
        :editable="editable"
        @add="emit('open-resource', 'attraction')"
      />
      <WebsiteDayTransport
        v-if="day.legs.length"
        v-model:day="day"
        :config="config"
        :editable="editable"
        @add="emit('open-resource', 'transport')"
      />
      <WebsiteDayHotels
        v-if="day.hotels.length"
        v-model:day="day"
        :config="config"
        :editable="editable"
        @edit="(hotelIndex) => emit('open-resource', 'hotel', hotelIndex)"
      />
      <WebsiteDayMealsServices
        v-if="day.services.length || day.meals.some(isMealArranged)"
        v-model:day="day"
        :editable="editable"
        @edit-meal="(slot) => emit('open-resource', 'meal', slot)"
        @add-service="addService"
      />
    </el-form>
  </ItineraryDayCardFrame>
</template>
<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
import { Bowl, Location, OfficeBuilding, Service, User, Van } from "@element-plus/icons-vue";
import type { WebsiteConfig, WebsiteDay, WebsiteMeal } from "@/types/website";
import { addDays } from "@/utils/format";
import ItineraryDayResourceBar, {
  type DayResourceAction,
} from "@/views/inquiries/itineraries/components/ItineraryDayResourceBar.vue";
import ItineraryDayCardFrame from "@/views/inquiries/itineraries/components/ItineraryDayCardFrame.vue";
import ItineraryDayPanel from "@/views/inquiries/itineraries/components/ItineraryDayPanel.vue";
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";
import { isMealArranged } from "../../options";

export type WebsiteResourceDialogKind = "attraction" | "transport" | "hotel" | "meal" | "guide";

const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{
  sequence?: { id: string; label: string }[];
  config: WebsiteConfig;
  editable: boolean;
  startDate: string | null;
  index: number;
  last: boolean;
}>();
const emit = defineEmits<{
  move: [direction: number];
  remove: [];
  /** hotel 传酒店下标（-1 新增），meal 传餐次 */
  "open-resource": [kind: WebsiteResourceDialogKind, target?: number | WebsiteMeal["slot"]];
}>();
const { t, locale } = useI18n();
const frame = useTemplateRef<InstanceType<typeof ItineraryDayCardFrame>>("frame");
const departureName = computed(() => cityName(day.value.departCityId));
const destinationName = computed(() => cityName(day.value.endCityId));
const date = computed(() =>
  props.startDate ? addDays(props.startDate, day.value.dayNumber - 1) : "",
);
const resourceActions = computed<DayResourceAction[]>(() => [
  {
    key: "attraction",
    label: t("itineraryWorkspace.actions.attraction"),
    icon: Location,
    active: day.value.items.length > 0,
  },
  {
    key: "transport",
    label: t("itineraryWorkspace.actions.transport"),
    icon: Van,
    active: day.value.legs.length > 0,
  },
  {
    key: "hotel",
    label: t("itineraryWorkspace.actions.hotel"),
    icon: OfficeBuilding,
    active: day.value.hotels.length > 0,
    disabled: !day.value.overnightCityId,
    hint: day.value.overnightCityId ? undefined : t("itineraryWorkspace.hints.websiteHotelNeedsCity"),
  },
  {
    key: "meal",
    label: t("itineraryWorkspace.actions.meal"),
    icon: Bowl,
    active: day.value.meals.some(isMealArranged),
  },
  {
    key: "guide",
    label: t("itineraryWorkspace.actions.guide"),
    icon: User,
    scope: t("itineraryWorkspace.scopes.thisDay"),
    active: Boolean(day.value.guideLanguage),
  },
  {
    key: "service",
    label: t("itineraryWorkspace.actions.service"),
    icon: Service,
    active: day.value.services.length > 0,
  },
]);

function cityName(id: string) {
  const city = props.config.cities.find((item) => item.id === id);
  return city ? (locale.value === "en" ? city.nameEn : city.nameZh) : "";
}
const guideSummaries = computed(() =>
  day.value.guideLanguage
    ? [{
      label: t("itineraryWorkspace.actions.guide"),
      value: day.value.guideLanguage,
    }]
    : [],
);
function addService() {
  day.value.services.push({
    id: crypto.randomUUID(),
    nameZh: "",
    nameEn: "",
    appears: true,
    feeState: "UNKNOWN",
  });
}
async function selectResource(key: string) {
  if (key === "attraction" || key === "transport") emit("open-resource", key);
  else if (key === "hotel") emit("open-resource", "hotel", -1);
  else if (key === "meal") emit("open-resource", "meal", "lunch");
  else if (key === "guide") emit("open-resource", "guide");
  else if (key === "service") {
    addService();
    await nextTick();
    document.getElementById(`website-day-services-${day.value.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/**
 * 修改住宿城市；清空为不住宿（null）时若已有酒店，确认后同时移除酒店，取消保持原数据。
 * 不改变早餐费用状态、酒店含早等其他字段。
 */
async function setOvernight(value: string | null) {
  if (value === null && day.value.hotels.length) {
    try {
      await ElMessageBox.confirm(
        t("websiteItineraryUi.noOvernightRemoveHotels", { count: day.value.hotels.length }),
        t("common.warning"),
        {
          type: "warning",
          confirmButtonText: t("websiteItineraryUi.noOvernightConfirm"),
          cancelButtonText: t("common.cancel"),
        },
      );
    } catch {
      return;
    }
    day.value.hotels = [];
  }
  day.value.overnightCityId = value;
}
function toggleNoStay(checked: string | number | boolean) {
  if (checked) void setOvernight(null);
  else day.value.overnightCityId = day.value.endCityId || null;
}

defineExpose({
  expand: () => frame.value?.expand(),
});
</script>
