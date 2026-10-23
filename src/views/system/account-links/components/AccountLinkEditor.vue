<!-- 账号关联新增/编辑：跨页选择 2–3 个账号（每业务至多一个），选择标识方式并可为受影响账号调整标识 -->
<template>
  <AppDialog
    v-model="visible"
    :title="$t(group ? 'common.edit' : 'common.create')"
    size="lg"
    :busy="isSubmitting"
    destroy-on-close
  >
    <div class="flex flex-col gap-5" :inert="isSubmitting">
      <section :aria-label="$t('accountLink.selected', { count: selected.length })">
        <h3 class="mb-2 mt-0 text-sm font-medium">
          {{ $t("accountLink.selected", { count: selected.length }) }}
        </h3>
        <div class="account-link-editor__selected w-full">
          <div class="mb-2 text-xs text-[var(--el-text-color-secondary)]">
            {{ $t("accountLink.selectHint") }}
          </div>
          <DataTable
            :data="selected"
            row-key="userId"
            size="small"
          >
            <template #empty>
              {{ $t("accountLink.selectedEmpty") }}
            </template>
            <el-table-column prop="scopeName" :label="$t('accountLink.scope')" width="100" />
            <el-table-column prop="nickname" :label="$t('user.nickname')" min-width="120" />
            <el-table-column prop="username" :label="$t('common.username')" min-width="120" />
            <el-table-column :label="$t('accountLink.tourCode')" width="110">
              <template #default="{ row }">
                {{ row.tourCode || "-" }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
                  {{ $t(row.status === "enabled" ? "common.enabled" : "common.disabled") }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('common.actions')"
              width="80"
              align="center"
              fixed="right"
            >
              <template #default="{ row }">
                <el-button
                  type="danger"
                  size="small"
                  link
                  @click="unselect(row.userId)"
                >
                  {{ $t("common.remove") }}
                </el-button>
              </template>
            </el-table-column>
          </DataTable>
        </div>
      </section>

      <section :aria-label="$t('accountLink.candidates')">
        <h3 class="mb-2 mt-0 text-sm font-medium">
          {{ $t("accountLink.candidates") }}
        </h3>
        <div class="flex w-full flex-col gap-2">
          <FilterBar :model="candidates.params" @reset="resetCandidateFilters">
            <el-form-item :label="$t('accountLink.scope')">
              <el-select
                v-model="candidates.params.scope"
                autocomplete="new-password"
                clearable
                :placeholder="$t('common.all')"
              >
                <el-option
                  v-for="scope in ['shengxu', 'linxi', 'website']"
                  :key="scope"
                  :value="scope"
                  :label="$t(`accountLink.businessOptions.${scope}`)"
                />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('common.keywords')" class="filter-bar__wide">
              <el-input
                v-model="candidates.params.keyword"
                :placeholder="$t('accountLink.candidateSearch')"
                maxlength="100"
                clearable
              />
            </el-form-item>
          </FilterBar>
          <DataTable
            :error="candidates.error.value"
            :loading="candidates.loading.value"
            :data="candidates.list.value"
            :max-height="280"
            :filtered="Boolean(candidates.params.keyword || candidates.params.scope)"
            row-key="userId"
            size="small"
            @retry="loadCandidates"
          >
            <el-table-column prop="scopeName" :label="$t('accountLink.scope')" width="100" />
            <el-table-column prop="nickname" :label="$t('user.nickname')" min-width="120" />
            <el-table-column prop="username" :label="$t('common.username')" min-width="120" />
            <el-table-column :label="$t('accountLink.tourCode')" width="110">
              <template #default="{ row }">
                {{ row.tourCode || "-" }}
              </template>
            </el-table-column>
            <el-table-column :label="$t('common.status')" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'enabled' ? 'success' : 'info'" size="small">
                  {{ $t(row.status === "enabled" ? "common.enabled" : "common.disabled") }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column
              :label="$t('common.actions')"
              width="130"
              align="center"
              fixed="right"
              :show-overflow-tooltip="false"
            >
              <template #default="{ row }">
                <el-button
                  :type="isSelected(row.userId) ? 'danger' : 'primary'"
                  size="small"
                  link
                  @click="toggleAccount(row as LinkedAccount)"
                >
                  {{
                    isSelected(row.userId)
                      ? $t("common.remove")
                      : $t(hasSelectedScope(row.scope) ? "accountLink.replace" : "accountLink.select")
                  }}
                </el-button>
              </template>
            </el-table-column>
          </DataTable>
          <Pagination
            v-if="candidates.total.value > 0"
            v-model:page="candidates.params.page"
            v-model:limit="candidates.params.pageSize"
            :total="candidates.total.value"
            variant="compact"
            @pagination="loadCandidates"
          />
        </div>
        <p class="mb-0 mt-2 text-xs text-[var(--el-text-color-secondary)]">
          {{ $t("accountLink.replaceHint") }}
        </p>
      </section>

      <el-form
        ref="formRef"
        :model="form"
        label-position="top"
        @submit.prevent
      >
        <el-form-item :label="$t('accountLink.tourCodeMode')">
          <el-radio-group v-model="form.mode">
            <el-radio value="keep">
              {{ $t("accountLink.modeKeep") }}
            </el-radio>
            <el-radio value="unify">
              {{ $t("accountLink.modeUnify") }}
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          v-if="form.mode === 'unify'"
          :label="$t('accountLink.unifyTourCode')"
          prop="tourCode"
          :rules="tourCodeRules(true)"
        >
          <el-input
            v-model="form.tourCode"
            maxlength="10"
            :placeholder="$t('accountLink.tourCodePlaceholder')"
            @blur="form.tourCode = normalizeTourCode(form.tourCode)"
          />
        </el-form-item>

        <el-form-item v-if="overrideTargets.length" :label="$t('accountLink.overrides')">
          <div class="w-full">
            <div class="mb-2 text-xs text-[var(--el-text-color-secondary)]">
              {{ $t("accountLink.overridesHint") }}
            </div>
            <el-form-item
              v-for="account in overrideTargets"
              :key="account.userId"
              :prop="['overrides', account.userId]"
              :rules="tourCodeRules(false)"
              class="mb-3"
            >
              <div class="flex w-full items-center gap-2">
                <span class="min-w-0 flex-1 truncate">
                  {{ account.scopeName }} · {{ account.nickname }}（{{ account.username }}）·
                  {{ account.tourCode || "-" }}
                </span>
                <el-tag v-if="removed.includes(account)" type="warning" size="small">
                  {{ $t("accountLink.removedMember") }}
                </el-tag>
                <el-tag v-if="sharesTourCode(account, involved)" type="danger" size="small">
                  {{ $t("accountLink.sharedTourCode") }}
                </el-tag>
                <el-input
                  v-model="form.overrides[account.userId]"
                  class="!w-40"
                  maxlength="10"
                  clearable
                  :placeholder="$t('accountLink.newTourCode')"
                  @blur="
                    form.overrides[account.userId] = normalizeTourCode(
                      form.overrides[account.userId] ?? '',
                    )
                  "
                />
              </div>
            </el-form-item>
          </div>
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <span class="mr-auto text-sm text-[var(--el-text-color-secondary)]" role="status">
        {{ $t(selected.length < 2 ? "accountLink.memberCountInvalid" : "accountLink.selected", { count: selected.length }) }}
      </span>
      <el-button :disabled="isSubmitting" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button
        type="primary"
        :loading="isSubmitting"
        :disabled="selected.length < 2"
        @click="handleSubmit"
      >
        {{ $t("common.save") }}
      </el-button>
    </template>
  </AppDialog>
</template>

<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { ElMessage, type FormInstance } from "element-plus";

import { ApiErrorCode } from "@/api/error-code";
import { isApiError } from "@/api/request";
import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import FilterBar from "@/components/FilterBar/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import { usePageTable } from "@/composables";
import { accountLinkService } from "@/services/account-link.service";
import type {
  AccountLink,
  AccountLinkCandidateQuery,
  AccountLinkSaveInput,
  AccountLinkTourCodeMode,
  LinkedAccount,
  LinkedAccountScope,
} from "@/types/account-link";
import { requestErrorMessage } from "@/utils/version-conflict";
import { useResourceFormSubmit } from "@/views/resources/useResourceFormSubmit";
import { collectTourCodes, normalizeTourCode, sharesTourCode, tourCodeRules } from "../tour-code";

const MAX_MEMBERS = 3;

const props = defineProps<{ group: AccountLink | null }>();
const emit = defineEmits<{ saved: []; stale: [] }>();
const visible = defineModel<boolean>({ required: true });

const { t } = useI18n();
const formRef = ref<FormInstance>();
const { isSubmitting, submitForm } = useResourceFormSubmit(formRef);

const selected = ref<LinkedAccount[]>([]);
const form = reactive<{
  mode: AccountLinkTourCodeMode;
  tourCode: string;
  overrides: Record<string, string>;
}>({ mode: "keep", tourCode: "", overrides: {} });

const candidates = usePageTable<LinkedAccount, AccountLinkCandidateQuery>({
  initialParams: { page: 1, pageSize: 10, keyword: "", groupId: undefined, scope: undefined },
  request: accountLinkService.getCandidates,
});

function resetCandidateFilters() {
  candidates.params.keyword = "";
  candidates.params.scope = undefined;
}

let requestedFilter = "";
const currentFilter = () => JSON.stringify([candidates.params.keyword, candidates.params.scope]);

function loadCandidates(): void {
  requestedFilter = currentFilter();
  candidates.fetchData().catch(() => undefined);
}

// 重开弹窗重置筛选时已主动加载，筛选未变化的防抖回调不再重复请求。
const searchCandidates = useDebounceFn(() => {
  if (!visible.value || currentFilter() === requestedFilter) return;
  candidates.params.page = 1;
  loadCandidates();
}, 300);
watch(() => [candidates.params.keyword, candidates.params.scope], searchCandidates);

watch(visible, (open) => {
  if (!open) return;
  selected.value = [...(props.group?.members ?? [])];
  Object.assign(form, { mode: "keep", tourCode: "", overrides: {} });
  candidates.resetParams();
  candidates.params.groupId = props.group?.id;
  loadCandidates();
});

/** 编辑时被移出的原成员。 */
const removed = computed(() => {
  const ids = new Set(selected.value.map((account) => account.userId));
  return (props.group?.members ?? []).filter((account) => !ids.has(account.userId));
});

/** 本次保存涉及的全部账号，用于提示共享标识。 */
const involved = computed(() => [...selected.value, ...removed.value]);

/** keep 可覆盖原成员与新成员；unify 组内统一，仅可覆盖被移出成员。 */
const overrideTargets = computed(() =>
  form.mode === "unify" ? removed.value : involved.value,
);

function isSelected(userId: string): boolean {
  return selected.value.some((account) => account.userId === userId);
}

function hasSelectedScope(scope: LinkedAccountScope): boolean {
  return selected.value.some((account) => account.scope === scope);
}

function toggleAccount(account: LinkedAccount): void {
  if (isSelected(account.userId)) {
    unselect(account.userId);
    return;
  }
  const index = selected.value.findIndex((item) => item.scope === account.scope);
  if (index >= 0) {
    selected.value.splice(index, 1, account);
  } else if (selected.value.length < MAX_MEMBERS) {
    selected.value.push(account);
  }
}

function unselect(userId: string): void {
  selected.value = selected.value.filter((account) => account.userId !== userId);
}

function handleSaveError(error: unknown): void {
  if (isApiError(error) && error.code === ApiErrorCode.CONFLICT) {
    if (error.details?.currentVersion !== undefined) {
      ElMessage.warning(requestErrorMessage(error));
      emit("stale");
      return;
    }
    ElMessage.error(t("accountLink.memberTaken"));
    loadCandidates();
    return;
  }
  // USER_TOUR_CODE_EXISTS 等保留表单，由管理员调整后重试。
  ElMessage.error(requestErrorMessage(error));
}

function handleSubmit(): Promise<void> {
  return submitForm(async () => {
    if (selected.value.length < 2 || selected.value.length > MAX_MEMBERS) {
      ElMessage.warning(t("accountLink.memberCountInvalid"));
      return;
    }
    if (new Set(selected.value.map((account) => account.scope)).size !== selected.value.length) {
      ElMessage.warning(t("accountLink.scopeDuplicate"));
      return;
    }
    const tourCodes = collectTourCodes(form.overrides, overrideTargets.value);
    const body: AccountLinkSaveInput = {
      userIds: selected.value.map((account) => account.userId),
      tourCodeMode: form.mode,
      ...(form.mode === "unify" ? { tourCode: normalizeTourCode(form.tourCode) } : {}),
      ...(tourCodes.length ? { tourCodes } : {}),
    };
    try {
      if (props.group) {
        await accountLinkService.update(props.group.id, { ...body, version: props.group.version });
        ElMessage.success(t("common.updateSuccess"));
      } else {
        await accountLinkService.create(body);
        ElMessage.success(t("common.createSuccess"));
      }
      visible.value = false;
      emit("saved");
    } catch (error) {
      handleSaveError(error);
    }
  });
}
</script>

<style scoped lang="scss">
.account-link-editor__selected :deep(.el-table__empty-block) {
  min-height: 64px;
}
</style>
