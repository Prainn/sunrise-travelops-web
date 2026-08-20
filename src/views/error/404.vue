<template>
  <ErrorPage
    status-code="404"
    :label="$t('error.notFound.label')"
    :title="$t('error.notFound.title')"
    :description="$t('error.notFound.description')"
    variant="missing"
  >
    <template #actions>
      <el-button
        type="primary"
        :icon="House"
        @click="goHome"
      >
        {{ $t("common.backHome") }}
      </el-button>
      <el-button
        :icon="Refresh"
        @click="reload"
      >
        {{ $t("common.reload") }}
      </el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { House, Refresh } from "@element-plus/icons-vue";
import ErrorPage from "./components/ErrorPage.vue";

defineOptions({ name: "Page404" });

const router = useRouter();

/**
 * 回到首页，重新进入权限路由匹配
 */
function goHome() {
  router.push("/");
}

/**
 * 重新加载页面，处理动态路由未及时注册的场景
 */
function reload() {
  window.location.reload();
}
</script>
