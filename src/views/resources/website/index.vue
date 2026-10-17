<template>
  <PageShell v-loading="loading || saving" :inert="saving">
    <FilterBar v-if="user.userInfo.scope === 'headquarters'" :resettable="false">
      <el-form-item :label="$t('websiteInquiry.businessUnit')">
        <el-select
          v-model="businessUnit"
          autocomplete="new-password"
          :disabled="saving || loading"
          @change="loadConfig"
        >
          <el-option
            v-for="unit in ['linxi', 'website']"
            :key="unit"
            :value="unit"
            :label="$t(`websiteInquiry.businessUnits.${unit}`)"
          />
        </el-select>
      </el-form-item>
    </FilterBar>
    <SectionCard v-if="error">
      <FeedbackState
        type="error"
        :description="error"
        retryable
        @retry="refreshConfig"
      />
    </SectionCard>
    <SectionCard v-if="config" fill>
      <TableToolbar :refreshing="loading" @refresh="refreshConfig">
        <el-tabs v-model="activeTab" class="website-config-tabs flex-1 min-w-0">
          <el-tab-pane :label="$t('websiteConfig.tabs.cities')" name="cities" />
          <el-tab-pane :label="$t('websiteConfig.tabs.attractions')" name="attractions" />
          <el-tab-pane :label="$t('websiteConfig.tabs.hotels')" name="hotels" />
          <el-tab-pane :label="$t('websiteConfig.tabs.routes')" name="routes" />
          <el-tab-pane :label="$t('websiteConfig.tabs.patterns')" name="patterns" />
          <el-tab-pane :label="$t('websiteConfig.tabs.skeletons')" name="skeletons" />
          <el-tab-pane :label="$t('websiteConfig.tabs.templates')" name="templates" />
        </el-tabs>
      </TableToolbar>
      <div class="flex-1 min-h-0 overflow-hidden">
        <div v-show="activeTab === 'cities'" class="h-full">
          <WebsiteConfigCities
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'attractions'" class="h-full">
          <WebsiteConfigAttractions
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'hotels'" class="h-full">
          <WebsiteConfigHotels
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'routes'" class="h-full">
          <WebsiteConfigRoutes
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'patterns'" class="h-full">
          <WebsiteConfigPatterns
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'skeletons'" class="h-full">
          <WebsiteConfigSkeletons
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
        <div v-show="activeTab === 'templates'" class="h-full">
          <WebsiteConfigTemplates
            :config="config"
            :editable="editable"
            :saving="saving"
            :save-config="saveConfig"
            :delete-config="deleteConfig"
          />
        </div>
      </div>
    </SectionCard>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import type { WebsiteBusinessUnit, WebsiteConfig } from "@/types/website";
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
const config = ref<WebsiteConfig>();
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const activeTab = ref("cities");
const editable = computed(() => hasUserPermission(user.userInfo, "website:config:update"));
async function persistConfig(next: WebsiteConfig): Promise<boolean> {
  if (!config.value || !editable.value || loading.value || saving.value) return false;
  saving.value = true;
  try {
    config.value = await websiteService.saveConfig(next, businessUnit.value);
    return true;
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
    return false;
  } finally {
    saving.value = false;
  }
}
async function saveConfig(next: WebsiteConfig): Promise<boolean> {
  const saved = await persistConfig(next);
  if (saved) ElMessage.success(t("websiteConfig.saveSuccess"));
  return saved;
}
async function deleteConfig(next: WebsiteConfig): Promise<boolean> {
  if (!editable.value || loading.value || saving.value) return false;
  try {
    await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
  } catch {
    return false;
  }
  const saved = await persistConfig(next);
  if (saved) ElMessage.success(t("common.deleteSuccess"));
  return saved;
}
async function loadConfig() {
  loading.value = true;
  error.value = "";
  try {
    config.value = undefined;
    config.value = await websiteService.config(undefined, businessUnit.value);
  } catch (cause) {
    error.value = websiteErrorMessage(cause);
  } finally {
    loading.value = false;
  }
}
async function refreshConfig() {
  if (!loading.value && !saving.value) await loadConfig();
}
onMounted(loadConfig);
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
