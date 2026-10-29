<template>
  <ul class="m-0 flex list-none flex-col gap-2 p-0 text-[13px] leading-[1.5]">
    <li v-for="service in services" :key="service.id" class="flex flex-col gap-[2px]">
      <span class="text-strong">
        {{ guideIdentityText(service) }}
        <span v-if="service.language" class="text-muted"> · {{ service.language }}</span>
      </span>
      <span>{{ service.serviceStartAt }} ~ {{ service.serviceEndAt }}</span>
      <span v-if="service.remark" class="text-muted">{{ service.remark }}</span>
      <span
        v-if="
          service.timeSource === 'legacy' || service.invalidDuration || service.outsideTourWindow
        "
        class="flex flex-wrap gap-1"
      >
        <el-tag v-if="service.timeSource === 'legacy'" size="small" type="warning">
          {{ $t("tour.guideService.legacyTime") }}
        </el-tag>
        <el-tag v-if="service.invalidDuration" size="small" type="danger">
          {{ $t("tour.guideService.invalidDuration") }}
        </el-tag>
        <el-tag v-if="service.outsideTourWindow" size="small" type="info">
          {{ $t("tour.guideService.outsideWindow") }}
        </el-tag>
      </span>
    </li>
  </ul>
</template>

<script setup lang="ts">
import type { TourGuideService } from "@/types/tour";
import { guideIdentityText } from "@/utils/guide-services";

defineProps<{ services: TourGuideService[] }>();
</script>
