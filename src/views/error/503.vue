<template>
  <ErrorPage
    status-code="503"
    :label="$t('error.unavailable.label')"
    :title="$t('error.unavailable.title')"
    :description="$t('error.unavailable.description')"
    variant="unavailable"
  >
    <template #actions>
      <el-button type="primary" :icon="Refresh" @click="retry">
        {{ $t("common.reload") }}
      </el-button>
    </template>
  </ErrorPage>
</template>

<script setup lang="ts">
import { Refresh } from "@element-plus/icons-vue";
import ErrorPage from "./components/ErrorPage.vue";

defineOptions({ name: "Page503" });

const route = useRoute();
const router = useRouter();

function retry() {
  const redirect = route.query.redirect;
  const target =
    typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : "/";
  router.replace(target);
}
</script>
