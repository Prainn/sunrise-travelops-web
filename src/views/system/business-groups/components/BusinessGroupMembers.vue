<!-- 业务组成员：查看、加入（仅启用组）与调入其他启用组；不提供移出为无组 -->
<template>
  <div class="flex flex-col gap-3">
    <el-alert
      v-if="group.status === 'disabled'"
      :title="$t('businessGroup.disabledNoJoin')"
      type="info"
      :closable="false"
      show-icon
    />
    <div v-hasPerm="'sys:business-group:update'" class="flex gap-2">
      <RemoteSelect
        v-model="candidateId"
        :load-options="loadCandidates"
        :query-key="group.id"
        :disabled="group.status === 'disabled' || isPending('add')"
        :placeholder="$t('businessGroup.searchUserPlaceholder')"
        class="flex-1"
      />
      <el-button
        type="primary"
        :disabled="!candidateId || group.status === 'disabled'"
        :loading="isPending('add')"
        @click="addMember"
      >
        {{ $t("businessGroup.addMember") }}
      </el-button>
    </div>

    <DataTable
      :error="error"
      :loading="loading"
      :data="list"
      row-key="id"
      @retry="fetchData"
    >
      <el-table-column prop="nickname" :label="$t('user.nickname')" min-width="140" />
      <el-table-column prop="username" :label="$t('common.username')" min-width="140" />
      <el-table-column :label="$t('common.roles')" min-width="140">
        <template #default="{ row }">
          {{ userRoleLabels(row.roleNames, roleOptions).join("、") }}
        </template>
      </el-table-column>
      <el-table-column :label="$t('common.status')" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 1 ? 'success' : 'info'">
            {{ $t(row.status === 1 ? "common.normal" : "common.disabled") }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('common.actions')"
        width="100"
        fixed="right"
        :show-overflow-tooltip="false"
      >
        <template #default="{ row }">
          <el-button
            v-hasPerm="'sys:business-group:update'"
            type="primary"
            size="small"
            link
            :disabled="isPending(row.id)"
            @click="openMove(row as UserItem)"
          >
            {{ $t("businessGroup.move") }}
          </el-button>
        </template>
      </el-table-column>
    </DataTable>

    <Pagination
      v-if="total > 0"
      v-model:page="params.page"
      v-model:limit="params.pageSize"
      :total="total"
      @pagination="fetchData"
    />

    <AppDialog
      v-model="move.visible"
      :title="$t('businessGroup.moveTitle', { name: move.user?.nickname || move.user?.username || '' })"
      size="sm"
      :busy="move.user ? isPending(move.user.id) : false"
      append-to-body
      destroy-on-close
    >
      <RemoteSelect
        v-model="move.targetId"
        :load-options="loadTargetGroups"
        :query-key="group.id"
        :placeholder="$t('businessGroup.selectPlaceholder')"
        :clearable="false"
        class="w-full"
      />
      <template #footer>
        <el-button @click="move.visible = false">
          {{ $t("common.cancel") }}
        </el-button>
        <el-button
          type="primary"
          :disabled="!move.targetId"
          :loading="move.user ? isPending(move.user.id) : false"
          @click="confirmMove"
        >
          {{ $t("common.confirm") }}
        </el-button>
      </template>
    </AppDialog>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";

import AppDialog from "@/components/AppDialog/index.vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { usePageTable } from "@/composables";
import { usePendingActions } from "@/composables/usePendingActions";
import { businessGroupService } from "@/services/business-group.service";
import { userService } from "@/services/user.service";
import type { BusinessGroupItem } from "@/types/business-group";
import type { IdentityRoleOption, UserItem, UserQueryParams } from "@/types/user";
import { userRoleLabels } from "@/utils/user-role";
import { requestErrorMessage } from "@/utils/version-conflict";

const props = defineProps<{ group: BusinessGroupItem }>();
const emit = defineEmits<{ changed: [] }>();

const { t } = useI18n();
const { isPending, run } = usePendingActions();

const { loading, list, total, error, params, fetchData, handleQuery } = usePageTable<
  UserItem,
  UserQueryParams
>({
  initialParams: { page: 1, pageSize: 20, scope: "linxi", businessGroupId: props.group.id },
  request: userService.getPage,
});

function memberLabel(user: UserItem): string {
  const name = user.nickname || user.username || user.id;
  return user.username && user.username !== name ? `${name}（${user.username}）` : name;
}

// 待选成员按 scope=linxi 服务端分页搜索；保留 id→User 以取最新 version。
const candidates = new Map<string, UserItem>();
const candidateId = ref("");
async function loadCandidates(query: RemoteOptionsQuery) {
  const result = await userService.getPage({ ...query, scope: "linxi" });
  return {
    total: result.total,
    list: result.list.map((user) => {
      candidates.set(user.id, user);
      const identity = user.identities[0];
      return {
        id: user.id,
        label: memberLabel(user),
        description: identity?.businessGroupName ?? undefined,
        // 历史混合身份账号不猜测身份；已在本组的不重复加入。
        disabled: user.identities.length !== 1 || identity?.businessGroupId === props.group.id,
      };
    }),
  };
}

async function changeGroup(user: UserItem, businessGroupId: string): Promise<boolean> {
  try {
    await userService.updateBusinessGroup(user.id, { version: user.version, businessGroupId });
    ElMessage.success(t("common.updateSuccess"));
    return true;
  } catch (cause) {
    ElMessage.error(requestErrorMessage(cause));
    return false;
  }
}

async function addMember(): Promise<void> {
  const user = candidates.get(candidateId.value);
  if (!user || props.group.status === "disabled") return;
  await run("add", async () => {
    if (await changeGroup(user, props.group.id)) {
      candidateId.value = "";
      emit("changed");
    }
    await fetchData();
  });
}

// 调组只列启用组，排除当前组。
async function loadTargetGroups(query: RemoteOptionsQuery) {
  const result = await businessGroupService.getPage({ ...query, status: "enabled" });
  return {
    total: result.total,
    list: result.list
      .filter((item) => item.id !== props.group.id)
      .map((item) => ({ id: item.id, label: item.name })),
  };
}

const move = reactive<{ visible: boolean; user: UserItem | null; targetId: string }>({
  visible: false,
  user: null,
  targetId: "",
});
function openMove(user: UserItem): void {
  Object.assign(move, { visible: true, user, targetId: "" });
}
async function confirmMove(): Promise<void> {
  const user = move.user;
  if (!user || !move.targetId) return;
  await run(user.id, async () => {
    if (await changeGroup(user, move.targetId)) {
      move.visible = false;
      emit("changed");
    }
    await fetchData();
  });
}

// 后端 roleNames 顺序不固定，按角色选项 code 排序后展示，与用户管理页一致。
const roleOptions = ref<IdentityRoleOption[]>([]);
onMounted(async () => {
  roleOptions.value = await userService.getRoleOptions();
  await handleQuery();
});
</script>
