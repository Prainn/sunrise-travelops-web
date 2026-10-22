import { onScopeDispose } from "vue";

interface EditState {
  /** 有未保存的编辑（含打开中的编辑弹窗、行程草稿）。 */
  dirty: () => boolean;
  saving?: () => boolean;
}

const editStates = new Set<EditState>();

/** 当前标签页全部已注册编辑状态的阻止原因；keep-alive 缓存中的页面同样计入。 */
export function getEditBlockers(): ("dirty" | "saving")[] {
  const blockers = new Set<"dirty" | "saving">();
  editStates.forEach((state) => {
    if (state.saving?.()) blockers.add("saving");
    if (state.dirty()) blockers.add("dirty");
  });
  return [...blockers];
}

/** 注册真实编辑/保存生命周期，账号切换前据此阻止，不自动保存或丢弃。 */
export function useAccountSwitchGuard(state: EditState): void {
  editStates.add(state);
  onScopeDispose(() => editStates.delete(state));
}
