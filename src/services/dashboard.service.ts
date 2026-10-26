import { request } from "@/api/request";
import type {
  DashboardSummary,
  DashboardTrend,
  DashboardTrendDays,
  TourMapData,
  TourMapQuery,
} from "@/types/dashboard";

export const dashboardService = {
  getSummary() {
    return request.get<DashboardSummary>("/dashboard/summary");
  },

  getTrend(days: DashboardTrendDays) {
    return request.get<DashboardTrend>("/dashboard/trend", { params: { days } });
  },

  getTourMap(query: TourMapQuery) {
    const { date, businessUnit } = query;
    return request.get<TourMapData>("/dashboard/tour-map", { params: { date, businessUnit } });
  },
};
