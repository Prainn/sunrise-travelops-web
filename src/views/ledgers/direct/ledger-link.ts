import { readonly, ref } from "vue";
import { tryOnScopeDispose } from "@vueuse/core";
import type { LocationQuery } from "vue-router";

export const LEDGER_HIGHLIGHT_MS = 3000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type LedgerLinkAction = "review" | "operate";

/** 飞书台账链接的定位目标；action 只用于提示，不触发审核或操作。 */
export interface LedgerLinkTarget {
  ledgerId: string;
  highlight: boolean;
  action?: LedgerLinkAction;
}

/**
 * 解析台账地址中的精确定位参数；仅有 keyword 的旧链接返回 null，沿用原关键词查询。
 *
 * @param query - 当前路由查询参数。
 * @returns 合法 ledgerId 的定位目标，否则为 null。
 */
export function parseLedgerLink(query: LocationQuery): LedgerLinkTarget | null {
  const { ledgerId, highlight, action } = query;
  if (typeof ledgerId !== "string" || !UUID_PATTERN.test(ledgerId)) return null;
  return {
    ledgerId,
    highlight: highlight === "1",
    action: action === "review" || action === "operate" ? action : undefined,
  };
}

/**
 * 单行临时高亮：新目标会替换旧目标，计时结束、清除或作用域销毁时取消。
 *
 * @returns 当前高亮的行 ID 与开始、清除方法。
 */
export function useRowHighlight() {
  const highlightedId = ref("");
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear() {
    clearTimeout(timer);
    timer = undefined;
    highlightedId.value = "";
  }
  function start(id: string) {
    clear();
    highlightedId.value = id;
    timer = setTimeout(clear, LEDGER_HIGHLIGHT_MS);
  }

  tryOnScopeDispose(clear);
  return { highlightedId: readonly(highlightedId), start, clear };
}
