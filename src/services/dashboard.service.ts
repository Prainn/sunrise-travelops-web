import { visitOverview, visitTrend } from "@/data/data";
import type { VisitOverviewDetail, VisitTrendDetail } from "@/types/dashboard";

export const dashboardService = {
  async getVisitOverview(): Promise<VisitOverviewDetail> {
    return { ...visitOverview };
  },

  async getVisitTrend(): Promise<VisitTrendDetail> {
    return {
      dates: [...visitTrend.dates],
      pvList: [...visitTrend.pvList],
      uvList: [...visitTrend.uvList],
    };
  },
};
