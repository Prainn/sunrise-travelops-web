<template>
  <PageShell>
    <FilterBar @reset="resetFilters">
      <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
        <el-input
          v-model="keyword"
          clearable
          :placeholder="$t('whatsapp.quickReplies.search')"
          @keydown.enter="search"
        />
      </el-form-item>
      <el-form-item :label="$t('common.status')">
        <el-select
          v-model="status"
          clearable
          autocomplete="new-password"
          :placeholder="$t('common.all')"
          @change="search"
        >
          <el-option :label="$t('whatsapp.enabled')" value="enabled" /><el-option :label="$t('whatsapp.disabled')" value="disabled" />
        </el-select>
      </el-form-item>
      <template #actions>
        <el-button type="primary" @click="search">
          {{ $t('common.search') }}
        </el-button>
      </template>
    </FilterBar>
    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="load">
        <template #default>
          <el-button type="primary" @click="edit()">
            {{ $t('common.create') }}
          </el-button>
        </template>
      </TableToolbar>
      <FeedbackState
        v-if="error"
        type="error"
        :description="error"
        retryable
        @retry="load"
      />
      <DataTable
        v-else
        fill
        :loading="loading"
        :data="rows"
        row-key="id"
        :filtered="!!keyword.trim() || !!status"
      >
        <el-table-column prop="stage" :label="$t('whatsapp.quickReplies.stage')" min-width="140" />
        <el-table-column prop="scenario" :label="$t('whatsapp.quickReplies.scenario')" min-width="160" />
        <el-table-column
          prop="content"
          :label="$t('whatsapp.quickReplies.content')"
          min-width="320"
          show-overflow-tooltip
        />
        <el-table-column :label="$t('common.status')" width="100">
          <template #default="{row}">
            <el-tag :type="row.enabled ? 'success' : 'info'">
              {{ $t(row.enabled ? 'whatsapp.enabled' : 'whatsapp.disabled') }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sortOrder" :label="$t('whatsapp.quickReplies.sortOrder')" width="100" />
        <el-table-column :label="$t('common.actions')" width="100" fixed="right">
          <template #default="{row}">
            <el-button link type="primary" @click="edit(row as WhatsappQuickReply)">
              {{ $t('common.edit') }}
            </el-button>
          </template>
        </el-table-column>
      </DataTable>
      <Pagination
        v-model:page="page"
        v-model:limit="pageSize"
        :total="total"
        @pagination="load"
      />
    </SectionCard>
    <AppDialog
      v-model="editing"
      :title="$t('whatsapp.quickReply')"
      :busy="saving"
      @closed="formRef?.clearValidate()"
    >
      <div v-if="hasConflict" class="flex flex-col gap-3 mb-4">
        <el-alert
          type="warning"
          :closable="false"
          show-icon
          :title="$t('whatsapp.quickReplies.conflictTitle')"
          :description="$t('whatsapp.quickReplies.conflictHint')"
        />
        <FeedbackState
          v-if="latestError"
          type="error"
          :description="latestError"
          retryable
          @retry="editor.loadLatest"
        />
        <el-descriptions
          v-if="latest"
          :title="$t('whatsapp.quickReplies.latest')"
          :column="1"
          border
        >
          <el-descriptions-item :label="$t('whatsapp.quickReplies.stage')">
            {{ latest.stage }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('whatsapp.quickReplies.scenario')">
            {{ latest.scenario }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('whatsapp.quickReplies.content')">
            <span class="whitespace-pre-wrap break-words">{{ latest.content }}</span>
          </el-descriptions-item>
          <el-descriptions-item :label="$t('common.status')">
            {{ $t(latest.enabled ? 'whatsapp.enabled' : 'whatsapp.disabled') }}
          </el-descriptions-item>
          <el-descriptions-item :label="$t('whatsapp.quickReplies.sortOrder')">
            {{ latest.sortOrder }}
          </el-descriptions-item>
        </el-descriptions>
        <div class="flex flex-wrap gap-2">
          <el-button :loading="latestLoading" :disabled="!latest || latestLoading" @click="editor.resolveConflict(true)">
            {{ $t('whatsapp.quickReplies.useLatest') }}
          </el-button>
          <el-button :disabled="!latest || latestLoading" @click="editor.resolveConflict(false)">
            {{ $t('whatsapp.quickReplies.keepInput') }}
          </el-button>
        </div>
      </div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
      >
        <el-form-item prop="stage" :label="$t('whatsapp.quickReplies.stage')">
          <el-select
            v-model="form.stage"
            autocomplete="new-password"
            filterable
            :loading="stagesLoading"
            :placeholder="$t('common.selectPlaceholder')"
          >
            <el-option
              v-for="stage in stages"
              :key="stage.id"
              :label="stage.name"
              :value="stage.name"
            />
          </el-select>
        </el-form-item>
        <el-form-item prop="scenario" :label="$t('whatsapp.quickReplies.scenario')">
          <el-input v-model="form.scenario" maxlength="100" />
        </el-form-item>
        <el-form-item prop="content" :label="$t('whatsapp.quickReplies.content')">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            maxlength="4096"
            show-word-limit
          />
        </el-form-item>
        <el-form-item prop="sortOrder" :label="$t('whatsapp.quickReplies.sortOrder')">
          <el-input-number
            v-model="form.sortOrder"
            :min="0"
            :max="10000"
            :precision="0"
          />
        </el-form-item>
        <el-form-item prop="enabled" :label="$t('common.status')">
          <el-switch v-model="form.enabled" :active-text="$t('whatsapp.enabled')" :inactive-text="$t('whatsapp.disabled')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button :disabled="saving" @click="editing = false">
          {{ $t('common.cancel') }}
        </el-button><el-button
          type="primary"
          :loading="saving"
          :disabled="hasConflict"
          @click="save"
        >
          {{ $t('common.save') }}
        </el-button>
      </template>
    </AppDialog>
  </PageShell>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { useI18n } from "vue-i18n";
import PageShell from "@/components/PageShell/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import AppDialog from "@/components/AppDialog/index.vue";
import FeedbackState from "@/components/FeedbackState/index.vue";
import { whatsappService } from "@/services/whatsapp.service";
import { businessDictionaryService } from "@/services/business-dictionary.service";
import { websiteErrorMessage } from "@/services/website.service";
import type { BusinessCategoryOptionRecord } from "@/types/resource";
import type { WhatsappQuickReply } from "@/types/whatsapp";
import { useQuickReplyEditor } from "./useQuickReplyEditor";
import { useRefreshOnActivated } from "@/composables";
defineOptions({ name: "WhatsappQuickReplies" });
const { t } = useI18n();
const rows = ref<WhatsappQuickReply[]>([]), total = ref(0), page = ref(1), pageSize = ref(20);
const keyword = ref(""), status = ref<"enabled" | "disabled">();
const loading = ref(false), error = ref("");
const editor = useQuickReplyEditor();
const { editing, form, saving, hasConflict, latest, latestLoading, latestError } = editor;
const formRef = ref<FormInstance>();
const stages = ref<BusinessCategoryOptionRecord[]>([]), stagesLoading = ref(false);
const rules = computed<FormRules>(() => Object.fromEntries(["stage","scenario","content"].map(key=>[key,[{required:true,whitespace:true,message:t("whatsapp.quickReplies.required"),trigger:"blur"}]])));
let generation = 0;
async function load() {
  const current = ++generation; loading.value = true; error.value = "";
  try { const result = await whatsappService.managedQuickReplies({page:page.value,pageSize:pageSize.value,keyword:keyword.value.trim()||undefined,status:status.value}); if (current===generation) {rows.value=result.list;total.value=result.total;} }
  catch(cause){if(current===generation) error.value=websiteErrorMessage(cause);}
  finally{if(current===generation) loading.value=false;}
}
function search(){page.value=1;void load();}
function resetFilters(){keyword.value="";status.value=undefined;search();}
function edit(row?: WhatsappQuickReply) { editor.open(row); void loadStages(); }
async function loadStages() {
  if (stagesLoading.value) return;
  stagesLoading.value = true;
  stages.value = [];
  try {
    stages.value = await businessDictionaryService.getItems("whatsapp-quick-reply-stage", { status: "enabled" });
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  } finally {
    stagesLoading.value = false;
  }
}
async function save() {
  if (!await formRef.value?.validate().catch(() => false)) return;
  try {
    const result = await editor.save();
    if (result === "saved") ElMessage.success(t("common.saveSuccess"));
    if (result) await load();
  } catch (cause) {
    ElMessage.error(websiteErrorMessage(cause));
  }
}
onMounted(load);useRefreshOnActivated(load);
</script>
