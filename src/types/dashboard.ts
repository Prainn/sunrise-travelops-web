export interface VisitTrendDetail {
  dates: string[];
  pvList: number[];
  uvList: number[];
}

export interface VisitOverviewDetail {
  todayUvCount: number;
  totalUvCount: number;
  uvGrowthRate: number;
  todayPvCount: number;
  totalPvCount: number;
  pvGrowthRate: number;
}
