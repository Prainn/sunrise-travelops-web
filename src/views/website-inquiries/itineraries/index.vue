<template>
  <PageShell
    v-loading="loading || saving"
    :fill="false"
    :inert="loading || saving"
    class="website-itinerary-page"
  >
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
    />
    <template v-if="inquiry">
      <ItineraryWorkspaceLayout
        ref="workspaceLayout"
        :accent="LYNXTOUR_ACCENT"
        :stripe="LYNXTOUR_GOLD"
        :days="plan && config ? dayEntries : []"
        :reset-key="plan?.id"
        :can-add="editable && !saving"
        @expand="(id) => dayCards.get(id)?.expand()"
        @add="addDay"
        @reorder="isReorderDialogVisible = true"
      >
        <template #header="{ collapsed }">
          <SectionCard class="website-itinerary-page__overview">
            <el-page-header @back="router.push('/website-inquiries')">
              <template #content>
                <div class="flex flex-wrap items-center gap-3">
                  <el-tag>{{ $t("websiteWorkspace.businessLabel") }}</el-tag>
                  <el-select
                    autocomplete="new-password"
                    :model-value="plan?.id"
                    :placeholder="$t('websiteWorkspace.selectItinerary')"
                    class="w-[min(380px,60vw)]!"
                    @change="selectPlan"
                  >
                    <el-option
                      v-for="record in plans"
                      :key="record.id"
                      :value="record.id"
                      :label="`${record.title} · ${$t(record.status === 'draft' ? 'websiteWorkspace.draft' : 'websiteWorkspace.confirmed')}`"
                    />
                  </el-select>
                </div>
              </template>
              <template #extra>
                <el-button v-if="canCreate" type="primary" @click="create">
                  {{ $t("common.create") }}
                </el-button>
              </template>
            </el-page-header>
            <el-collapse-transition>
              <div v-show="!collapsed" class="flow-root">
                <div
                  v-if="plan"
                  class="flex flex-wrap items-center justify-between gap-3 mt-3 py-3 [border-top:1px_solid_var(--divider-color)] [border-bottom:1px_solid_var(--divider-color)]"
                >
                  <div class="min-w-0 flex flex-wrap items-center gap-2">
                    <h2 class="m-0 text-[18px] text-strong break-words">
                      {{ plan.title }}
                    </h2>
                    <span v-if="plan.startDate" class="text-sm text-muted">
                      {{ plan.startDate }}
                    </span>
                    <el-tag v-if="plan.pax !== null" size="small" effect="plain">
                      {{ plan.pax }} PAX
                    </el-tag>
                  </div>
                  <div class="flex flex-wrap items-center gap-[10px]">
                    <el-tag :type="plan.status === 'draft' ? 'info' : 'success'">
                      {{ $t(plan.status === "draft" ? "websiteWorkspace.draft" : "websiteWorkspace.quotedLocked") }}
                    </el-tag>
                    <el-button v-if="editable" class="ml-0!" @click="isBasicsDialogVisible = true">
                      {{ $t("itinerary.editItinerary") }}
                    </el-button>
                    <span v-if="currentConfig && plan.configVersion !== currentConfig.version">
                      {{
                        $t("websiteWorkspace.configVersions", {
                          used: plan.configVersion,
                          current: currentConfig?.version,
                        })
                      }}
                    </span>
                    <el-button
                      v-if="editable && plan.configVersion !== currentConfig?.version"
                      class="ml-0!"
                      @click="useCurrentConfig"
                    >
                      {{ $t("websiteWorkspace.useCurrentConfig") }}
                    </el-button>
                    <el-button v-if="canCreate && plan.status === 'quoted'" class="ml-0!" @click="copy">
                      {{ $t("websiteWorkspace.copyToEdit") }}
                    </el-button>
                    <el-tag v-if="dirty" type="warning">
                      {{ $t("websiteWorkspace.unsavedChanges") }}
                    </el-tag>
                  </div>
                </div>
                <div class="grid grid-cols-4 gap-x-[18px] gap-y-2 mt-3 text-sm max-[1100px]:grid-cols-2 max-[650px]:grid-cols-1">
                  <span class="flex flex-wrap items-center gap-[6px]">
                    <small class="text-muted">{{ $t("inquiry.code") }}</small>
                    {{ inquiry.code }}
                    <el-tag size="small" effect="plain">{{ $t(`inquiry.statuses.${inquiry.status}`) }}</el-tag>
                  </span>
                  <span class="flex gap-[6px]">
                    <small class="shrink-0 text-muted">{{ $t("websiteInquiry.customerName") }}</small>
                    {{ inquiry.customerName }}
                  </span>
                  <span class="flex gap-[6px]">
                    <small class="shrink-0 text-muted">{{ $t("inquiry.owner") }}</small>
                    {{ inquiry.owner }}
                  </span>
                  <span class="flex gap-[6px]">
                    <small class="shrink-0 text-muted">{{ $t("inquiry.plannedDays") }}</small>
                    {{ $t("websiteInquiry.dayCount", { days: inquiry.plannedDays }) }}
                  </span>
                </div>
              </div>
            </el-collapse-transition>
          </SectionCard>
        </template>

        <template #notice>
          <template v-if="plan && config">
            <el-alert
              v-if="!config.cities.length"
              :title="$t('websiteWorkspace.noCityConfig')"
              type="info"
              :closable="false"
            />
            <el-alert
              v-if="plan.configVersion !== currentConfig?.version && plan.status === 'draft'"
              :title="$t('websiteWorkspace.historicalConfigWarning')"
              type="warning"
              :closable="false"
            />
            <el-alert
              v-if="reorderIssues.length"
              type="warning"
              :title="$t('itineraryWorkspace.issuesTitle')"
              @close="reorderIssues = []"
            >
              <ul class="m-0 pl-4">
                <li v-for="(issue, issueIndex) in reorderIssues" :key="issueIndex">
                  {{ $t(issue.key, issue.params ?? {}) }}
                  <el-button
                    v-if="issue.dayId"
                    link
                    type="primary"
                    @click="workspaceLayout?.scrollToDay(issue.dayId)"
                  >
                    {{ $t("itineraryWorkspace.locate") }}
                  </el-button>
                </li>
              </ul>
            </el-alert>
            <div v-if="editable" class="flex flex-wrap items-center justify-between gap-3 min-h-[48px]">
              <div class="flex flex-wrap gap-3">
                <el-select
                  v-model="skeletonId"
                  autocomplete="new-password"
                  filterable
                  clearable
                  :placeholder="$t('websiteWorkspace.selectSkeleton')"
                  class="w-[min(300px,75vw)]!"
                >
                  <el-option
                    v-for="skeleton in config.skeletons.filter((item) => item.status === 'enabled')"
                    :key="skeleton.id"
                    :value="skeleton.id"
                    :label="
                      $t('websiteWorkspace.skeletonLabel', {
                        name: locale === 'en' ? skeleton.nameEn : skeleton.nameZh,
                        days: skeleton.days.length,
                      })
                    "
                  />
                </el-select>
                <el-button
                  :disabled="!skeletonId || dirty || plan.configVersion !== currentConfig?.version"
                  @click="generate"
                >
                  {{ $t("websiteWorkspace.generateDraft") }}
                </el-button>
                <el-button :disabled="!config.cities.length" class="ml-0!" @click="addDay">
                  {{ $t("websiteWorkspace.addDay") }}
                </el-button>
              </div>
            </div>
          </template>
        </template>

        <template #day="{ index }">
          <WebsiteDayCard
            v-if="plan && config && plan.days[index]"
            :ref="(card) => setDayCard(plan!.days[index]!.id, card)"
            :day="plan.days[index]"
            :sequence="boardDay(plan.days[index]).groups[0]?.items.filter(item => !item.placeholder)"
            :config="config"
            :editable="editable"
            :saving="saving"
            :start-date="plan.startDate"
            :last="index === plan.days.length - 1"
            @update:day="plan.days.splice(index, 1, $event)"
            @open-resource="(kind, target) => openResource(index, kind, target)"
            @insert-resource="(kind, afterId) => openInsertResource(index, kind, afterId)"
          />
        </template>

        <template #empty>
          <SectionCard v-if="plan && config">
            <FeedbackState :title="$t('websiteWorkspace.noDays')" />
          </SectionCard>
          <SectionCard v-else>
            <FeedbackState :title="$t('websiteWorkspace.noItineraries')" />
          </SectionCard>
        </template>

        <template #footer>
          <ItineraryWorkspaceFooter v-if="plan && config">
            <template #summary>
              {{ $t("websiteWorkspace.plannedDaysSummary", { days: plan.duration }) }}
            </template>
            <el-button v-if="editable" :disabled="!dirty || saving" @click="reset">
              {{ $t("websiteWorkspace.cancelChanges") }}
            </el-button>
            <el-button
              v-if="editable"
              :loading="saving"
              class="ml-0!"
              @click="save"
            >
              {{ $t("websiteWorkspace.saveDraft") }}
            </el-button>
            <el-button class="ml-0!" @click="isVehiclePricesDialogVisible = true">
              {{ $t("websiteItineraryUi.packagePriceTitle") }}
            </el-button>
            <el-button
              type="primary"
              :disabled="dirty || saving"
              class="ml-0!"
              @click="openPreview"
            >
              {{
                $t(
                  plan.status === "quoted"
                    ? "websiteWorkspace.viewFrozenQuotation"
                    : "websiteWorkspace.validateAndPreview",
                )
              }}
            </el-button>
          </ItineraryWorkspaceFooter>
        </template>
      </ItineraryWorkspaceLayout>
      <InquiryMessagePreview v-if="inquiry.requirements" :key="inquiry.id" :text="inquiry.requirements" />
      <WebsiteItineraryBasics
        v-if="plan && editable"
        v-model="isBasicsDialogVisible"
        :plan="plan"
        @submit="Object.assign(plan, $event)"
      />
      <template v-if="plan && config">
        <WebsiteAttractionDialog
          :model-value="resourceDialog?.kind === 'attraction'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          :days="plan.days"
          :config="config"
          @update:model-value="closeResource"
          @submit="submitAttraction"
        />
        <WebsiteTransportDialog
          :model-value="resourceDialog?.kind === 'transport'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          :config="config"
          @update:model-value="closeResource"
          @submit="submitTransport"
        />
        <WebsiteHotelDialog
          :model-value="resourceDialog?.kind === 'hotel'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          :config="config"
          :hotel="resourceHotel"
          @update:model-value="closeResource"
          @submit="submitHotel"
        />
        <WebsiteMealDialog
          :model-value="resourceDialog?.kind === 'meal'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          :config="config"
          :initial-slot="resourceMealSlot"
          @update:model-value="closeResource"
          @submit="submitMeal"
        />
        <WebsiteTransportDialog
          :model-value="Boolean(boardTransport)"
          :day-label="$t('itineraryWorkspace.transfer.copyTag')"
          :config="config"
          :leg="boardTransport"
          @update:model-value="(visible) => !visible && closeBoardTransport()"
          @submit="finishBoardTransport"
        />
        <WebsiteVehiclePrices
          v-model="isVehiclePricesDialogVisible"
          v-model:plan="plan"
          :editable="editable"
          :dirty="dirty"
        />
        <WebsiteGuideDialog
          :model-value="resourceDialog?.kind === 'guide'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          @update:model-value="closeResource"
          @submit="(guide) => resourceDay && Object.assign(resourceDay, guide)"
        />
        <ItineraryReorderDialog
          v-model="isReorderDialogVisible"
          :days="reorderBoardDays"
          :deleted-days="deletedBoardDays"
          :start-date="plan.startDate"
          :readonly="!editable || saving"
          transfer
          :draft="plan.reorderDraft"
          :create-day="createBoardDay"
          :stash="stashReorder"
          :edit-transport="editBoardTransport"
          :transport-item="transportBoardItem"
          @apply="applyReorder"
        />
      </template>
    </template>
    <WebsiteQuotationPreview
      v-model="previewVisible"
      :preview="preview"
      :confirmed="plan?.status === 'quoted'"
      :can-confirm="canConfirm"
      :can-download="canDownload"
      :loading="saving"
      :can-locate-issue="canLocatePreviewIssue"
      @confirm="confirm"
      @print="print"
      @locate-issue="locatePreviewIssue"
    />
  </PageShell>
