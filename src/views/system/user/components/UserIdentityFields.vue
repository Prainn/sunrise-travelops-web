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
        :label="$t('user.department')"
        :prop="`identities.${index}.deptId`"
        :rules="{ required: true, message: $t('user.departmentPlaceholder') }"
      >
        <el-select
          v-model="identity.deptId"
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
        :label="$t('user.rolesLabel')"
        :prop="`identities.${index}.roleIds`"
        :rules="{ required: true, type: 'array', min: 1, message: $t('user.rolePlaceholder') }"
      >
        <el-select v-model="identity.roleIds" multiple :placeholder="$t('user.rolePlaceholder')">
          <el-option
            v-for="role in roles.filter(
              (r) =>
                r.scopes.includes(identity.scope) &&
                (identity.scope !== 'headquarters' ||
                  r.code === (identity.deptId === 1 ? 'ADMIN' : 'EXECUTIVE')),
            )"
            :key="role.value"
            :value="role.value"
            :label="role.label"
          />
        </el-select>
      </el-form-item>
    </div>
  </section>
</template>
<script setup lang="ts">
import { loginScopeName } from "@/constants/identity";
import type { UserIdentity, IdentityRoleOption, DepartmentOption } from "@/types/user";
const model = defineModel<UserIdentity[]>({ required: true });
const props = defineProps<{ roles: IdentityRoleOption[]; departments: DepartmentOption[] }>();
const scopes = computed(() => [...new Set(props.departments.map((d) => d.scope))]);
</script>
