export interface DashboardInquiryCounts {
  new: number;
  planning: number;
  quoted: number;
}

export interface DashboardTourCounts {
  active: number;
  departingThisWeek: number;
}

/** null 表示当前身份无权读取该项，0 表示有权但无记录。 */
export interface DashboardSummary {
  inquiries: DashboardInquiryCounts | null;
  websiteInquiries: DashboardInquiryCounts | null;
  tours: DashboardTourCounts | null;
  guideLeavesToday: number | null;
}

export type DashboardTrendDays = 7 | 30;

/** dates 为 Asia/Shanghai 的 YYYY-MM-DD；非 null 序列与 dates 等长。 */
export interface DashboardTrend {
  dates: string[];
  newInquiries: number[] | null;
  departingTours: number[] | null;
}
