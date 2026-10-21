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
        <template #header>
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
                <span>
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
            :config="config"
            :editable="editable && !saving"
            :start-date="plan.startDate"
            :index="index"
            :last="index === plan.days.length - 1"
            @update:day="plan.days.splice(index, 1, $event)"
            @remove="removeDay(index)"
            @move="moveDay(index, $event)"
            @open-resource="(kind, target) => openResource(index, kind, target)"
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
          @submit="(item) => resourceDay?.items.push(item)"
        />
        <WebsiteTransportDialog
          :model-value="resourceDialog?.kind === 'transport'"
          :day-label="resourceDayLabel"
          :day="resourceDay"
          :config="config"
          @update:model-value="closeResource"
          @submit="(leg) => resourceDay?.legs.push(leg)"
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
        <WebsiteVehiclePrices
          v-model="isVehiclePricesDialogVisible"
          v-model:plan="plan"
          :editable="editable"
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
          :validate="validateReorder"
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
      @confirm="confirm"
      @print="print"
    />
  </PageShell>
</template>
<script setup lang="ts">
import { computed, markRaw, ref, useTemplateRef, watch } from "vue";
import { Bowl, Location, OfficeBuilding, Service, Van } from "@element-plus/icons-vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePageTitle } from "@/composables/usePageTitle";
import { ElMessage } from "element-plus";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import type { WebsiteDay, WebsiteHotelStay, WebsiteMeal } from "@/types/website";
import InquiryMessagePreview from "@/views/inquiries/itineraries/components/InquiryMessagePreview.vue";
import ItineraryWorkspaceLayout from "@/views/inquiries/itineraries/components/ItineraryWorkspaceLayout.vue";
import ItineraryWorkspaceFooter from "@/views/inquiries/itineraries/components/ItineraryWorkspaceFooter.vue";
import ItineraryReorderDialog from "@/views/inquiries/itineraries/components/ItineraryReorderDialog.vue";
import type { DayOrderChange, DayOrderIssue, ReorderBoardDay } from "@/views/inquiries/itineraries/reorder-board";
import { isMealArranged, TRANSPORT_OPTIONS } from "../options";
import { reorderWebsiteDays, WEBSITE_BOARD_GROUPS, websiteGuideBoardId, websiteTransferIssues } from "./day-order";
import { useResourceCityLookup } from "./resource-cities";
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
  removeDay,
  moveDay,
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
const allReorderBoardDays = computed<ReorderBoardDay[]>(() =>
  [...(plan.value?.days ?? []), ...(plan.value?.deletedDays ?? []).map((entry) => entry.day)].map((day) => ({
    id: day.id,
    title: dayRoute(day) || t("itineraryWorkspace.notArranged"),
    dayNumber: day.dayNumber,
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
        items: day.legs.map((leg) => ({
          id: leg.id,
          label: `${cityName(leg.fromCityId)} → ${cityName(leg.toCityId)}`,
          detail: [transportLabel(leg.mode), localName(leg)].filter(Boolean).join(" · "),
        })),
      },
      {
        key: WEBSITE_BOARD_GROUPS.hotels,
        label: t("websiteItineraryUi.hotelPlans"),
        icon: BOARD_ICONS.hotels,
        transferable: true,
        scope: day.hotels.length > 1 ? t("itineraryWorkspace.scopes.alternatives") : undefined,
        // 不住宿时仍列出已有酒店，便于移出；占位不可拖动。
        items: [
          ...(day.overnightCityId ? [] : [{ id: `${day.id}-no-stay`, label: t("itinerary.noOvernightStay"), placeholder: true }]),
          ...day.hotels.map((hotel) => ({
            id: hotel.id,
            label: `${hotel.tier} · ${localName(hotel) || "-"}`,
            detail: cityName(hotel.cityId),
            slot: hotel.tier,
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
          slot: meal.slot,
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
              detail: day.guideScope,
              slot: "guide",
            }]
            : []),
          ...day.services.map((service) => ({ id: service.id, label: localName(service) || "-" })),
        ],
      },
    ],
  })),
);

watch(plan, () => {
  isBasicsDialogVisible.value = false;
  isReorderDialogVisible.value = false;
  resourceDialog.value = undefined;
});
watch(
  () => plan.value?.id,
  () => {
    reorderIssues.value = [];
  },
);

const dayCards = new Map<string, { expand: () => void }>();
function setDayCard(id: string, card: unknown) {
  if (card) dayCards.set(id, card as { expand: () => void });
  else dayCards.delete(id);
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
function submitHotel(hotel: WebsiteHotelStay) {
  const day = resourceDay.value;
  if (!day) return;
  const index = day.hotels.findIndex((item) => item.id === hotel.id);
  if (index >= 0) day.hotels.splice(index, 1, hotel);
  else day.hotels.push(hotel);
}
function submitMeal(changes: Pick<WebsiteMeal, "slot" | "resourceId" | "restaurantZh" | "restaurantEn" | "feeState">) {
  const meal = resourceDay.value?.meals.find((item) => item.slot === changes.slot);
  if (meal) Object.assign(meal, changes);
}
const reorderBoardDays = computed(() => allReorderBoardDays.value.slice(0, plan.value?.days.length ?? 0));
const deletedBoardDays = computed(() => allReorderBoardDays.value.slice(plan.value?.days.length ?? 0));

const resourceCities = useResourceCityLookup();
// 城市对应关系取自当前行程绑定的配置版本，切换行程或配置后重新读取。
watch(() => [plan.value?.id, config.value?.version], () => resourceCities.reset());
function validateReorder(change: DayOrderChange): DayOrderIssue[] {
  if (!plan.value || !config.value) return [];
  return [
    ...reorderWebsiteDays(plan.value.days, change, plan.value.deletedDays).issues,
    ...websiteTransferIssues(plan.value.days, change, plan.value.deletedDays ?? [], { config: config.value, ...resourceCities }),
  ];
}

function applyReorder(change: DayOrderChange) {
  if (!plan.value || !editable.value) return;
  const result = reorderWebsiteDays(plan.value.days, change, plan.value.deletedDays);
  plan.value.days = result.days;
  plan.value.deletedDays = result.deletedDays;
  plan.value.duration = result.days.length;
  reorderIssues.value = result.issues;
  ElMessage.success(t("itineraryWorkspace.orderApplied"));
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
