import type {
  DirectLedgerBusinessUnit,
  DirectLedgerItem,
  DirectLedgerOrderStatus,
  DirectLedgerTourInput,
} from "@/types/direct-ledger";
import type { LedgerTourDraft, LedgerTourMode } from "@/views/tours/tour-form";

type LedgerTourState = Pick<DirectLedgerItem, "orderStatus" | "tours">;

/** 有效团最多一个；已有则只能查看，否则按服务端能力决定建团入口。 */
export function directLedgerTourMode(
  ledger: LedgerTourState,
  canConvert: boolean,
): LedgerTourMode | null {
  if (!canConvert || ledger.tours.some((tour) => tour.status === "active")) return null;
  if (ledger.orderStatus === "unconverted") return "convert";
  return ledger.tours.length ? "rebuild" : "backfill";
}

/** 独立站来源是客户姓名；纯数字可能是携程单号，霖熹来源也不当作客人姓名。 */
export function ledgerTourContactName(businessUnit: DirectLedgerBusinessUnit, source: string) {
  const value = source.trim();
  return businessUnit === "website" && !/^\d+$/.test(value) ? value : "";
}

export interface LedgerTourDraftSource {
  businessUnit: DirectLedgerBusinessUnit;
  creatorId: string;
  creatorName: string;
  operatorId: string;
  operatorName: string;
  countryItemId: string | null;
  countryName?: string | null;
  departureDate: string | null;
  itinerary: string;
  source: string;
}

export function ledgerTourDraft(
  ledger: LedgerTourDraftSource,
  mode: LedgerTourMode,
  submit: (input: DirectLedgerTourInput) => Promise<unknown>,
): LedgerTourDraft {
  return {
    mode,
    businessUnit: ledger.businessUnit,
    collectCoordinatorId: ledger.creatorId,
    collectCoordinatorName: ledger.creatorName,
    operatorId: ledger.operatorId,
    operatorName: ledger.operatorName,
    countryItemId: ledger.countryItemId ?? "",
    countryName: ledger.countryName ?? "",
    startDate: ledger.departureDate ?? "",
    itinerarySummary: ledger.itinerary.trim(),
    contactName: ledgerTourContactName(ledger.businessUnit, ledger.source),
    submit,
  };
}

/** 新增表单选择已成团时，须先补齐建团资料再原子保存。 */
export function needsTourOnCreate(isNew: boolean, orderStatus: DirectLedgerOrderStatus) {
  return isNew && orderStatus === "converted";
}
