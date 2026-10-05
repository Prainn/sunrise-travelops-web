<template>
  <div v-loading="loading || saving" :inert="saving" class="page-container">
    <el-alert v-if="error" :title="error" type="error" :closable="false" class="mb-4" />
    <template v-if="draft">
      <div class="flex justify-between items-center mb-4">
        <h2 class="m-0 text-xl">独立站资源配置 · v{{ draft.version }}</h2>
        <div v-if="editable" class="flex gap-3">
          <el-button :disabled="!dirty" @click="cancel">取消修改</el-button>
          <el-button type="primary" :loading="saving" @click="save">保存并启用配置</el-button>
        </div>
        <el-tag v-else>只读</el-tag>
      </div>
      <el-alert
        v-if="!draft.cities.length"
        title="从城市与双语模板开始维护，然后添加景点、跨城路线、Day Pattern 和城市骨架。所有新增资料仅属于独立站；基础资源关联仅允许明确共用的 shared 记录。"
        type="info"
        :closable="false"
        class="mb-4"
      />
      <el-form :disabled="!editable" label-position="top">
        <el-tabs v-model="activeTab">
          <el-tab-pane label="城市" name="cities">
            <WebsiteConfigCities :config="draft" :editable="editable" />
          </el-tab-pane>
          <el-tab-pane label="景点／组件／季节" name="attractions">
            <WebsiteConfigAttractions :config="draft" :editable="editable" />
          </el-tab-pane>
          <el-tab-pane label="跨城路线" name="routes">
            <WebsiteConfigRoutes :config="draft" :editable="editable" />
          </el-tab-pane>
          <el-tab-pane label="Day Pattern" name="patterns">
            <WebsiteConfigPatterns :config="draft" :editable="editable" />
          </el-tab-pane>
          <el-tab-pane label="城市骨架" name="skeletons">
            <WebsiteConfigSkeletons :config="draft" :editable="editable" />
          </el-tab-pane>
          <el-tab-pane label="双语标准文案" name="templates">
            <WebsiteConfigTemplates :config="draft" :editable="editable" />
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { websiteErrorMessage, websiteService } from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import type { WebsiteConfig } from "@/types/website";
import { cloneWebsiteDraft } from "@/views/website-inquiries/options";
import WebsiteConfigCities from "./components/WebsiteConfigCities.vue";
import WebsiteConfigAttractions from "./components/WebsiteConfigAttractions.vue";
import WebsiteConfigRoutes from "./components/WebsiteConfigRoutes.vue";
import WebsiteConfigPatterns from "./components/WebsiteConfigPatterns.vue";
import WebsiteConfigSkeletons from "./components/WebsiteConfigSkeletons.vue";
import WebsiteConfigTemplates from "./components/WebsiteConfigTemplates.vue";
defineOptions({ name: "WebsiteResources" });
const user = useUserStore();
const draft = ref<WebsiteConfig>();
const saved = ref<WebsiteConfig>();
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const activeTab = ref("cities");
const editable = computed(() => hasUserPermission(user.userInfo, "website:config:update"));
const dirty = computed(() => JSON.stringify(draft.value) !== JSON.stringify(saved.value));
async function allowDiscard() {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm("配置有未保存修改，继续将丢弃这些修改。", "未保存修改", {
      confirmButtonText: "丢弃修改",
      cancelButtonText: "继续编辑",
      type: "warning",
    });
    return true;
  } catch {
    return false;
  }
}
async function cancel() {
  if (saved.value && (await allowDiscard())) draft.value = cloneWebsiteDraft(saved.value);
}
async function save() {
  if (!draft.value || !editable.value || saving.value) return;
  saving.value = true;
  try {
    const result = await websiteService.saveConfig(draft.value);
    saved.value = result;
    draft.value = cloneWebsiteDraft(result);
    ElMessage.success(`已保存配置 v${result.version}，已启用记录可用于新行程`);
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    saving.value = false;
  }
}
onMounted(async () => {
  loading.value = true;
  try {
    const result = await websiteService.config();
    saved.value = result;
    draft.value = cloneWebsiteDraft(result);
  } catch (cause) {
    error.value = websiteErrorMessage(cause);
  } finally {
    loading.value = false;
  }
});
onBeforeRouteLeave(() => allowDiscard());
</script>
