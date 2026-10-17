<template>
  <PageShell v-loading="loading" aside-width="224px">
    <template #aside>
      <SectionCard
        fill
        padding="compact"
        :title="$t('menuPermission.rolesTitle')"
        body-class="overflow-y-auto"
      >
        <div class="flex flex-col gap-2">
          <el-button
            v-for="role in roles"
            :key="role.code"
            class="ml-0! w-full"
            :type="selected?.code === role.code ? 'primary' : 'default'"
            :disabled="saving"
            @click="selectRole(role)"
          >
            {{ $t(`menuPermission.roles.${role.code}`) }}
          </el-button>
        </div>
      </SectionCard>
    </template>

    <SectionCard fill>
      <TableToolbar :refreshing="loading" @refresh="reload">
        <span class="font-medium text-strong">{{ selected ? $t(`menuPermission.roles.${selected.code}`) : $t('route.menuPermissions') }}</span>
        <el-button :disabled="!selected" @click="setExpanded(true)">
          {{ $t('menuPermission.expand') }}
        </el-button>
        <el-button :disabled="!selected" @click="setExpanded(false)">
          {{ $t('menuPermission.collapse') }}
        </el-button>
      </TableToolbar>
      <el-alert
        :title="$t('menuPermission.loginNotice')"
        type="info"
        :closable="false"
      />
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
      />
      <el-alert
        v-if="selected?.locked"
        :title="$t('menuPermission.rootLocked')"
        type="info"
        :closable="false"
      />
      <p class="m-0 text-sm text-muted">
        {{ $t('menuPermission.scopeNotice') }}
      </p>
      <div class="min-h-0 flex-1 overflow-y-auto" :inert="saving">
        <el-tree
          ref="tree"
          :data="nodes"
          node-key="key"
          show-checkbox
          default-expand-all
          :expand-on-click-node="false"
          @check="readChecked"
        >
          <template #default="{ data }">
            <span>{{ data.label }}</span>
            <span v-if="data.unavailable" class="ml-3 text-xs text-muted">{{ $t('menuPermission.unavailable') }}</span>
          </template>
        </el-tree>
      </div>
      <template #footer>
        <el-button :disabled="!dirty || saving" @click="cancel">
          {{ $t('common.cancel') }}
        </el-button>
        <el-button
          type="primary"
          :disabled="!dirty || selected?.locked"
          :loading="saving"
          @click="save"
        >
          {{ $t('common.save') }}
        </el-button>
      </template>
    </SectionCard>
  </PageShell>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import { useI18n } from "vue-i18n";
import { ElMessage, ElMessageBox, type ElTree } from "element-plus";
import PageShell from "@/components/PageShell/index.vue";
import SectionCard from "@/components/SectionCard/index.vue";
import TableToolbar from "@/components/TableToolbar/index.vue";
import { menuPermissionsService } from "@/services/menu-permissions.service";
import type { MenuDefinition, RoleMenuConfig } from "@/types/menu-permissions";

defineOptions({ name: "MenuPermissions" });
const { t } = useI18n();
const roles = ref<RoleMenuConfig[]>([]);
const menus = ref<MenuDefinition[]>([]);
const selected = ref<RoleMenuConfig>();
const checked = ref<string[]>([]);
const tree = ref<InstanceType<typeof ElTree>>();
const loading = ref(false);
const saving = ref(false);
const error = ref("");
const dirty = computed(() => Boolean(selected.value && JSON.stringify([...checked.value].sort()) !== JSON.stringify([...selected.value.menuKeys].sort())));
const nodes = computed(() => [...new Set(menus.value.map((menu) => menu.group))].map((group) => {
  const children = menus.value.filter((menu) => menu.group === group).map((menu) => ({
    key: menu.key,
    label: t(`route.${menu.title}`),
    disabled: Boolean(selected.value?.locked || !selected.value?.allowedMenuKeys.includes(menu.key)),
    unavailable: !selected.value?.allowedMenuKeys.includes(menu.key),
  }));
  return { key: `group:${group}`, label: t(`route.${group}`), disabled: children.every((child) => child.disabled), children };
}));

async function discard() {
  if (!dirty.value) return true;
  try {
    await ElMessageBox.confirm(t("menuPermission.discard"), t("common.tip"), { confirmButtonText: t("common.confirm"), cancelButtonText: t("common.cancel"), type: "warning" });
    return true;
  } catch { return false; }
}
async function selectRole(role: RoleMenuConfig) {
  if (saving.value || role.code === selected.value?.code || !await discard()) return;
  selected.value = role;
  cancel();
}
function cancel() {
  checked.value = [...(selected.value?.menuKeys ?? [])];
  void nextTick(() => tree.value?.setCheckedKeys(checked.value));
}
function readChecked() {
  checked.value = (tree.value?.getCheckedKeys(true) ?? []).filter((key): key is string => typeof key === "string" && Boolean(selected.value?.allowedMenuKeys.includes(key)));
}
function setExpanded(expanded: boolean) {
  for (const node of nodes.value) {
    const current = tree.value?.getNode(node.key);
    if (current) current.expanded = expanded;
  }
}
async function reload() {
  if (loading.value || saving.value || !await discard()) return;
  loading.value = true;
  error.value = "";
  try {
    const result = await menuPermissionsService.list();
    menus.value = result.menus;
    roles.value = result.roles;
    selected.value = result.roles.find((role) => role.code === selected.value?.code) ?? result.roles[0];
    cancel();
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause); }
  finally { loading.value = false; }
}
async function save() {
  if (!selected.value || selected.value.locked || saving.value || !dirty.value) return;
  saving.value = true;
  try {
    const saved = await menuPermissionsService.save(selected.value, checked.value);
    roles.value = roles.value.map((role) => role.code === saved.code ? saved : role);
    selected.value = saved;
    cancel();
    ElMessage.success(t("menuPermission.saved"));
  } catch (cause) { ElMessage.error(cause instanceof Error ? cause.message : String(cause)); }
  finally { saving.value = false; }
}
onMounted(reload);
onBeforeRouteLeave(() => saving.value ? false : discard());
</script>
