<template>
  <div v-loading="loading || saving" :inert="loading || saving" class="page-container min-h-full">
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      class="mb-4"
    />
    <template v-if="inquiry">
      <el-card shadow="never" class="sticky top-0 z-10 mb-4">
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
        <div class="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>{{ inquiry.code }}</span>
          <span>{{ $t("websiteWorkspace.customerSummary", { name: inquiry.customerName }) }}</span>
          <span>
            {{ $t("websiteWorkspace.plannedDaysSummary", { days: inquiry.plannedDays }) }}
          </span>
          <span>{{ $t("websiteWorkspace.ownerSummary", { name: inquiry.owner }) }}</span>
          <span>{{ $t(INQUIRY_STATUS_LABEL_KEYS[inquiry.status]) }}</span>
        </div>
        <el-collapse class="mt-3">
          <el-collapse-item
            :title="$t('websiteWorkspace.requirementsAndRemarks')"
            name="requirements"
          >
            <p class="whitespace-pre-wrap">
              {{ inquiry.requirements }}
            </p>
            <p v-if="inquiry.internalRemark" class="whitespace-pre-wrap">
              {{ $t("websiteWorkspace.internalRemarkSummary", { remark: inquiry.internalRemark }) }}
            </p>
          </el-collapse-item>
        </el-collapse>
      </el-card>
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
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <el-tag>
            {{
              $t(
                plan.status === "draft"
                  ? "websiteWorkspace.draft"
                  : "websiteWorkspace.quotedLocked",
              )
            }}
          </el-tag>
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
        <WebsiteItineraryBasics :plan="plan" :editable="editable" />
        <div v-if="editable" class="flex flex-wrap gap-3 mb-4">
          <el-select
            v-model="skeletonId"
            filterable
            clearable
            :placeholder="$t('websiteWorkspace.selectSkeleton')"
            class="w-[300px]!"
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
          <el-button :disabled="!config.cities.length" @click="addDay">
            {{ $t("websiteWorkspace.addDay") }}
          </el-button>
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
        <WebsiteVehiclePrices :plan="plan" :editable="editable" />
        <div
          class="sticky bottom-0 z-10 flex justify-end gap-3 p-4 [background:var(--el-bg-color)] [border-top:1px_solid_var(--el-border-color)]"
        >
          <el-button v-if="editable" :disabled="!dirty || saving" @click="reset">
            {{ $t("websiteWorkspace.cancelChanges") }}
          </el-button>
          <el-button
            v-if="editable"
            type="primary"
            :loading="saving"
            @click="save"
          >
            {{ $t("websiteWorkspace.saveDraft") }}
          </el-button>
          <el-button :disabled="dirty || saving" @click="openPreview">
            {{
              $t(
                plan.status === "quoted"
                  ? "websiteWorkspace.viewFrozenQuotation"
                  : "websiteWorkspace.validateAndPreview",
              )
            }}
          </el-button>
        </div>
      </template>
      <el-empty v-else :description="$t('websiteWorkspace.noItineraries')" />
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
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { INQUIRY_STATUS_LABEL_KEYS } from "../options";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import WebsiteDayCard from "./components/WebsiteDayCard.vue";
import WebsiteItineraryBasics from "./components/WebsiteItineraryBasics.vue";
import WebsiteVehiclePrices from "./components/WebsiteVehiclePrices.vue";
import WebsiteQuotationPreview from "./components/WebsiteQuotationPreview.vue";
defineOptions({ name: "WebsiteItineraryWorkspace" });
const router = useRouter();
const { locale } = useI18n();
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
</script>
