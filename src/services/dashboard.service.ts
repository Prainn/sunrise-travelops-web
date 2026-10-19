import { request } from "@/api/request";
import type { DashboardSummary, DashboardTrend, DashboardTrendDays } from "@/types/dashboard";

export const dashboardService = {
  getSummary() {
    return request.get<DashboardSummary>("/dashboard/summary");
  },

  getTrend(days: DashboardTrendDays) {
    return request.get<DashboardTrend>("/dashboard/trend", { params: { days } });
  },
};
