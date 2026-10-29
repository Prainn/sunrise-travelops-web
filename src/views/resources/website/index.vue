<template>
  <PageShell v-loading="loading || saving" :inert="saving">
    <FilterBar v-if="user.userInfo.scope === 'headquarters'" :resettable="false">
      <el-form-item :label="$t('websiteInquiry.businessUnit')">
        <el-select v-model="businessUnit" autocomplete="new-password" :disabled="saving">
          <el-option
            v-for="unit in ['linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`websiteInquiry.businessUnits.${unit}`)"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
    <FilterBar v-if="activeTab === 'routes'" @reset="resetRouteSearch">
      <el-form-item class="filter-bar__wide" :label="$t('common.keywords')">
        <el-input
          v-model="routeKeyword"
          clearable
          :placeholder="$t('websiteReport.routeSearch')"
          @keyup.enter="searchRoutes"
        />
      </el-form-item>
      <template #actions>
        <el-button type="primary" @click="searchRoutes">
          {{ $t('common.search') }}
        </el-button>
      </template>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="refreshPage">
        <el-tabs v-model="activeTab" class="website-config-tabs flex-1 min-w-0">
          <el-tab-pane :label="$t('websiteConfig.tabs.cities')" name="cities" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.attractions')" name="attractions" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.hotels')" name="hotels" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.routes')" name="routes" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.patterns')" name="patterns" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.skeletons')" name="skeletons" :disabled="saving" />
          <el-tab-pane :label="$t('websiteConfig.tabs.templates')" name="templates" :disabled="saving" />
        </el-tabs>
      </TableToolbar>
      <FeedbackState
        v-if="error"
        type="error"
        :description="error"
        retryable
        @retry="refreshPage"
      />
      <template v-else-if="result">
        <div :key="`${businessUnit}:${activeTab}`" class="flex-1 min-h-0 overflow-hidden">
          <WebsiteConfigCities
            v-if="activeTab === 'cities'"
            :rows="result.list as WebsiteCity[]"
            v-bind="editorProps"
          />
          <WebsiteConfigAttractions
            v-else-if="activeTab === 'attractions'"
            :rows="result.list as WebsiteAttraction[]"
            v-bind="editorProps"
          />
          <WebsiteConfigHotels
            v-else-if="activeTab === 'hotels'"
            :rows="result.list as WebsiteConfigHotel[]"
            v-bind="editorProps"
          />
          <WebsiteConfigRoutes
            v-else-if="activeTab === 'routes'"
            :rows="result.list as WebsiteRoute[]"
            v-bind="editorProps"
          />
          <WebsiteConfigPatterns
            v-else-if="activeTab === 'patterns'"
            :rows="result.list as WebsitePattern[]"
            v-bind="editorProps"
          />
          <WebsiteConfigSkeletons
            v-else-if="activeTab === 'skeletons'"
            :rows="result.list as WebsiteSkeleton[]"
            v-bind="editorProps"
          />
          <WebsiteConfigTemplates
            v-else-if="activeTab === 'templates'"
            :rows="result.list as WebsiteTemplate[]"
            v-bind="editorProps"
          />
        </div>
        <Pagination
          v-model:page="page"
          v-model:limit="pageSize"
          :total="result.total"
          @pagination="refreshPage"
        />
      </template>
    </SectionCard>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import FeedbackState from "@/components/FeedbackState/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import type {
  WebsiteBusinessUnit, WebsiteConfigGroup, WebsiteConfigRecord, WebsiteConfigPage,
  WebsiteConfigEditorProps, WebsiteCity, WebsiteAttraction, WebsiteConfigHotel,
  WebsiteRoute, WebsitePattern, WebsiteSkeleton, WebsiteTemplate,
} from "@/types/website";
import WebsiteConfigCities from "./components/WebsiteConfigCities.vue";
import WebsiteConfigAttractions from "./components/WebsiteConfigAttractions.vue";
import WebsiteConfigHotels from "./components/WebsiteConfigHotels.vue";
import WebsiteConfigRoutes from "./components/WebsiteConfigRoutes.vue";
import WebsiteConfigPatterns from "./components/WebsiteConfigPatterns.vue";
import WebsiteConfigSkeletons from "./components/WebsiteConfigSkeletons.vue";
import WebsiteConfigTemplates from "./components/WebsiteConfigTemplates.vue";
defineOptions({ name: "WebsiteResources" });
const user = useUserStore();
const { t } = useI18n();
const businessUnit = ref<WebsiteBusinessUnit>(user.userInfo.scope === "linxi" ? "linxi" : "website");
const activeTab = ref<WebsiteConfigGroup>("cities");
const result = ref<WebsiteConfigPage>();
const page = ref(1);
const routeKeyword = ref("");
const appliedRouteKeyword = ref("");
function searchRoutes() { appliedRouteKeyword.value = routeKeyword.value.trim(); page.value = 1; void refreshPage(); }
function resetRouteSearch() { routeKeyword.value = ""; searchRoutes(); }
const pageSize = ref(20);
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const editable = computed(() => hasUserPermission(user.userInfo, "website:config:update"));
const editorProps = computed<WebsiteConfigEditorProps>(() => ({
  version: result.value?.version ?? 0, businessUnit: businessUnit.value,
  references: result.value?.references ?? {}, editable: editable.value, saving: saving.value,
  saveRecord, deleteRecord,
}));
let requestId = 0;
async function loadPage() {
  const current = ++requestId;
  loading.value = true;
  error.value = "";
  try {
    const data = await websiteService.configRecords(activeTab.value, {
      businessUnit: businessUnit.value, page: page.value, pageSize: pageSize.value,
      ...(activeTab.value === "routes" ? { keyword: appliedRouteKeyword.value } : {}),
    });
    if (current !== requestId) return;
    const lastPage = Math.max(1, Math.ceil(data.total / pageSize.value));
    if (page.value > lastPage) {
      page.value = lastPage;
      await loadPage();
      return;
    }
    result.value = data;
  } catch (cause) {
    if (current === requestId) error.value = websiteErrorMessage(cause);
  } finally {
    if (current === requestId) loading.value = false;
  }
}
async function refreshPage() {
  if (!saving.value) await loadPage();
}
async function saveRecord(record: WebsiteConfigRecord, isNew: boolean): Promise<boolean> {
  if (!result.value || !editable.value || loading.value || saving.value) return false;
  saving.value = true;
  try {
    if (isNew) await websiteService.createConfigRecord(activeTab.value, result.value.version, record, businessUnit.value);
    else await websiteService.updateConfigRecord(activeTab.value, result.value.version, record, businessUnit.value);
    ElMessage.success(t("common.saveSuccess"));
    await loadPage();
    return true;
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
    return false;
  } finally {
    saving.value = false;
  }
}
async function deleteRecord(id: string): Promise<boolean> {
  if (!result.value || !editable.value || loading.value || saving.value) return false;
  saving.value = true;
  try {
    try {
      await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
    } catch {
      return false;
    }
    await websiteService.deleteConfigRecord(activeTab.value, id, result.value.version, businessUnit.value);
    ElMessage.success(t("common.deleteSuccess"));
    await loadPage();
    return true;
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
    return false;
  } finally {
    saving.value = false;
  }
}
watch([businessUnit, activeTab], () => {
  page.value = 1;
  result.value = undefined;
  void loadPage();
}, { immediate: true });
onBeforeRouteLeave(() => !saving.value);
</script>

<style scoped lang="scss">
.website-config-tabs {
  :deep(.el-tabs__header) {
    @apply 'm-0';
  }

  :deep(.el-tabs__content) {
    @apply 'hidden';
  }
}
</style>