</template>
<script setup lang="ts">
import { computed, markRaw, ref, useTemplateRef, watch } from "vue";
import { Bowl, Location, OfficeBuilding, Service, User, Van } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePageTitle } from "@/composables/usePageTitle";
import { ElMessage } from "element-plus";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { WebsiteDay, WebsiteHotelStay, WebsiteItem, WebsiteLeg, WebsiteMeal, WebsiteValidation } from "@/types/website";
import InquiryMessagePreview from "@/views/inquiries/itineraries/components/InquiryMessagePreview.vue";
import ItineraryWorkspaceLayout from "@/views/inquiries/itineraries/components/ItineraryWorkspaceLayout.vue";
import ItineraryWorkspaceFooter from "@/views/inquiries/itineraries/components/ItineraryWorkspaceFooter.vue";
import ItineraryReorderDialog from "@/views/inquiries/itineraries/components/ItineraryReorderDialog.vue";
import type { DayOrderChange, DayOrderIssue, ReorderBoardDay, ReorderBoardItem } from "@/views/inquiries/itineraries/reorder-board";
import { emptyDay, isMealArranged, TRANSPORT_OPTIONS } from "../options";
import { reorderWebsiteDays, WEBSITE_BOARD_GROUPS, websiteGuideBoardId } from "./day-order";
import { insertWebsiteEvent, updateWebsiteMeal } from "./event-order";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import WebsiteDayCard, { type WebsiteResourceDialogKind } from "./components/WebsiteDayCard.vue";
import WebsiteItineraryBasics from "./components/WebsiteItineraryBasics.vue";
import WebsiteVehiclePrices from "./components/WebsiteVehiclePrices.vue";
import WebsiteQuotationPreview from "./components/WebsiteQuotationPreview.vue";
import WebsiteAttractionDialog from "./components/WebsiteAttractionDialog.vue";
import WebsiteTransportDialog from "./components/WebsiteTransportDialog.vue";
import WebsiteHotelDialog from "./components/WebsiteHotelDialog.vue";
import WebsiteMealDialog from "./components/WebsiteMealDialog.vue";
import WebsiteGuideDialog from "./components/WebsiteGuideDialog.vue";
defineOptions({ name: "WebsiteItineraryWorkspace" });
/** 霖熹 Lynxtour 品牌色：酒红（取自 logo #811e21，色相略偏梅红以区别危险红）作主色，金色仅作装饰条。 */
const LYNXTOUR_ACCENT = "#862742";
const LYNXTOUR_GOLD = "#f1b92e";
/** 顺序看板分组图标，与日卡资源按钮一致 */
const BOARD_ICONS = {
  attractions: markRaw(Location),
  legs: markRaw(Van),
  hotels: markRaw(OfficeBuilding),
  meals: markRaw(Bowl),
  services: markRaw(Service),
  guide: markRaw(User),
};
const router = useRouter();
const { t, locale } = useI18n();
const isBasicsDialogVisible = ref(false);
const isReorderDialogVisible = ref(false);
const isVehiclePricesDialogVisible = ref(false);
const reorderIssues = ref<DayOrderIssue[]>([]);
const workspaceLayout = useTemplateRef<InstanceType<typeof ItineraryWorkspaceLayout>>("workspaceLayout");
/** 资源弹窗目标：按日 ID 定位，避免弹窗期间日序变化写错日 */
const resourceDialog = ref<{
  kind: WebsiteResourceDialogKind;
  dayId: string;
  target?: number | WebsiteMeal["slot"];
  afterId?: string;
}>();
const {
  inquiry,
  plans,
  plan,
  config,
  currentConfig,
  loading,
  saving,
  error,
  dirty,
  editable,
  canCreate,
  canConfirm,
  canDownload,
  preview,
  previewVisible,
  skeletonId,
  save,
  create,
  copy,
  reset,
  selectPlan,
  useCurrentConfig,
  generate,
  openPreview,
  confirm,
  print,
  addDay,
} = useWebsiteWorkspace();
usePageTitle(() =>
  inquiry.value ? t("itineraryWorkspace.pageTitles.website", { name: inquiry.value.customerName }) : "",
);

