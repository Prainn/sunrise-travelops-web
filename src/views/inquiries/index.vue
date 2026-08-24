<template>
  <div class="page-container">
    <el-card
      class="page-content inquiry-list"
      shadow="never"
    >
      <el-empty :description="$t('inquiry.emptyDescription')">
        <p class="inquiry-list__description">
          {{ $t("inquiry.pageDescription") }}
        </p>
      </el-empty>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: "InquiryList" });
</script>

<style scoped lang="scss">
.inquiry-list {
  display: flex;
  align-items: center;
  justify-content: center;

  &__description {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}
</style>
