import type {
  DirectLedgerBusinessUnit,
  DirectLedgerInput,
  DirectLedgerItem,
} from "@/types/direct-ledger";

/** 未填写/是/否 三态的选项值，避免 null 与 false 在单选组件中混淆。 */
export type TriStateValue = "unset" | "yes" | "no";

/** 直客台账表单；展示用人员姓名快照不提交。 */
export interface DirectLedgerFormState extends DirectLedgerInput {
  receivingAccountName: string;
  operatorName: string;
}

export function emptyDirectLedgerForm(): DirectLedgerFormState {
  return {
    receivedDate: "",
    source: "",
    receivingAccountId: null,
    operatorId: "",
    orderStatus: "unconverted",
    effectiveContact: false,
    proposalSent: false,
    loss: false,
    priority: false,
    itinerary: "",
    notConvertedReason: "",
    lossNote: "",
    remark: "",
    feedbackReason: "",
    solution: "",
    dealDate: null,
    departureDate: null,
    complaint: null,
    satisfied: null,
    receivingAccountName: "",
    operatorName: "",
  };
}

export function directLedgerFormFromItem(item: DirectLedgerItem): DirectLedgerFormState {
  return {
    receivedDate: item.receivedDate,
    source: item.source,
    receivingAccountId: item.receivingAccountId,
    operatorId: item.operatorId,
    orderStatus: item.orderStatus,
    effectiveContact: item.effectiveContact,
    proposalSent: item.proposalSent,
    loss: item.loss,
    priority: item.priority,
    itinerary: item.itinerary,
    notConvertedReason: item.notConvertedReason,
    lossNote: item.lossNote,
    remark: item.remark,
    feedbackReason: item.feedbackReason,
    solution: item.solution,
    dealDate: item.dealDate,
    departureDate: item.departureDate,
    complaint: item.complaint,
    satisfied: item.satisfied,
    receivingAccountName: item.receivingAccountName,
    operatorName: item.operatorName,
  };
}

/**
 * 生成完整表单请求体；只映射合同字段，可空日期与三态保持 null。
 *
 * @param form - 已通过表单校验的状态。
 * @param businessUnit - 记录所属业务；独立站接单账号固定提交 null。
 * @returns 直客台账写入请求体（PUT 另需合并 version）。
 */
export function directLedgerInput(
  form: DirectLedgerFormState,
  businessUnit: DirectLedgerBusinessUnit,
): DirectLedgerInput {
  return {
    receivedDate: form.receivedDate,
    source: form.source.trim(),
    receivingAccountId: businessUnit === "website" ? null : form.receivingAccountId,
    operatorId: form.operatorId,
    orderStatus: form.orderStatus,
    effectiveContact: form.effectiveContact,
    proposalSent: form.proposalSent,
    loss: form.loss,
    priority: form.priority,
    itinerary: form.itinerary,
    notConvertedReason: form.notConvertedReason,
    lossNote: form.lossNote,
    remark: form.remark,
    feedbackReason: form.feedbackReason,
    solution: form.solution,
    dealDate: form.dealDate || null,
    departureDate: form.departureDate || null,
    complaint: form.complaint,
    satisfied: form.satisfied,
  };
}

export function toTriState(value: boolean | null): TriStateValue {
  if (value === null) return "unset";
  return value ? "yes" : "no";
}

export function fromTriState(value: TriStateValue): boolean | null {
  if (value === "unset") return null;
  return value === "yes";
}