const dayEntries = computed(() =>
  (plan.value?.days ?? []).map((day) => ({
    id: day.id,
    label: `D${day.dayNumber}`,
    summary: dayRoute(day),
  })),
);
const resourceDay = computed(() => plan.value?.days.find((day) => day.id === resourceDialog.value?.dayId));
const resourceDayLabel = computed(() => (resourceDay.value ? `D${resourceDay.value.dayNumber}` : ""));
const resourceHotel = computed(() => {
  const target = resourceDialog.value?.target;
  return typeof target === "number" && target >= 0 ? resourceDay.value?.hotels[target] : undefined;
});
const resourceMealSlot = computed<WebsiteMeal["slot"]>(() => {
  const target = resourceDialog.value?.target;
  return typeof target === "string" ? target : "lunch";
});
const boardTransport = ref<WebsiteLeg>();
let resolveBoardTransport: ((leg: WebsiteLeg | undefined) => void) | undefined;
function editBoardTransport(leg: WebsiteLeg): Promise<WebsiteLeg | undefined> {
  boardTransport.value = { ...leg };
  return new Promise(resolve => { resolveBoardTransport = resolve; });
}
function closeBoardTransport() {
  resolveBoardTransport?.(undefined);
  resolveBoardTransport = undefined;
  boardTransport.value = undefined;
}
function finishBoardTransport(leg: WebsiteLeg) {
  resolveBoardTransport?.(leg);
  resolveBoardTransport = undefined;
  boardTransport.value = undefined;
}
function transportBoardItem(leg: WebsiteLeg): ReorderBoardItem {
  return {
    id: leg.id,
    label: `${cityName(leg.fromCityId)} → ${cityName(leg.toCityId)}`,
    detail: [transportLabel(leg.mode), localName(leg)].filter(Boolean).join(" · "),
    icon: BOARD_ICONS.legs,
    transportLeg: leg,
  };
}
function boardDay(day: WebsiteDay): ReorderBoardDay {
  const result: ReorderBoardDay = {
    id: day.id,
    title: dayRoute(day) || t("itineraryWorkspace.notArranged"),
    dayNumber: day.dayNumber,
    noOvernight: day.overnightCityId === null,
    date: plan.value?.deletedDays?.find((entry) => entry.day.id === day.id)?.originalDate ?? null,
    groups: [
      {
        key: WEBSITE_BOARD_GROUPS.attractions,
        label: t("websiteItineraryUi.attractions"),
        icon: BOARD_ICONS.attractions,
        sortable: true,
        transferable: true,
        items: day.items.map((item) => ({
          id: item.id,
          label: localName(item) || t("websiteItineraryUi.manualAttractionOrComponent"),
          detail: attractionKindLabel(item.attractionId),
        })),
      },
      {
        key: WEBSITE_BOARD_GROUPS.legs,
        label: t("websiteItineraryUi.transportLegs"),
        icon: BOARD_ICONS.legs,
        transferable: true,
        items: day.legs.map(transportBoardItem),
      },
      {
        key: WEBSITE_BOARD_GROUPS.hotels,
        label: t("websiteItineraryUi.hotelPlans"),
        icon: BOARD_ICONS.hotels,
        transferable: true,
        scope: day.hotels.length > 1 ? t("itineraryWorkspace.scopes.alternatives") : undefined,
        // 不住宿时仍列出已有酒店，便于移出。
        items: [
          ...day.hotels.map((hotel) => ({
            id: hotel.id,
            label: `${hotel.tier} · ${localName(hotel) || "-"}`,
            detail: cityName(hotel.cityId),
            slot: `hotel-${hotel.tier}`,
            hotelCityId: hotel.cityId,
          })),
        ],
      },
      {
        key: WEBSITE_BOARD_GROUPS.meals,
        label: t("itineraryWorkspace.groups.meals"),
        icon: BOARD_ICONS.meals,
        transferable: true,
        items: day.meals.map((meal) => ({
          id: meal.id,
          label: `${t(`itinerary.meals.${meal.slot}`)} · ${t(`websiteInquiry.feeStates.${meal.feeState}`)}`,
          detail: (locale.value === "en" ? meal.restaurantEn : meal.restaurantZh) || meal.restaurantZh || undefined,
          slot: `meal-${meal.slot}`,
          placeholder: !isMealArranged(meal),
        })),
      },
      {
        key: WEBSITE_BOARD_GROUPS.services,
        label: t("itineraryWorkspace.groups.guideAndServices"),
        icon: BOARD_ICONS.services,
        transferable: true,
        items: [
          ...(day.guideLanguage
            ? [{
              id: websiteGuideBoardId(day.id),
              label: `${t("itineraryWorkspace.actions.guide")} · ${day.guideLanguage}`,
              slot: "guide",
              icon: BOARD_ICONS.guide,
            }]
            : []),
          ...day.services.map((service) => ({ id: service.id, label: localName(service) || "-" })),
        ],
      },
    ],
  };
  const items = result.groups.flatMap(group => group.items.map(item => ({ ...item, icon: item.icon ?? group.icon })));
  const byId = new Map(items.map(item => [item.id, item]));
  const ordered = (day.eventOrder ?? []).flatMap(id => { const item = byId.get(id); byId.delete(id); return item ? [item] : []; });
  result.groups = [{ key: "events", label: t("itineraryWorkspace.eventOrder"), sortable: true, transferable: true, items: [...ordered, ...byId.values()] }];
  return result;
}
const allReorderBoardDays = computed(() => [...(plan.value?.days ?? []), ...(plan.value?.deletedDays ?? []).map(entry => entry.day)].map(boardDay));
function createBoardDay(id: string) { return boardDay({ ...emptyDay(1), id }); }

