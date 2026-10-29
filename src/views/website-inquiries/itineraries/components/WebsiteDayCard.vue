<template>
  <ItineraryDayCardFrame
    ref="frame"
    :day-number="day.dayNumber"
    :departure="departureName || $t('websiteItineraryUi.departureCity')"
    :destination="destinationName || $t('websiteItineraryUi.endCity')"
    :date="date"
    :body-id="`website-day-body-${day.id}`"
  >
    <el-form
      label-position="top"
      :disabled="!editable || saving"
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
      <section v-if="events.length" class="surface-muted p-4 flex flex-col gap-3">
        <h4 class="m-0 text-[14px] text-strong font-600">
          {{ $t("itineraryWorkspace.eventOrder") }}
        </h4>
        <template v-for="event in events" :key="event.id">
          <WebsiteDayAttractions
            v-if="event.kind === 'attraction'"
            :ref="(card) => setEventCard(event.id, card)"
            v-model:day="day"
            :item-id="event.id"
            :config="config"
            :editable="editable"
          />
          <WebsiteDayTransport
            v-else-if="event.kind === 'transport'"
            :ref="(card) => setEventCard(event.id, card)"
            v-model:day="day"
            :leg-id="event.id"
            :config="config"
            :editable="editable"
          />
          <WebsiteDayMealsServices
            v-else
            v-model:day="day"
            :meal-id="event.id"
            :editable="editable"
            @edit-meal="(slot) => emit('open-resource', 'meal', slot)"
          />
          <div v-if="editable" class="flex items-center gap-3 py-1">
            <span class="h-px flex-1 bg-[var(--divider-color)]" />
            <ItineraryDayResourceBar
              :actions="insertActions"
              @select="(key) => insertResource(key, event.id)"
            />
            <span class="h-px flex-1 bg-[var(--divider-color)]" />
          </div>
        </template>
      </section>
      <WebsiteDayHotels
        v-if="day.hotels.length"
        v-model:day="day"
        :config="config"
        :editable="editable"
        @edit="(hotelIndex) => emit('open-resource', 'hotel', hotelIndex)"
      />
      <WebsiteDayMealsServices
        ref="servicesCard"
        v-model:day="day"
        :editable="editable"
        services-only
      />
    </el-form>
  </ItineraryDayCardFrame>
</template>
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
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
import { websiteDayEventIds } from "../event-order";

export type WebsiteResourceDialogKind = "attraction" | "transport" | "hotel" | "meal" | "guide";

const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{
  sequence?: { id: string; label: string }[];
  config: WebsiteConfig;
  editable: boolean;
  saving?: boolean;
  startDate: string | null;
  last: boolean;
}>();
const emit = defineEmits<{
  /** hotel 传酒店下标（-1 新增），meal 传餐次 */
  "open-resource": [kind: WebsiteResourceDialogKind, target?: number | WebsiteMeal["slot"]];
  "insert-resource": [kind: "attraction" | "transport" | "meal", afterId: string];
}>();
const { t, locale } = useI18n();
const frame = useTemplateRef<InstanceType<typeof ItineraryDayCardFrame>>("frame");
const servicesCard = useTemplateRef<InstanceType<typeof WebsiteDayMealsServices>>("servicesCard");
const eventCards = new Map<string, unknown>();
function setEventCard(id: string, card: unknown) {
  if (card) eventCards.set(id, card);
  else eventCards.delete(id);
}
const departureName = computed(() => cityName(day.value.departCityId));
const destinationName = computed(() => cityName(day.value.endCityId));
const date = computed(() =>
  props.startDate ? addDays(props.startDate, day.value.dayNumber - 1) : "",
);
const events = computed(() => {
  const kinds = new Map<string, "attraction" | "transport" | "meal">([
    ...day.value.items.map(item => [item.id, "attraction"] as const),
    ...day.value.legs.map(leg => [leg.id, "transport"] as const),
    ...day.value.meals.filter(isMealArranged).map(meal => [meal.id, "meal"] as const),
  ]);
  return websiteDayEventIds(day.value).flatMap(id => {
    const kind = kinds.get(id);
    return kind ? [{ id, kind }] : [];
  });
});
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
const insertActions = computed(() => resourceActions.value
  .filter(action => action.key === "attraction" || action.key === "transport" || action.key === "meal")
  .map(action => ({ ...action, active: false })));

function insertResource(key: string, afterId: string) {
  if (key === "attraction" || key === "transport" || key === "meal") {
    emit("insert-resource", key, afterId);
  }
}

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
function selectResource(key: string) {
  if (key === "attraction" || key === "transport") emit("open-resource", key);
  else if (key === "hotel") emit("open-resource", "hotel", -1);
  else if (key === "meal") emit("open-resource", "meal", "lunch");
  else if (key === "guide") emit("open-resource", "guide");
  else if (key === "service") servicesCard.value?.openCreate();
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

function openValidationIssue(code: string) {
  if (!props.editable || props.saving) return;
  if (code === "VAL-E06" || code === "VAL-E09") {
    // E09：已报价档次缺当天酒店时打开新增（index -1）；缺双语名时编辑该酒店。
    const index = day.value.hotels.findIndex(hotel => !hotel.nameZh.trim() || !hotel.nameEn.trim());
    if (index >= 0 || day.value.hotels.length < 4) emit("open-resource", "hotel", index);
  } else if (code === "VAL-E03" && !day.value.legs.length && day.value.departCityId !== day.value.endCityId) {
    emit("open-resource", "transport");
  } else if (code === "VAL-E04") {
    const item = day.value.items.find(item => item.feeState === "UNKNOWN");
    if (item) {
      (eventCards.get(item.id) as InstanceType<typeof WebsiteDayAttractions> | undefined)?.openEdit(item);
      return;
    }
    const leg = day.value.legs.find(leg => leg.feeState === "UNKNOWN");
    if (leg) {
      (eventCards.get(leg.id) as InstanceType<typeof WebsiteDayTransport> | undefined)?.openEdit(leg);
      return;
    }
    const meal = day.value.meals.find(meal => meal.feeState === "UNKNOWN");
    if (meal) {
      emit("open-resource", "meal", meal.slot);
      return;
    }
    const service = day.value.services.find(service => service.feeState === "UNKNOWN");
    if (service) servicesCard.value?.openEdit(service);
  }
}

defineExpose({
  expand: () => frame.value?.expand(),
  openValidationIssue,
});
</script>
