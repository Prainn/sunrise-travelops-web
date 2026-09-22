<template>
  <el-card shadow="never">
    <template #header>
      {{ $t("itinerary.sharedTripCosts") }}
    </template>
    <el-collapse v-model="expanded" class="mb-5">
      <el-collapse-item v-for="section in sections" :key="section.kind" :name="section.kind">
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t(section.titleKey) }}</strong>
            <span>{{ money(calculation?.[section.totalKey]) }}</span>
            <el-button
              size="small"
              type="primary"
              @click.stop="openOtherCost(section)"
              @keydown.stop
            >
              {{ $t("itinerary.otherCosts") }}
            </el-button>
            <span class="ml-auto text-[var(--el-color-primary)]">{{
              $t(
                expanded.includes(section.kind)
                  ? "itinerary.collapseCostDetails"
                  : "itinerary.expandCostDetails",
              )
            }}</span>
          </div>
        </template>
        <el-table
          :data="current ? (calculation?.[section.detailsKey] ?? []) : []"
          border
          class="mb-4"
        >
          <el-table-column :label="$t('itinerary.costDay')" prop="dayNumber" width="80" />
          <el-table-column :label="$t('itinerary.costItem')" prop="resourceName" min-width="180" />
          <el-table-column :label="$t('itinerary.costUnitPerPerson')" min-width="130">
            <template #default="{ row }">
              {{ money(row.unitCost) }}
            </template>
          </el-table-column>
          <el-table-column :label="$t('itinerary.costQuantity')" prop="quantity" width="90" />
          <el-table-column :label="$t('itinerary.costSubtotal')" min-width="120">
            <template #default="{ row }">
              {{ money(row.totalCost) }}
            </template>
          </el-table-column>
        </el-table>
      </el-collapse-item>
      <el-collapse-item name="guide">
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t("itinerary.guideServiceSection") }}</strong>
            <span>{{ money(calculation?.guideCost) }}</span>
            <el-button
              size="small"
              type="primary"
              @click.stop="openOtherCost(guideOtherSection)"
              @keydown.stop
            >
              {{ $t("itinerary.otherCosts") }}
            </el-button>
            <span class="ml-auto text-[var(--el-color-primary)]">{{
              $t(
                expanded.includes("guide")
                  ? "itinerary.collapseCostDetails"
                  : "itinerary.expandCostDetails",
              )
            }}</span>
          </div>
        </template>
        <el-descriptions
          v-if="guidePlan"
          :column="2"
          border
          size="small"
          class="guide-details mb-4"
        >
          <el-descriptions-item :label="$t('planning.secondLanguage')">
            {{
              guidePlan.secondLanguage
                ? $t(`planning.languages.${guidePlan.secondLanguage}`)
                : $t("common.notSet")
            }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('planning.shopping')">
            {{ $t(guidePlan.shopping ? "common.yes" : "common.no") }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('planning.dailyPrice')">
            ¥{{ formatMoney(guidePlan.dailyPrice) }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('planning.serviceDays')">
            {{ guidePlan.serviceDays }}
          </el-descriptions-item>
        </el-descriptions>
        <el-empty v-else :description="$t('planning.noMatchingGuide')" :image-size="48" />
      </el-collapse-item>
      <el-collapse-item name="staffRooms">
        <template #title>
          <div class="flex flex-wrap items-center gap-4 w-full pr-3">
            <strong>{{ $t("itinerary.staffRoomSection") }}</strong>
            <span>{{ money(calculation?.options[0]?.staffRoomTotal) }}</span>
            <el-button
              size="small"
              type="primary"
              @click.stop="openOtherCost(staffRoomOtherSection)"
              @keydown.stop
            >
              {{ $t("itinerary.otherCosts") }}
            </el-button>
            <span class="ml-auto text-[var(--el-color-primary)]">{{
              $t(
                expanded.includes("staffRooms")
                  ? "itinerary.collapseCostDetails"
                  : "itinerary.expandCostDetails",
              )
            }}</span>
          </div>
        </template>
        <el-form inline label-position="top" :disabled="!editable">
          <el-form-item v-for="destination in destinations" :key="destination" :label="destination">
            <el-input-number
              :model-value="staffRoomTotalFor(destination) ?? undefined"
              :min="0"
              :max="1e9"
              :precision="2"
              :controls="false"
              @update:model-value="updateStaffRoomTotal(destination, $event)"
            />
          </el-form-item>
        </el-form>
      </el-collapse-item>
    </el-collapse>
    <el-dialog
      v-model="otherCostVisible"
      append-to-body
      width="min(520px, 92vw)"
      :title="activeSection ? `${$t(activeSection.titleKey)} · ${$t('itinerary.otherCosts')}` : ''"
    >
      <el-form label-position="top" :disabled="!editable" @submit.prevent="applyOtherCost">
        <template v-if="isPaxOtherSection">
          <div v-for="draft in paxOtherDrafts" :key="draft.pax" class="pax-other-cost">
            <strong>PAX {{ draft.pax }}</strong>
            <div class="pax-other-cost__fields">
              <el-form-item :label="activeSection ? $t(activeSection.amountLabelKey) : ''">
                <el-input-number
                  v-model="draft.amount"
                  :min="0"
                  :max="1e9"
                  :precision="2"
                  :controls="false"
                />
              </el-form-item>
              <el-form-item
                :label="$t('itinerary.otherCostReason')"
                :required="(draft.amount ?? 0) > 0"
                :error="draft.reasonError ? $t('itinerary.otherCostReasonRequired') : ''"
              >
                <el-input
                  v-model="draft.reason"
                  :maxlength="1000"
                  @input="draft.reasonError = false"
                />
              </el-form-item>
            </div>
          </div>
        </template>
        <template v-else>
          <el-form-item :label="activeSection ? $t(activeSection.amountLabelKey) : ''">
            <el-input-number
              v-model="otherAmount"
              :min="0"
              :max="1e9"
              :precision="2"
              :controls="false"
            />
          </el-form-item>
          <el-form-item
            :label="$t('itinerary.otherCostReason')"
            :required="(otherAmount ?? 0) > 0"
            :error="otherReasonError ? $t('itinerary.otherCostReasonRequired') : ''"
          >
            <el-input
              v-model="otherReason"
              type="textarea"
              :rows="3"
              :maxlength="1000"
              @input="otherReasonError = false"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="otherCostVisible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          v-if="editable"
          :disabled="
            isPaxOtherSection
              ? hasPaxOtherReasonError
              : otherAmount == null || (otherAmount > 0 && !otherReason.trim())
          "
          type="primary"
          @click="applyOtherCost"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type {
  ItineraryGuidePlan,
  ItineraryQuoteSettings,
  PaxQuoteCalculation,
} from "@/types/itinerary";
import { formatMoney } from "@/utils";

const props = defineProps<{
  quote: ItineraryQuoteSettings;
  guidePlans: ItineraryGuidePlan[];
  paxTiers: number[];
  calculation: PaxQuoteCalculation | null;
  destinations: string[];
  current: boolean;
  editable: boolean;
}>();
const emit = defineEmits<{
  "update-settings": [changes: Partial<Omit<ItineraryQuoteSettings, "options">>];
}>();
const expanded = ref<string[]>([]);
const guidePlan = computed(() => props.guidePlans[0]);
const sections = [
  {
    kind: "meal",
    titleKey: "itinerary.mealCost",
    amountLabelKey: "itinerary.otherCostPerPerson",
    totalKey: "mealCost",
    detailsKey: "mealDetails",
    amountKey: "mealOtherCost",
    reasonKey: "mealOtherReason",
  },
  {
    kind: "attraction",
    titleKey: "itinerary.attractionCost",
    amountLabelKey: "itinerary.otherCostPerPerson",
    totalKey: "attractionCost",
    detailsKey: "attractionDetails",
    amountKey: "attractionOtherCost",
    reasonKey: "attractionOtherReason",
  },
] as const;
type CostSection = (typeof sections)[number];
const guideOtherSection = {
  kind: "guide",
  titleKey: "itinerary.guideServiceSection",
  amountLabelKey: "itinerary.otherCostPerPerson",
} as const;
const staffRoomOtherSection = {
  kind: "staffRooms",
  titleKey: "itinerary.staffRoomSection",
  amountLabelKey: "itinerary.otherCostPerPerson",
} as const;
type OtherCostSection = CostSection | typeof guideOtherSection | typeof staffRoomOtherSection;
const activeSection = ref<OtherCostSection>();
const otherCostVisible = ref(false);
const otherAmount = ref<number>();
const otherReason = ref("");
const otherReasonError = ref(false);
const paxOtherDrafts = ref<
  Array<{ pax: number; amount?: number; reason: string; reasonError: boolean }>
>([]);
const isPaxOtherSection = computed(
  () => activeSection.value?.kind === "guide" || activeSection.value?.kind === "staffRooms",
);
const hasPaxOtherReasonError = computed(() =>
  paxOtherDrafts.value.some((draft) => (draft.amount ?? 0) > 0 && !draft.reason.trim()),
);
function openOtherCost(section: OtherCostSection) {
  activeSection.value = section;
  if (section.kind === "guide" || section.kind === "staffRooms") {
    paxOtherDrafts.value = props.paxTiers.map((pax) => {
      const cost = props.quote.paxOtherCosts.find((item) => item.pax === pax);
      return {
        pax,
        amount:
          (section.kind === "guide" ? cost?.guideOtherCost : cost?.staffRoomOtherCost) ?? undefined,
        reason:
          (section.kind === "guide" ? cost?.guideOtherReason : cost?.staffRoomOtherReason) ?? "",
        reasonError: false,
      };
    });
  } else {
    otherAmount.value = props.quote[section.amountKey] ?? undefined;
    otherReason.value = props.quote[section.reasonKey] ?? "";
  }
  otherReasonError.value = false;
  otherCostVisible.value = true;
}
function applyOtherCost() {
  if (!props.editable || !activeSection.value) return;
  if (activeSection.value.kind === "guide" || activeSection.value.kind === "staffRooms") {
    paxOtherDrafts.value.forEach((draft) => {
      draft.reasonError = (draft.amount ?? 0) > 0 && !draft.reason.trim();
    });
    if (hasPaxOtherReasonError.value) return;
    const kind = activeSection.value.kind;
    emit("update-settings", {
      paxOtherCosts: props.paxTiers.map((pax) => {
        const current = props.quote.paxOtherCosts.find((cost) => cost.pax === pax) ?? {
          pax,
          guideOtherCost: null,
          guideOtherReason: "",
          staffRoomOtherCost: null,
          staffRoomOtherReason: "",
        };
        const draft = paxOtherDrafts.value.find((item) => item.pax === pax);
        return kind === "guide"
          ? {
              ...current,
              guideOtherCost: draft?.amount ?? null,
              guideOtherReason: draft?.reason.trim() ?? "",
            }
          : {
              ...current,
              staffRoomOtherCost: draft?.amount ?? null,
              staffRoomOtherReason: draft?.reason.trim() ?? "",
            };
      }),
    });
    otherCostVisible.value = false;
    return;
  }
  otherReasonError.value = (otherAmount.value ?? 0) > 0 && !otherReason.value.trim();
  if (otherReasonError.value) return;
  emit("update-settings", {
    [activeSection.value.amountKey]: otherAmount.value ?? null,
    [activeSection.value.reasonKey]: otherReason.value.trim(),
  });
  otherCostVisible.value = false;
}

function money(value: number | undefined) {
  return props.current && value != null ? `¥${formatMoney(value)}` : "—";
}
function staffRoomTotalFor(destination: string) {
  return props.quote.staffRoomCosts.find((cost) => cost.destination === destination)?.total ?? null;
}
function updateStaffRoomTotal(destination: string, value: number | undefined) {
  emit("update-settings", {
    staffRoomCosts: props.destinations.map((city) => ({
      destination: city,
      total: city === destination ? (value ?? null) : staffRoomTotalFor(city),
    })),
  });
}
</script>

<style scoped lang="scss">
.guide-details {
  :deep(.el-descriptions__table) {
    table-layout: fixed;
  }
  :deep(.el-descriptions__label),
  :deep(.el-descriptions__content) {
    width: 25%;
  }
}
.pax-other-cost + .pax-other-cost {
  margin-top: 12px;
}
.pax-other-cost__fields {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 12px;
  margin-top: 8px;
}
</style>