watch(plan, () => {
  isBasicsDialogVisible.value = false;
  isVehiclePricesDialogVisible.value = false;
  isReorderDialogVisible.value = false;
  closeBoardTransport();
  resourceDialog.value = undefined;
});
watch(
  () => plan.value?.id,
  () => {
    reorderIssues.value = [];
  },
);

const dayCards = new Map<string, InstanceType<typeof WebsiteDayCard>>();
function setDayCard(id: string, card: unknown) {
  if (card) dayCards.set(id, card as InstanceType<typeof WebsiteDayCard>);
  else dayCards.delete(id);
}
function canLocatePreviewIssue(issue: WebsiteValidation) {
  if (!plan.value) return false;
  if (issue.dayNumber !== undefined)
    return plan.value.days.some(day => day.dayNumber === issue.dayNumber);
  if (issue.code === "REORDER_PENDING" || issue.code === "VAL-E01") return true;
  if (issue.code === "VAL-E09") return true;
  return editable.value && (issue.code === "VAL-E07" || issue.code === "VAL-E08" || issue.code === "ITINERARY_INVALID" || issue.code === "REQUIREMENTS_MISMATCH");
}
async function locatePreviewIssue(issue: WebsiteValidation) {
  if (saving.value || !canLocatePreviewIssue(issue)) return;
  const day = plan.value?.days.find(day => day.dayNumber === issue.dayNumber);
  if (day) {
    await workspaceLayout.value?.scrollToDay(day.id);
    dayCards.get(day.id)?.openValidationIssue(issue.code);
  } else if (issue.code === "REORDER_PENDING" || issue.code === "VAL-E01") {
    isReorderDialogVisible.value = true;
  } else if (issue.code === "VAL-E07" || issue.code === "VAL-E09") {
    isVehiclePricesDialogVisible.value = true;
  } else {
    isBasicsDialogVisible.value = true;
  }
}
function localName(item: { nameZh: string; nameEn: string }) {
  return (locale.value === "en" ? item.nameEn : item.nameZh) || item.nameZh || item.nameEn;
}
function cityName(id: string | null) {
  const city = config.value?.cities.find((item) => item.id === id);
  return city ? localName(city) : "";
}
function dayRoute(day: WebsiteDay) {
  const from = cityName(day.departCityId);
  const to = cityName(day.endCityId);
  return from || to ? `${from || "-"} → ${to || "-"}` : "";
}
function transportLabel(mode: string) {
  const option = TRANSPORT_OPTIONS.find((item) => item.value === mode);
  return option ? t(option.labelKey) : "";
}
function attractionKindLabel(attractionId: string | null) {
  const kind = config.value?.attractions.find((item) => item.id === attractionId)?.kind;
  return kind ? t(`websiteItineraryUi.attractionKinds.${kind}`) : t("websiteItineraryUi.sourceManual");
}
function openResource(index: number, kind: WebsiteResourceDialogKind, target?: number | WebsiteMeal["slot"]) {
  const day = plan.value?.days[index];
  if (!day || !editable.value) return;
  resourceDialog.value = { kind, dayId: day.id, target };
}
function closeResource(visible: boolean) {
  if (!visible) resourceDialog.value = undefined;
}
function openInsertResource(index: number, kind: "attraction" | "transport" | "meal", afterId: string) {
  openResource(index, kind);
  if (!resourceDialog.value) return;
  resourceDialog.value.afterId = afterId;
  if (kind === "meal") {
    resourceDialog.value.target = resourceDay.value?.meals.find(meal => !isMealArranged(meal))?.slot ?? "lunch";
  }
}
function submitAttraction(item: WebsiteItem) {
  const day = resourceDay.value;
  if (!day) return;
  day.items.push(item);
  if (resourceDialog.value?.afterId) insertWebsiteEvent(day, item.id, resourceDialog.value.afterId);
}
function submitTransport(leg: WebsiteLeg) {
  const day = resourceDay.value;
  if (!day) return;
  day.legs.push(leg);
  if (resourceDialog.value?.afterId) insertWebsiteEvent(day, leg.id, resourceDialog.value.afterId);
}
function submitHotel(hotel: WebsiteHotelStay) {
  const day = resourceDay.value;
  if (!day) return;
  // 提交前复核同日档次唯一；后端约束仍保留。
  if (day.hotels.some((item) => item.id !== hotel.id && item.tier === hotel.tier)) {
    ElMessage.error(t("websiteItineraryUi.hotelTierTaken"));
    return;
  }
  const index = day.hotels.findIndex((item) => item.id === hotel.id);
  if (index >= 0) day.hotels.splice(index, 1, hotel);
  else day.hotels.push(hotel);
}
function submitMeal(meal: WebsiteMeal) {
  const day = resourceDay.value;
  if (!day) return;
  updateWebsiteMeal(day, meal);
  if (resourceDialog.value?.afterId) insertWebsiteEvent(day, meal.id, resourceDialog.value.afterId);
}
const reorderBoardDays = computed(() => allReorderBoardDays.value.slice(0, plan.value?.days.length ?? 0));
const deletedBoardDays = computed(() => allReorderBoardDays.value.slice(plan.value?.days.length ?? 0));

