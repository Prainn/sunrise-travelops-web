<template>
  <AppDialog v-model="visible" :title="$t('ledger.direct.linkedToursTitle')" size="md">
    <DataTable :data="tours" row-key="id">
      <el-table-column :label="$t('tour.tourNo')" min-width="210" :show-overflow-tooltip="false">
        <template #default="{ row }">
          <el-button link type="primary" @click="openTour(row.tourNo)">
            {{ row.tourNo }}
          </el-button>
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'">
            {{ $t(`tour.status.${row.status}`) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        prop="cancelReason"
        :label="$t('tour.cancelReason')"
        min-width="160"
        show-overflow-tooltip
        :formatter="(_row: unknown, _column: unknown, value: string | null) => value || '-'"
      />
    </DataTable>
    <template #footer>
      <el-button @click="visible = false">
        {{ $t("common.close") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import type { DirectLedgerLinkedTour } from "@/types/direct-ledger";

defineProps<{ tours: DirectLedgerLinkedTour[] }>();
const visible = defineModel<boolean>({ required: true });
const router = useRouter();

function openTour(tourNo: string) {
  visible.value = false;
  void router.push({ path: "/tours/list", query: { keyword: tourNo } });
}
</script>
