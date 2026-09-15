<template>
  <div class="resource-page">
    <GuidePersonTable
      :loading="isPeopleLoading"
      :total="peopleTotal"
      :rows="peopleRows"
      @refresh="loadPeople"
      @query-change="loadPeople"
      @create="openCreatePersonDialog"
      @open-prices="isPriceDrawerVisible = true"
      @detail="openPersonDetail"
      @edit="openEditPersonDialog"
      @toggle-status="togglePersonStatus"
      @delete="deletePerson"
    />
    <GuidePersonEditorDialog
      v-model="isPersonDialogVisible"
      :record="personForm"
      :is-editing="isPersonEditing"
      @submit="savePerson"
    />
    <el-drawer
      v-model="isPersonDetailVisible"
      :title="$t('guide.detail')"
      size="520px"
    >
      <el-descriptions
        v-if="personDetail"
        :column="1"
        border
      >
        <el-descriptions-item :label="$t('identity.library')">
          <ResourceLibraryTag :library="personDetail.library" />
        </el-descriptions-item>
        <el-descriptions-item :label="$t('guide.name')">
          {{ personDetail.name }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('guide.gender')">
          {{ $t(`guide.genderOptions.${personDetail.gender}`) }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('guide.certificateNo')">
          {{ personDetail.certificateNo ?? $t('common.notSet') }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('guide.identityNumber')">
          {{ personDetail.identityNumber ?? $t('common.notSet') }}
        </el-descriptions-item>
        <el-descriptions-item :label="$t('common.status')">
          {{ $t(personDetail.status === 'enabled' ? 'common.enabled' : 'common.disabled') }}
        </el-descriptions-item>
      </el-descriptions>
    </el-drawer>
    <el-drawer
      v-model="isPriceDrawerVisible"
      :title="$t('guide.priceSettings')"
      size="80%"
    >
      <GuideTable
        :loading="isPriceLoading"
        :total="priceTotal"
        :rows="priceRows"
        @refresh="loadPrices"
        @query-change="loadPrices"
        @create="openCreatePriceDialog"
        @edit="openEditPriceDialog"
        @toggle-status="togglePriceStatus"
        @delete="deletePrice"
      />
    </el-drawer>
    <GuideEditorDialog
      v-model="isPriceDialogVisible"
      :record="priceForm"
      :is-editing="isPriceEditing"
      @submit="savePrice"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ElMessage } from "element-plus";
import ResourceLibraryTag from "@/components/ResourceLibraryTag.vue";
import { resourceService } from "@/services/resource.service";
import type { GuidePersonRecord, GuideRecord } from "@/types/resource";
import { useResourceMaintenance } from "../useResourceMaintenance";
import GuideEditorDialog from "./components/GuideEditorDialog.vue";
import GuidePersonEditorDialog from "./components/GuidePersonEditorDialog.vue";
import GuidePersonTable from "./components/GuidePersonTable.vue";
import GuideTable from "./components/GuideTable.vue";

defineOptions({ name: "Guide" });

function createEmptyPerson(): GuidePersonRecord {
  return { id: "", code: "", name: "", gender: 0, certificateNo: null, identityNumber: null, status: "enabled" };
}
function createEmptyPrice(): GuideRecord {
  return { id: "", code: "", name: "", secondLanguage: "none", shopping: false, dailyPrice: 0, status: "enabled" };
}

const {
  isLoading: isPeopleLoading,
  rows: peopleRows,
  record: personForm,
  isDialogVisible: isPersonDialogVisible,
  isEditing: isPersonEditing,
  total: peopleTotal,
  loadRecords: loadPeople,
  openCreateDialog: openCreatePersonDialog,
  openEditDialog: openEditPersonDialog,
  toggleStatus: togglePersonStatus,
  saveRecord: savePerson,
  deleteRecord: deletePerson,
} = useResourceMaintenance<GuidePersonRecord>({
  records: resourceService.guidePeople,
  api: resourceService.guidePersonApi,
  loadRecords: (query) => resourceService.loadGuidePeople(query),
  createEmpty: createEmptyPerson,
});

const isPersonDetailVisible = ref(false);
const personDetail = ref<GuidePersonRecord | null>(null);
async function openPersonDetail(row: GuidePersonRecord) {
  try {
    personDetail.value = await resourceService.guidePersonApi.getDetail(row.id);
    isPersonDetailVisible.value = true;
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : String(error));
  }
}

const isPriceDrawerVisible = ref(false);
const {
  isLoading: isPriceLoading,
  rows: priceRows,
  record: priceForm,
  isDialogVisible: isPriceDialogVisible,
  isEditing: isPriceEditing,
  total: priceTotal,
  loadRecords: loadPrices,
  openCreateDialog: openCreatePriceDialog,
  openEditDialog: openEditPriceDialog,
  toggleStatus: togglePriceStatus,
  saveRecord: savePrice,
  deleteRecord: deletePrice,
} = useResourceMaintenance<GuideRecord>({
  records: resourceService.guides,
  api: resourceService.guideApi,
  loadRecords: (query) => resourceService.loadGuides(query),
  createEmpty: createEmptyPrice,
});
</script>