async function stashReorder(change: DayOrderChange) {
  if (!plan.value || !editable.value) return false;
  const previous = plan.value.reorderDraft;
  // 看板状态继续变化，暂存按纯数据复制；保存失败则撤回，避免残留未保存的暂存。
  plan.value.reorderDraft = change.draft ? JSON.parse(JSON.stringify(change.draft)) : null;
  const saved = await save();
  if (!saved && plan.value) plan.value.reorderDraft = previous;
  return saved;
}

async function applyReorder(change: DayOrderChange) {
  if (!plan.value || !editable.value) return;
  const result = reorderWebsiteDays(plan.value.days, change, plan.value.deletedDays);
  plan.value.reorderDraft = null;
  plan.value.days = result.days;
  plan.value.deletedDays = result.deletedDays;
  plan.value.duration = result.days.length;
  reorderIssues.value = result.issues;
  await save();
}
</script>
<style scoped lang="scss">
@media (max-width: 650px) {
  .website-itinerary-page__overview {
    :deep(.el-page-header__header) {
      flex-wrap: wrap;
      gap: 12px;
    }

    :deep(.el-page-header__left) {
      margin-right: 0;
    }

    :deep(.el-page-header__back) {
      flex-shrink: 0;
      white-space: nowrap;
    }
  }
}
</style>
