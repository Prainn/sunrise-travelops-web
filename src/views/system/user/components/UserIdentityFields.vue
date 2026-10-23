<template>
  <section>
    <h4 class="mt-0 mb-5 text-base font-semibold leading-6">
      {{ $t("identity.identities") }}
    </h4>
    <div v-for="(identity, index) in model" :key="identity.id ?? index">
      <el-form-item
        :label="$t('identity.scope')"
        :prop="`identities.${index}.scope`"
        :rules="{ required: true, message: $t('identity.chooseScope') }"
      >
        <el-select
          v-model="identity.scope"
          autocomplete="new-password"
          :disabled="Boolean(identity.id)"
          :placeholder="$t('identity.chooseScope')"
          @change="handleScopeChange(identity)"
        >
          <el-option
            v-for="scope in scopes"
            :key="scope"
            :value="scope"
            :label="loginScopeName(scope)"
            :disabled="model.some((i, other) => other !== index && i.scope === scope)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        :label="$t('common.department')"
        :prop="`identities.${index}.deptId`"
        :rules="{ required: true, message: $t('user.departmentPlaceholder') }"
      >
        <el-select
          v-model="identity.deptId"
          autocomplete="new-password"
          :placeholder="$t('user.departmentPlaceholder')"
          @change="updateRoles(identity, [])"
        >
          <el-option
            v-for="dept in departments.filter((d) => d.scope === identity.scope)"
            :key="dept.value"
            :value="dept.value"
            :label="dept.label"
          />
        </el-select>
      </el-form-item>
      <!-- 按目标身份范围判断：仅霖熹账号归属业务组且必填。 -->
      <el-form-item
        v-if="identity.scope === 'linxi'"
        :label="$t('businessGroup.label')"
        :prop="`identities.${index}.businessGroupId`"
        :rules="{ required: true, message: $t('businessGroup.selectPlaceholder') }"
      >
        <RemoteSelect
          :model-value="identity.businessGroupId ?? ''"
          :load-options="loadBusinessGroups"
          :selected-label="businessGroupLabel(identity)"
          :placeholder="$t('businessGroup.selectPlaceholder')"
          :clearable="false"
          class="w-full"
          @update:model-value="identity.businessGroupId = $event || null"
        />
      </el-form-item>
      <el-form-item
        :label="$t('common.roles')"
        :prop="`identities.${index}.roleIds`"
        :rules="{ required: true, type: 'array', min: 1, message: $t('user.rolePlaceholder') }"
      >
        <el-select
          autocomplete="new-password"
          :model-value="sortUserRoleIds(identity.roleIds, roles)"
          multiple
          :placeholder="$t('user.rolePlaceholder')"
          @update:model-value="updateRoles(identity, $event)"
        >
          <el-option
            v-for="role in roles.filter(
              (r) =>
                r.scopes.includes(identity.scope) &&
                (identity.scope !== 'headquarters' ||
                  r.code === (identity.deptId === 1 ? 'ADMIN' : 'EXECUTIVE')),
            )"
            :key="role.value"
            :value="role.value"
            :label="userRoleLabel(role.label, role.code)"
          />
        </el-select>
      </el-form-item>
      <el-form-item
        v-if="identity.scope !== 'shengxu' && isCoordinator(identity)"
        :label="$t('coordinatorDuty.label')"
        :prop="`identities.${index}.coordinatorDuty`"
        :rules="{ required: true, message: $t('coordinatorDuty.selectPlaceholder') }"
      >
        <el-radio-group
          :model-value="identity.coordinatorDuty ?? undefined"
          @update:model-value="updateDuty(identity, $event)"
        >
          <el-radio v-for="duty in COORDINATOR_DUTIES" :key="duty" :value="duty">
            {{ $t(`coordinatorDuty.${duty}`) }}
          </el-radio>
        </el-radio-group>
      </el-form-item>
    </div>
  </section>
</template>
<script setup lang="ts">
import RemoteSelect from "@/components/RemoteSelect/index.vue";
import type { RemoteOptionsQuery } from "@/composables/useRemoteOptions";
import { COORDINATOR_DUTIES, isCoordinatorIdentity } from "@/constants/coordinator-duty";
import { loginScopeName } from "@/constants/identity";
import { businessGroupService } from "@/services/business-group.service";
import { sortUserRoleIds, userRoleLabel } from "@/utils/user-role";
import type { UserIdentity, IdentityRoleOption, DepartmentOption } from "@/types/user";
const model = defineModel<UserIdentity[]>({ required: true });
const props = defineProps<{ roles: IdentityRoleOption[]; departments: DepartmentOption[] }>();
const { t } = useI18n();
const scopes = computed(() => [...new Set(props.departments.map((d) => d.scope))]);

function isCoordinator(identity: UserIdentity): boolean {
  return isCoordinatorIdentity(identity, props.roles);
}

function updateDuty(identity: UserIdentity, value: unknown): void {
  const duty = COORDINATOR_DUTIES.find((item) => item === value);
  if (duty) identity.coordinatorDuty = duty;
}

/** 霖熹/独立站计调默认仅收客；盛旭及非计调不设置分工。 */
function updateRoles(identity: UserIdentity, roleIds: string[]): void {
  identity.roleIds = sortUserRoleIds(roleIds, props.roles);
  if (identity.scope === "shengxu" || !isCoordinator(identity)) identity.coordinatorDuty = null;
  else identity.coordinatorDuty ??= "reception";
}

/** 切换到其他范围时清空部门、角色及仅霖熹适用的业务组。 */
function handleScopeChange(identity: UserIdentity): void {
  identity.deptId = undefined;
  updateRoles(identity, []);
  identity.businessGroupId = null;
  identity.businessGroupName = null;
  identity.businessGroupStatus = null;
}

/** 编辑时用详情回显原业务组（含已停用组），组名不翻译。 */
function businessGroupLabel(identity: UserIdentity): string {
  if (!identity.businessGroupName) return "";
  return identity.businessGroupStatus === "disabled"
    ? `${identity.businessGroupName}（${t("common.disabled")}）`
    : identity.businessGroupName;
}

// 首次绑定或换组只可选择启用组。
async function loadBusinessGroups(query: RemoteOptionsQuery) {
  const result = await businessGroupService.getPage({ ...query, status: "enabled" });
  return { total: result.total, list: result.list.map((group) => ({ id: group.id, label: group.name })) };
}
</script>
