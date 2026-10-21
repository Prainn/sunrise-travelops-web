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
          @change="
            identity.deptId = undefined;
            identity.roleIds = [];
          "
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
          @change="identity.roleIds = []"
        >
          <el-option
            v-for="dept in departments.filter((d) => d.scope === identity.scope)"
            :key="dept.value"
            :value="dept.value"
            :label="dept.label"
          />
        </el-select>
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
          @update:model-value="identity.roleIds = sortUserRoleIds($event, roles)"
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
    </div>
  </section>
</template>
<script setup lang="ts">
import { loginScopeName } from "@/constants/identity";
import { sortUserRoleIds, userRoleLabel } from "@/utils/user-role";
import type { UserIdentity, IdentityRoleOption, DepartmentOption } from "@/types/user";
const model = defineModel<UserIdentity[]>({ required: true });
const props = defineProps<{ roles: IdentityRoleOption[]; departments: DepartmentOption[] }>();
const scopes = computed(() => [...new Set(props.departments.map((d) => d.scope))]);
</script>
