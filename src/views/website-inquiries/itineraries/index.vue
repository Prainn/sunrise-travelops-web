<template>
  <div
    v-loading="loading || saving"
    :inert="loading || saving"
    class="page-container website-itinerary-page h-auto min-h-full overflow-visible p-0 gap-0"
  >
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      class="mb-4"
    />
    <template v-if="inquiry">
      <header
        class="website-itinerary-page__header sticky top-0 z-[10] [background:var(--page-bg)] [box-shadow:var(--el-box-shadow-light)]"
      >
        <el-card shadow="never" class="website-itinerary-page__overview rounded-0! border-0!">
          <el-page-header @back="router.push('/website-inquiries')">
            <template #content>
              <div class="flex items-center gap-3">
                <el-tag>{{ $t("websiteWorkspace.businessLabel") }}</el-tag>
                <el-select
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
            class="flex flex-wrap items-center justify-between gap-3 mt-[12px] py-[12px] [border-top:1px_solid_var(--el-border-color-lighter)] [border-bottom:1px_solid_var(--el-border-color-lighter)]"
          >
            <div class="min-w-0 flex flex-wrap items-center gap-2">
              <h2 class="m-0 text-[18px] break-words">
                {{ plan.title }}
              </h2>
              <span v-if="plan.startDate" class="text-sm text-[var(--el-text-color-secondary)]">
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
          <div class="grid grid-cols-2 gap-x-[18px] gap-y-[12px] mt-[12px] text-sm max-[650px]:grid-cols-1">
            <span class="flex flex-wrap items-center gap-[6px]">
              <small class="text-[var(--el-text-color-secondary)]">{{ $t("inquiry.code") }}</small>
              {{ inquiry.code }}
              <el-tag size="small" effect="plain">{{ $t(`inquiry.statuses.${inquiry.status}`) }}</el-tag>
            </span>
            <span class="flex gap-[6px]">
              <small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("websiteInquiry.customerName") }}</small>
              {{ inquiry.customerName }}
            </span>
            <span class="flex gap-[6px]">
              <small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.owner") }}</small>
              {{ inquiry.owner }}
            </span>
            <span class="flex gap-[6px]">
              <small class="shrink-0 text-[var(--el-text-color-secondary)]">{{ $t("inquiry.plannedDays") }}</small>
              {{ $t("websiteInquiry.dayCount", { days: inquiry.plannedDays }) }}
            </span>
          </div>
        </el-card>
      </header>
      <InquiryMessagePreview v-if="inquiry.requirements" :key="inquiry.id" :text="inquiry.requirements" />
      <main class="website-itinerary-page__workspace mx-4 mt-4">
        <template v-if="plan && config">
          <el-alert
            v-if="!config.cities.length"
            :title="$t('websiteWorkspace.noCityConfig')"
            type="info"
            :closable="false"
            class="mb-4"
          />
          <el-alert
            v-if="plan.configVersion !== currentConfig?.version && plan.status === 'draft'"
            :title="$t('websiteWorkspace.historicalConfigWarning')"
            type="warning"
            :closable="false"
            class="mb-4"
          />
          <div class="flex flex-wrap items-center justify-between gap-3 min-h-[48px] m-[24px_0_14px]">
            <h3 class="m-0">
              {{ $t("itinerary.dailySchedule") }}
            </h3>
            <div v-if="editable" class="flex flex-wrap gap-3">
              <el-select
                v-model="skeletonId"
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
            @remove="removeDay(index)"
            @move="moveDay(index, $event)"
          />
          <el-empty v-if="!plan.days.length" :description="$t('websiteWorkspace.noDays')" />
          <WebsiteVehiclePrices :plan="plan" :editable="editable" class="rounded-[10px]" />
        </template>
        <el-empty v-else :description="$t('websiteWorkspace.noItineraries')" />
      </main>
      <footer
        v-if="plan && config"
        class="website-itinerary-page__footer sticky bottom-0 z-[10] flex flex-wrap justify-between items-center gap-3 min-h-[64px] p-[12px_18px] [background:var(--el-bg-color)] [box-shadow:var(--el-box-shadow-light)]"
      >
        <span class="text-sm text-[var(--el-text-color-secondary)]">
          {{ $t("websiteWorkspace.plannedDaysSummary", { days: plan.duration }) }}
        </span>
        <div class="flex flex-wrap gap-[12px]">
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
      </footer>
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
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
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
.website-itinerary-page__overview :deep(.el-card__body) {
  padding: 14px 18px 12px;
}

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
