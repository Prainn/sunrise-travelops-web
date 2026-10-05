<template>
  <el-card shadow="never" class="mb-4">
    <el-form label-position="top" :disabled="!editable">
      <div class="grid grid-cols-3 gap-x-5 max-[650px]:grid-cols-1">
        <el-form-item label="行程标题" required>
          <el-input v-model="plan.title" maxlength="150" />
        </el-form-item>
        <el-form-item label="计划天数" required>
          <el-input-number v-model="plan.duration" :min="1" :max="365" />
        </el-form-item>
        <el-form-item label="开始日期">
          <el-date-picker v-model="plan.startDate" value-format="YYYY-MM-DD" clearable />
        </el-form-item>
        <el-form-item label="人数">
          <el-input-number v-model="plan.pax" :min="1" :max="10000" />
        </el-form-item>
        <el-form-item label="抵达时间">
          <el-input v-model="plan.arrivalTime" maxlength="100" />
        </el-form-item>
        <el-form-item label="离开时间">
          <el-input v-model="plan.departureTime" maxlength="100" />
        </el-form-item>
      </div>
    </el-form>
  </el-card>
</template>
<script setup lang="ts">
import type { WebsiteItinerary } from "@/types/website";
defineProps<{ plan: WebsiteItinerary; editable: boolean }>();
</script>
