import type { ShengxuLedgerInput, ShengxuLedgerItem } from "@/types/shengxu-ledger";

/** 团数上限与后端 DTO 一致（PostgreSQL integer）。 */
export const MAX_GROUPS = 2147483647;

/** 盛旭台账表单；团数清空保持 null，由必填校验拦截而非补 0。 */
export interface ShengxuLedgerFormState {
  recordDate: string;
  agencyId: string;
  contactId: string;
  quotedGroups: number | null;
  convertedGroups: number | null;
  quoteSent: boolean;
  itinerary: string;
  notConvertedReason: string;
  /** 以下为展示用快照，不提交。 */
  agencyName: string;
  contactName: string;
  countryOrRegion: string;
  city: string;
}

export function emptyShengxuLedgerForm(): ShengxuLedgerFormState {
  return {
    recordDate: "",
    agencyId: "",
    contactId: "",
    quotedGroups: null,
    convertedGroups: null,
    quoteSent: false,
    itinerary: "",
    notConvertedReason: "",
    agencyName: "",
    contactName: "",
    countryOrRegion: "",
    city: "",
  };
}

/** 编辑时直接回显详情中的历史 ID、名称与地区，不依赖选项第一页。 */
export function shengxuLedgerFormFromItem(item: ShengxuLedgerItem): ShengxuLedgerFormState {
  return {
    recordDate: item.recordDate,
    agencyId: item.agencyId,
    contactId: item.contactId,
    quotedGroups: item.quotedGroups,
    convertedGroups: item.convertedGroups,
    quoteSent: item.quoteSent,
    itinerary: item.itinerary,
    notConvertedReason: item.notConvertedReason,
    agencyName: item.agencyName,
    contactName: item.contactName,
    countryOrRegion: item.countryOrRegion,
    city: item.city,
  };
}

function requiredGroups(value: number | null): number {
  if (value === null) throw new Error("Ledger group count must be validated before submit");
  return value;
}

/**
 * 生成合同允许的新增/编辑字段，快照与只读字段不提交。
 *
 * @param form - 已通过表单校验的状态。
 * @returns 盛旭台账写入请求体（PUT 另需合并 version）。
 */
export function shengxuLedgerInput(form: ShengxuLedgerFormState): ShengxuLedgerInput {
  return {
    recordDate: form.recordDate,
    agencyId: form.agencyId,
    contactId: form.contactId,
    quotedGroups: requiredGroups(form.quotedGroups),
    convertedGroups: requiredGroups(form.convertedGroups),
    quoteSent: form.quoteSent,
    itinerary: form.itinerary,
    notConvertedReason: form.notConvertedReason,
  };
}
