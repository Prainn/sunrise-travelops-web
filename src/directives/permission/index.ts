import type { Directive, DirectiveBinding } from "vue";

import { useUserStore } from "@/stores/user";

const HIDDEN_DISPLAY = "__permDisplay";
type PermElement = HTMLElement & { [HIDDEN_DISPLAY]?: string };

function isAllowed(requiredPerms: unknown): boolean {
  // 校验传入的权限值是否合法
  if (!requiredPerms || (typeof requiredPerms !== "string" && !Array.isArray(requiredPerms))) {
    throw new Error(
      "需要提供权限标识！例如：v-has-perm=\"'sys:user:create'\" 或 v-has-perm=\"['sys:user:create', 'sys:user:update']\"",
    );
  }

  // 按钮只依据服务端下发的有效权限，ROOT 不再特殊放行。
  const { perms } = useUserStore().userInfo;

  return Array.isArray(requiredPerms)
    ? requiredPerms.some((perm) => perms.includes(perm))
    : perms.includes(requiredPerms);
}

/** 通过显示状态而非删除节点控制按钮，避免破坏 Vue 对 DOM 的管理，并随权限变化更新。 */
function applyPermission(el: PermElement, binding: DirectiveBinding) {
  const allowed = isAllowed(binding.value);
  if (allowed) {
    if (HIDDEN_DISPLAY in el) {
      el.style.display = el[HIDDEN_DISPLAY] ?? "";
      delete el[HIDDEN_DISPLAY];
    }
  } else if (!(HIDDEN_DISPLAY in el)) {
    el[HIDDEN_DISPLAY] = el.style.display;
    el.style.display = "none";
  }
}

/**
 * 按钮权限
 */
export const hasPerm: Directive = {
  mounted: applyPermission,
  updated: applyPermission,
};
