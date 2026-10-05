<template>
  <div v-loading="loading || saving" :inert="loading || saving" class="page-container min-h-full">
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
    <template v-if="inquiry">
      <el-card shadow="never" class="sticky top-0 z-10 mb-4">
        <el-page-header @back="router.push('/website-inquiries')">
          <template #content>
            <div class="flex items-center gap-3">
              <el-tag>独立站</el-tag>
              <el-select
                :model-value="plan?.id"
                placeholder="选择行程"
                class="w-[min(380px,50vw)]!"
                @change="selectPlan"
              >
                <el-option
                  v-for="record in plans"
                  :key="record.id"
                  :value="record.id"
                  :label="`${record.title} · ${record.status === 'draft' ? '草稿' : '已确认'}`"
                />
              </el-select>
            </div>
          </template>
          <template #extra>
            <el-button v-if="canCreate" type="primary" @click="create">新增行程</el-button>
          </template>
        </el-page-header>
        <div class="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <span>{{ inquiry.code }}</span>
          <span>客户：{{ inquiry.customerName }}</span>
          <span>计划 {{ inquiry.plannedDays }} 天</span>
          <span>负责计调：{{ inquiry.owner }}</span>
          <span>{{ INQUIRY_STATUS_LABELS[inquiry.status] }}</span>
        </div>
        <el-collapse class="mt-3">
          <el-collapse-item title="询盘原文与内部备注" name="requirements">
            <p class="whitespace-pre-wrap">{{ inquiry.requirements }}</p>
            <p v-if="inquiry.internalRemark" class="whitespace-pre-wrap">
              内部备注：{{ inquiry.internalRemark }}
            </p>
          </el-collapse-item>
        </el-collapse>
      </el-card>
      <template v-if="plan && config">
        <el-alert
          v-if="!config.cities.length"
          title="还没有独立站城市配置。请先在“旅游资源库 → 独立站资源配置”维护城市、景点和双语模板，再手工编排或生成草案。"
          type="info"
          :closable="false"
          class="mb-4"
        />
        <el-alert
          v-if="plan.configVersion !== currentConfig?.version && plan.status === 'draft'"
          title="当前草稿使用历史配置，确认报价前需明确切换至当前配置并核对失效引用。"
          type="warning"
          :closable="false"
          class="mb-4"
        />
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <el-tag>{{ plan.status === "draft" ? "草稿" : "已确认报价，行程锁定" }}</el-tag>
          <span>所用配置 v{{ plan.configVersion }}／当前 v{{ currentConfig?.version }}</span>
          <el-button
            v-if="editable && plan.configVersion !== currentConfig?.version"
            @click="useCurrentConfig"
            >使用当前配置</el-button
          >
          <el-button v-if="canCreate && plan.status === 'quoted'" @click="copy"
            >复制为新行程修改</el-button
          >
          <el-tag v-if="dirty" type="warning">有未保存修改</el-tag>
        </div>
        <WebsiteItineraryBasics :plan="plan" :editable="editable" />
        <div v-if="editable" class="flex flex-wrap gap-3 mb-4">
          <el-select
            v-model="skeletonId"
            filterable
            clearable
            placeholder="选择已维护城市骨架"
            class="w-[300px]!"
          >
            <el-option
              v-for="skeleton in config.skeletons.filter((item) => item.status === 'enabled')"
              :key="skeleton.id"
              :value="skeleton.id"
              :label="`${skeleton.nameZh} · ${skeleton.days.length} 天`"
            />
          </el-select>
          <el-button
            :disabled="!skeletonId || dirty || plan.configVersion !== currentConfig?.version"
            @click="generate"
            >生成可编辑草案</el-button
          >
          <el-button :disabled="!config.cities.length" @click="addDay">手工添加一天</el-button>
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
        <el-empty
          v-if="!plan.days.length"
          description="尚未编排每日行程，可手工添加一天，或选择已维护的城市骨架生成草案。"
        />
        <WebsiteVehiclePrices :plan="plan" :editable="editable" />
        <div
          class="sticky bottom-0 z-10 flex justify-end gap-3 p-4 [background:var(--el-bg-color)] [border-top:1px_solid_var(--el-border-color)]"
        >
          <el-button v-if="editable" :disabled="!dirty || saving" @click="reset"
            >取消修改</el-button
          >
          <el-button v-if="editable" type="primary" :loading="saving" @click="save"
            >保存行程草稿</el-button
          >
          <el-button :disabled="dirty || saving" @click="openPreview">{{
            plan.status === "quoted" ? "查看／导出冻结报价" : "校验与双语预览"
          }}</el-button>
        </div>
      </template>
      <el-empty v-else description="当前询盘还没有行程" />
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
import { INQUIRY_STATUS_LABELS } from "../options";
import { useWebsiteWorkspace } from "./useWebsiteWorkspace";
import WebsiteDayCard from "./components/WebsiteDayCard.vue";
import WebsiteItineraryBasics from "./components/WebsiteItineraryBasics.vue";
import WebsiteVehiclePrices from "./components/WebsiteVehiclePrices.vue";
import WebsiteQuotationPreview from "./components/WebsiteQuotationPreview.vue";
defineOptions({ name: "WebsiteItineraryWorkspace" });
const router = useRouter();
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
