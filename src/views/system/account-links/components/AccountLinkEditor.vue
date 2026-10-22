<!-- 账号关联新增/编辑：跨页选择 2–3 个账号（每业务至多一个），选择标识方式并可为受影响账号调整标识 -->
<template>
  <AppDialog
    v-model="visible"
    :title="$t(group ? 'common.edit' : 'common.create')"
    size="lg"
    :busy="isSubmitting"
    destroy-on-close
  >
    <el-form
      ref="formRef"
      :model="form"
      label-position="top"
      @submit.prevent
    >
      <el-form-item :label="$t('accountLink.selected', { count: selected.length })">
        <div class="w-full">
          <div class="mb-2 text-xs text-[var(--el-text-color-secondary)]">
            {{ $t("accountLink.selectHint") }}
          </div>
          <el-table
            :data="selected"
            row-key="userId"
            size="small"
            border
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
            <el-table-column :label="$t('common.actions')" width="80" align="center">
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
          </el-table>
        </div>
      </el-form-item>

      <el-form-item :label="$t('accountLink.candidates')">
        <div class="flex w-full flex-col gap-2">
          <el-input
            v-model="candidates.params.keyword"
            :placeholder="$t('accountLink.candidateSearch')"
            maxlength="100"
            clearable
          />
          <DataTable
            :error="candidates.error.value"
            :loading="candidates.loading.value"
            :data="candidates.list.value"
            :filtered="Boolean(candidates.params.keyword)"
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
              :show-overflow-tooltip="false"
            >
              <template #default="{ row }">
                <el-button
                  type="primary"
                  size="small"
                  link
                  :disabled="Boolean(selectBlocker(row as LinkedAccount))"
                  @click="select(row as LinkedAccount)"
                >
                  {{ selectBlocker(row as LinkedAccount) || $t("accountLink.select") }}
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
      </el-form-item>

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
    <template #footer>
      <el-button :disabled="isSubmitting" @click="visible = false">
        {{ $t("common.cancel") }}
      </el-button>
      <el-button type="primary" :loading="isSubmitting" @click="handleSubmit">
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
import Pagination from "@/components/Pagination/index.vue";
import { usePageTable } from "@/composables";
import { accountLinkService } from "@/services/account-link.service";
import type {
  AccountLink,
  AccountLinkCandidateQuery,
  AccountLinkSaveInput,
  AccountLinkTourCodeMode,
  LinkedAccount,
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
  initialParams: { page: 1, pageSize: 10, keyword: "", groupId: undefined },
  request: accountLinkService.getCandidates,
});

function loadCandidates(): void {
  candidates.fetchData().catch(() => undefined);
}

const searchCandidates = useDebounceFn(() => {
  candidates.params.page = 1;
  loadCandidates();
}, 300);
watch(() => candidates.params.keyword, searchCandidates);

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

function selectBlocker(account: LinkedAccount): string {
  if (selected.value.some((item) => item.userId === account.userId))
    return t("accountLink.alreadySelected");
  if (selected.value.some((item) => item.scope === account.scope))
    return t("accountLink.scopeTaken");
  if (selected.value.length >= MAX_MEMBERS) return t("accountLink.limitReached");
  return "";
}

function select(account: LinkedAccount): void {
  if (!selectBlocker(account)) selected.value.push(account);
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
