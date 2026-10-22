<template>
  <ErrorPage
    status-code="503"
    :label="$t('error.unavailable.label')"
    :title="$t('error.unavailable.title')"
    :description="$t('error.unavailable.description')"
    variant="unavailable"
  >
    <template #actions>
      <el-button
        type="primary"
        :icon="Refresh"
        :loading="loading"
        @click="retry"
      >
        {{ $t("common.reload") }}
      </el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import { usePermissionStore } from "@/stores/permission";
import { useUserStore } from "@/stores/user";
import ErrorPage from "./components/ErrorPage.vue";

defineOptions({ name: "Page503" });

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const loading = ref(false);

/** 重新探测后端：用户资料与导航目录成功后才离开本页，失败则提示仍不可用。 */
async function retry() {
  if (loading.value) return;
  loading.value = true;
  try {
    await useUserStore().getUserInfo();
    const routes = await usePermissionStore().generateRoutes();
    if (!routes) return;
    const redirect = route.query.redirect;
    const target =
      typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/";
    await router.replace(target);
  } catch {
    ElMessage.error(t("error.unavailable.stillDown"));
  } finally {
    loading.value = false;
  }
}
</script>
