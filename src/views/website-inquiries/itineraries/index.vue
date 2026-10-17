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
      <SectionCard class="website-itinerary-page__overview sticky top-0 z-[10]">
        <el-page-header @back="router.push('/website-inquiries')">
          <template #content>
            <div class="flex items-center gap-3">
              <el-tag>{{ $t("websiteWorkspace.businessLabel") }}</el-tag>
              <el-select
                autocomplete="new-password"
                :model-value="plan?.id"
                :placeholder="$t('websiteWorkspace.selectItinerary')"
                class="w-[min(380px,50vw)]!"
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
              {{ $t("websiteWorkspace.addItinerary") }}
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
            <el-button v-if="editable" @click="isBasicsDialogVisible = true">
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
              @click="useCurrentConfig"
            >
              {{ $t("websiteWorkspace.useCurrentConfig") }}
            </el-button>
            <el-button v-if="canCreate && plan.status === 'quoted'" @click="copy">
              {{ $t("websiteWorkspace.copyToEdit") }}
            </el-button>
            <el-tag v-if="dirty" type="warning">
              {{ $t("websiteWorkspace.unsavedChanges") }}
            </el-tag>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-x-[18px] gap-y-3 mt-3 text-sm max-[650px]:grid-cols-1">
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
      <InquiryMessagePreview v-if="inquiry.requirements" :key="inquiry.id" :text="inquiry.requirements" />
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
        <div class="flex flex-wrap items-center justify-between gap-3 min-h-[48px]">
          <h3 class="m-0 text-[16px] text-strong font-600">
            {{ $t("itinerary.dailySchedule") }}
          </h3>
          <div v-if="editable" class="flex flex-wrap gap-3">
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
        <WebsiteDayCard
          v-for="(day, index) in plan.days"
          :key="day.id"
          :day="day"
          :config="config"
          :editable="editable && !saving"
          :start-date="plan.startDate"
          :index="index"
          :last="index === plan.days.length - 1"
          @update:day="plan.days.splice(index, 1, $event)"
          @remove="removeDay(index)"
          @move="moveDay(index, $event)"
        />
        <SectionCard v-if="!plan.days.length">
          <FeedbackState :title="$t('websiteWorkspace.noDays')" />
        </SectionCard>
        <WebsiteVehiclePrices v-model:plan="plan" :editable="editable" />
        <SectionCard
          padding="compact"
          class="sticky bottom-0 z-[10]"
          body-class="flex flex-wrap justify-between items-center gap-3"
        >
          <span class="text-sm text-muted">
            {{ $t("websiteWorkspace.plannedDaysSummary", { days: plan.duration }) }}
          </span>
          <div class="flex flex-wrap gap-3">
            <el-button v-if="editable" :disabled="!dirty || saving" @click="reset">
              {{ $t("websiteWorkspace.cancelChanges") }}
            </el-button>
            <el-button v-if="editable" :loading="saving" @click="save">
              {{ $t("websiteWorkspace.saveDraft") }}
            </el-button>
            <el-button type="primary" :disabled="dirty || saving" @click="openPreview">
              {{
                $t(
                  plan.status === "quoted"
                    ? "websiteWorkspace.viewFrozenQuotation"
                    : "websiteWorkspace.validateAndPreview",
                )
              }}
            </el-button>
          </div>
        </SectionCard>
      </template>
      <SectionCard v-else>
        <FeedbackState :title="$t('websiteWorkspace.noItineraries')" />
      </SectionCard>
      <WebsiteItineraryBasics
        v-if="plan && editable"
        v-model="isBasicsDialogVisible"
        :plan="plan"
        @submit="Object.assign(plan, $event)"
      />
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
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import InquiryMessagePreview from "@/views/inquiries/itineraries/components/InquiryMessagePreview.vue";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import WebsiteDayCard from "./components/WebsiteDayCard.vue";
import WebsiteItineraryBasics from "./components/WebsiteItineraryBasics.vue";
import WebsiteVehiclePrices from "./components/WebsiteVehiclePrices.vue";
import WebsiteQuotationPreview from "./components/WebsiteQuotationPreview.vue";
defineOptions({ name: "WebsiteItineraryWorkspace" });
const router = useRouter();
const { locale } = useI18n();
const isBasicsDialogVisible = ref(false);
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
watch(plan, () => { isBasicsDialogVisible.value = false; });
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
