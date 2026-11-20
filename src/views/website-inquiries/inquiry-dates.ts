import type { WebsiteInquiryInput } from "@/types/website";
import { sortServiceDates } from "@/utils/service-dates";

type InquiryDates = Pick<WebsiteInquiryInput, "startDate" | "plannedDays" | "serviceDates">;

/** 勾选自选服务日：已有开始日期作为首个选中日；开始日期与天数保留，切回或换业务时仍可沿用。 */
export function selectServiceDates(form: InquiryDates) {
  form.serviceDates = form.startDate ? [form.startDate] : [];
}

/** 日历多选结果去重升序；清空得到空清单而非 null，仍处于自选模式。 */
export function setServiceDates(form: InquiryDates, dates: readonly string[] | null | undefined) {
  form.serviceDates = sortServiceDates(dates ?? []);
}

/** 切回连续模式：以最早已选日及已选天数作为待保存的起止范围，计调可继续修改。 */
export function switchToConsecutiveDates(form: InquiryDates) {
  const dates = form.serviceDates ?? [];
  if (dates.length) {
    form.startDate = dates[0]!;
    form.plannedDays = dates.length;
  }
  form.serviceDates = null;
}

/**
 * 提交的日期字段：自选模式提交完整清单并回写首日与天数；
 * 独立站连续模式显式传 null（主动切回时必需），其他业务不提交该字段。
 */
export function inquiryDatesInput(form: InquiryDates, website: boolean): InquiryDates {
  if (!website) return { startDate: form.startDate, plannedDays: form.plannedDays, serviceDates: undefined };
  const dates = form.serviceDates;
  if (!dates) return { startDate: form.startDate, plannedDays: form.plannedDays, serviceDates: null };
  return { startDate: dates[0] ?? null, plannedDays: dates.length, serviceDates: [...dates] };
}
