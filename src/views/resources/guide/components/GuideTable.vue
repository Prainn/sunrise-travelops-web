<template>
  <div class="page-container">
    <GuideSearchForm
      v-model:keywords="keywords"
      v-model:gender="gender"
      v-model:employment-type="employmentType"
      v-model:language="language"
      @reset="resetQuery"
    />
    <el-card
      class="page-content"
      shadow="never"
    >
      <div class="page-toolbar">
        <div class="page-toolbar__left">
          <el-button
            type="primary"
            @click="emit('create')"
          >
            {{ $t("guide.createGuide") }}
          </el-button>
        </div>
      </div>
      <div class="page-table-wrapper">
        <el-table
          :data="pagedRows"
          border
          height="100%"
          row-key="id"
        >
          <el-table-column
            type="index"
            :label="$t('guide.sequence')"
            width="70"
            align="center"
          />
          <el-table-column
            prop="code"
            :label="$t('resource.code')"
            width="120"
          />
          <el-table-column
            prop="certificateNo"
            :label="$t('guide.certificateNo')"
            min-width="130"
          />
          <el-table-column
            prop="name"
            :label="$t('resource.guideName')"
            min-width="120"
          />
          <el-table-column
            :label="$t('guide.gender')"
            width="80"
            align="center"
          >
            <template #default="scope">
              {{ $t(scope.row.gender === "male" ? "guide.male" : "guide.female") }}
            </template>
          </el-table-column>
          <el-table-column
            prop="age"
            :label="$t('guide.age')"
            width="80"
            align="center"
          />
          <el-table-column
            :label="$t('guide.languages')"
            min-width="140"
          >
            <template #default="scope">
              <el-tag
                v-for="item in scope.row.languages"
                :key="item"
                class="guide-table__language"
                effect="plain"
              >
                {{ item }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.employmentType')"
            width="110"
            align="center"
          >
            <template #default="scope">
              <el-tag
                :type="scope.row.employmentType === 'full-time' ? 'primary' : 'warning'"
                effect="light"
              >
                {{ $t(scope.row.employmentType === "full-time" ? "guide.fullTime" : "guide.partTime") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            prop="identityNumber"
            :label="$t('guide.identityNumber')"
            min-width="190"
          />
          <el-table-column
            prop="phone"
            :label="$t('resource.phone')"
            min-width="130"
          />
          <el-table-column
            :label="$t('resource.providerSource')"
            min-width="160"
          >
            <template #default="scope">
              <el-tag
                v-if="scope.row.isGroundOperatorProvided"
                type="warning"
                effect="plain"
              >
                {{ getGroundOperatorName(scope.row.groundOperatorId) }}
              </el-tag>
              <span v-else>{{ $t("resource.directProvided") }}</span>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.hasLaborContract')"
            width="100"
            align="center"
          >
            <template #default="scope">
              <el-tag :type="scope.row.hasLaborContract ? 'success' : 'warning'">
                {{ $t(scope.row.hasLaborContract ? "common.yes" : "common.no") }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('guide.licensePhoto')"
            width="110"
            align="center"
          >
            <template #default="scope">
              <el-image
                v-if="scope.row.licensePhotoUrl"
                class="guide-table__photo"
                :src="scope.row.licensePhotoUrl"
                :preview-src-list="[scope.row.licensePhotoUrl]"
                preview-teleported
                fit="cover"
              />
              <span v-else>-</span>
            </template>
          </el-table-column>
          <el-table-column
            prop="remark"
            :label="$t('common.remark')"
            min-width="160"
            show-overflow-tooltip
          />
          <el-table-column
            :label="$t('common.status')"
            width="90"
            align="center"
          >
            <template #default="scope">
              <el-tag :type="scope.row.status === 'enabled' ? 'success' : 'info'">
                {{ $t(`common.${scope.row.status}`) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('common.actions')"
            width="180"
            fixed="right"
            align="center"
          >
            <template #default="scope">
              <el-button
                type="primary"
                link
                @click="emit('edit', scope.row as GuideRecord)"
              >
                {{ $t("common.edit") }}
              </el-button>
              <el-button
                type="warning"
                link
                @click="emit('toggle-status', scope.row as GuideRecord)"
              >
                {{ $t(scope.row.status === "enabled" ? "common.disabled" : "common.enabled") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <pagination
        v-if="filteredRows.length"
        v-model:total="total"
        v-model:page="pageNum"
        v-model:limit="pageSize"
      />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { tourismResources } from "@/data/data";
import type { GuideEmploymentType, GuideGender, GuideRecord } from "@/data/data";
import GuideSearchForm from "./GuideSearchForm.vue";

const props = defineProps<{ rows: GuideRecord[] }>();
const emit = defineEmits<{
  create: [];
  edit: [record: GuideRecord];
  "toggle-status": [record: GuideRecord];
}>();

const { t } = useI18n();
const keywords = ref("");
const gender = ref<GuideGender | "">("");
const employmentType = ref<GuideEmploymentType | "">("");
const language = ref("");
const pageNum = ref(1);
const pageSize = ref(10);
const groundOperatorOptions = computed(() => tourismResources.supplier.filter((item) => item.status === "enabled"));
const filteredRows = computed(() => props.rows.filter((record) => (
  (!gender.value || record.gender === gender.value)
  && (!employmentType.value || record.employmentType === employmentType.value)
  && (!language.value || record.languages.includes(language.value))
  && (!keywords.value || [record.code, record.certificateNo, record.name, record.identityNumber, record.phone]
    .some((field) => field.toLowerCase().includes(keywords.value.toLowerCase())))
)));
const total = computed({ get: () => filteredRows.value.length, set: () => undefined });
const pagedRows = computed(() => filteredRows.value.slice((pageNum.value - 1) * pageSize.value, pageNum.value * pageSize.value));

function resetQuery() {
  keywords.value = "";
  gender.value = "";
  employmentType.value = "";
  language.value = "";
  pageNum.value = 1;
}

function getGroundOperatorName(id: string) {
  return groundOperatorOptions.value.find((item) => item.id === id)?.name ?? t("resource.groundOperatorProvided");
}
</script>

<style scoped lang="scss">
.guide-table {
  &__language { margin-right: 4px; }
  &__photo { width: 36px; height: 36px; border-radius: 4px; }
}
</style>
