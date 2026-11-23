<template>
  <ItineraryDayCardFrame
    ref="frame"
    :day-number="day.dayNumber"
    :departure="departureName || $t('websiteItineraryUi.departureCity')"
    :destination="destinationName || $t('websiteItineraryUi.endCity')"
    :date="date ?? ''"
    :body-id="`website-day-body-${day.id}`"
  >
    <el-form
      label-position="top"
      :disabled="!editable || saving"
      class="flex flex-col gap-4"
      @submit.prevent
    >
      <ItineraryDayResourceBar
        v-if="editable"
        :actions="editable ? resourceActions : []"
        @select="selectResource"
      />
      <div v-if="day.guideLanguage" class="flex flex-wrap items-center gap-3 text-[14px]">
        <span class="min-w-0 flex-1 text-strong [overflow-wrap:anywhere]">{{ $t("itineraryWorkspace.actions.guide") }} ({{ day.guideLanguage }})</span>
        <div v-if="editable && !saving" class="flex shrink-0">
          <el-button link type="primary" @click="emit('open-resource', { kind: 'guide' })">
            {{ $t("common.edit") }}
          </el-button>
          <el-button link type="danger" @click="emit('remove-item', websiteGuideBoardId(day.id), `${$t('itineraryWorkspace.actions.guide')} (${day.guideLanguage})`)">
            {{ $t("common.delete") }}
          </el-button>
        </div>
      </div>
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
              v-for="city in cityOptions(day.departCityId)"
              :key="city.id"
              :value="city.id"
              :label="locale === 'en' ? city.nameEn : city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('websiteItineraryUi.endCity')" required>
          <el-select v-model="day.endCityId" autocomplete="new-password" filterable>
            <el-option
              v-for="city in cityOptions(day.endCityId)"
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
              v-for="city in cityOptions(day.overnightCityId, day.endCityId)"
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
            :editable="editable && !saving"
            @remove="(id, name) => emit('remove-item', id, name)"
          />
          <WebsiteDayTransport
            v-else-if="event.kind === 'transport'"
            :ref="(card) => setEventCard(event.id, card)"
            v-model:day="day"
            :leg-id="event.id"
            :airport-transfers="airportTransfers"
            :config="config"
            :selectable-city-ids="selectableCityIds"
            :editable="editable && !saving"
            @remove="(id, name) => emit('remove-item', id, name)"
          />
          <WebsiteDayMealsServices
            v-else
            v-model:day="day"
            :meal-id="event.id"
            :editable="editable && !saving"
            @remove="(id, name) => emit('remove-item', id, name)"
            @edit-meal="(slot) => emit('open-resource', { kind: 'meal', slot })"
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
        :editable="editable && !saving"
        :nightly="nightly"
        @remove="(id, name) => emit('remove-item', id, name)"
        @edit="(index) => emit('open-resource', { kind: 'hotel', id: day.hotels[index]?.id, tier: day.hotels[index]?.tier })"
      />
      <WebsiteDayMealsServices
        ref="servicesCard"
        v-model:day="day"
        :editable="editable && !saving"
        services-only
        @remove="(id, name) => emit('remove-item', id, name)"
      />
    </el-form>
  </ItineraryDayCardFrame>
</template>
<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ElMessageBox } from "element-plus";
import { Bowl, Location, OfficeBuilding, Service, User, Van } from "@element-plus/icons-vue";
import type { WebsiteConfig, WebsiteDay, WebsiteHotelTier, WebsiteMeal, WebsiteValidation } from "@/types/website";
import ItineraryDayResourceBar, {
  type DayResourceAction,
} from "@/views/inquiries/itineraries/components/ItineraryDayResourceBar.vue";
import ItineraryDayCardFrame from "@/views/inquiries/itineraries/components/ItineraryDayCardFrame.vue";
import ItineraryDayPanel from "@/views/inquiries/itineraries/components/ItineraryDayPanel.vue";
import WebsiteDayAttractions from "./WebsiteDayAttractions.vue";
import WebsiteDayTransport from "./WebsiteDayTransport.vue";
import type { AirportTransferOptions } from "../airport-transfers";
import { websiteCityOptions } from "../city-options";
import WebsiteDayHotels from "./WebsiteDayHotels.vue";
import WebsiteDayMealsServices from "./WebsiteDayMealsServices.vue";
import { isMealArranged } from "../../options";
import { websiteDayEventIds } from "../event-order";
import { websiteGuideBoardId } from "../day-order";

export type WebsiteResourceSelection =
  | { kind: "attraction" | "transport" | "guide" }
  | { kind: "hotel"; id?: string; tier?: WebsiteHotelTier }
  | { kind: "meal"; slot: WebsiteMeal["slot"] };

const day = defineModel<WebsiteDay>("day", { required: true });
const props = defineProps<{
  nightly?: boolean;
  sequence?: { id: string; label: string }[];
  config: WebsiteConfig;
  selectableCityIds: ReadonlySet<string>;
  editable: boolean;
  saving?: boolean;
  /** 当天服务日期（自选清单或开始日期顺延）；未定为 null。 */
  date: string | null;
  last: boolean;
  airportTransfers?: AirportTransferOptions;
}>();
const emit = defineEmits<{
  "open-resource": [selection: WebsiteResourceSelection];
  "insert-resource": [kind: "attraction" | "transport" | "meal", afterId: string];
  "remove-item": [id: string, name: string];
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
function cityOptions(...retainedIds: (string | null)[]) {
  return websiteCityOptions(props.config.cities, props.selectableCityIds, ...retainedIds);
}
function selectResource(key: string) {
  if (key === "attraction" || key === "transport" || key === "hotel" || key === "guide") emit("open-resource", { kind: key });
  else if (key === "meal") emit("open-resource", { kind: "meal", slot: "lunch" });
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

function openValidationIssue(target: WebsiteValidation["target"]) {
  if (!props.editable || props.saving || !target) return;
  if (target.kind === "hotel") {
    if (day.value.overnightCityId) emit("open-resource", target);
  } else if (target.kind === "addTransport") {
    emit("open-resource", { kind: "transport" });
  } else if (target.kind === "event") {
    const item = day.value.items.find(item => item.id === target.id);
    if (item) {
      (eventCards.get(item.id) as InstanceType<typeof WebsiteDayAttractions> | undefined)?.openEdit(item);
      return;
    }
    const leg = day.value.legs.find(leg => leg.id === target.id);
    if (leg) {
      (eventCards.get(leg.id) as InstanceType<typeof WebsiteDayTransport> | undefined)?.openEdit(leg);
      return;
    }
    const meal = day.value.meals.find(meal => meal.id === target.id);
    if (meal) {
      emit("open-resource", { kind: "meal", slot: meal.slot });
      return;
    }
    const service = day.value.services.find(service => service.id === target.id);
    if (service) servicesCard.value?.openEdit(service);
  }
}

defineExpose({
  expand: () => frame.value?.expand(),
  openValidationIssue,
});
</script>
