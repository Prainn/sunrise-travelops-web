<template>
  <ErrorPage
    status-code="401"
    :label="$t('error.unauthorized.label')"
    :title="$t('error.unauthorized.title')"
    :description="$t('error.unauthorized.description')"
    variant="locked"
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
        :icon="Back"
        @click="router.back()"
      >
        {{ $t("common.goBack") }}
      </el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { Back, House } from "@element-plus/icons-vue";
import ErrorPage from "./components/ErrorPage.vue";

defineOptions({ name: "Page401" });

const router = useRouter();

/**
 * 回到首页，避免继续停留在无权限路由
 */
function goHome() {
  router.push("/");
}
</script>
