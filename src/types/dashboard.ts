import type { TourBusinessUnit, TourFlightSnapshot, TourSourceModule } from "./tour";

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

export type TourMapBusinessUnit = TourBusinessUnit;

/** 省略 date 时服务端取 Asia/Shanghai 当天；省略 businessUnit 表示授权范围内全部业务。 */
export interface TourMapQuery {
  date?: string;
  businessUnit?: TourMapBusinessUnit;
}

export type TourMapIssue =
  | "manual_tour"
  | "source_missing"
  | "date_not_covered"
  | "city_unlinked"
  | "city_unmatched"
  | "outside_yunnan"
  | "coordinates_missing"
  | "no_location";

export type TourMapStopRole = "departure" | "visit" | "arrival" | "overnight";

/** 计划地点；issue 非 null 表示该点无法落图，路线须在此断开。 */
export interface TourMapStop {
  cityId: string | null;
  name: string;
  role: TourMapStopRole;
  longitude: number | null;
  latitude: number | null;
  issue: TourMapIssue | null;
}

/** planned 为住宿计划，none 为明确不住宿，unconfirmed 为待确认。 */
export type TourMapOvernightStatus = "planned" | "none" | "unconfirmed";

export interface TourMapDay {
  date: string;
  dayNumber: number;
  stops: TourMapStop[];
  overnightStatus: TourMapOvernightStatus;
  description: string;
  attractions: string[];
  meals: string[];
  transport: string[];
  hotelPlans: string[];
}

export interface TourMapTour {
  id: string;
  tourNo: string;
  businessUnit: TourMapBusinessUnit;
  sourceModule: TourSourceModule;
  totalPeople: number;
  adults: number;
  children: number;
  leaders: number;
  guideName: string | null;
  collectCoordinatorName: string;
  operatorName: string;
  /** YYYY-MM-DD HH:mm，北京时间墙钟 */
  pickupAt: string;
  dropAt: string;
  pickupFlight: TourFlightSnapshot | null;
  dropFlight: TourFlightSnapshot | null;
  days: number;
  dayNumber: number | null;
  /** 当天至少一个点可定位；部分地点缺失时仍保留 issues */
  located: boolean;
  issues: TourMapIssue[];
  today: TourMapDay | null;
  nextDay: TourMapDay | null;
  route: TourMapDay[];
}

/** 云南公共城市；团数、人数为城市内按团去重，不能相加作为全省总数。 */
export interface TourMapCity {
  id: string;
  name: string;
  province: string;
  longitude: number | null;
  latitude: number | null;
  status: string;
  tourIds: string[];
  tourCount: number;
  peopleCount: number;
}

export interface TourMapTotals {
  tours: number;
  people: number;
  located: number;
  unlocated: number;
}

export interface TourMapData {
  date: string;
  timezone: string;
  coordinateSystem: string;
  businessUnit: TourMapBusinessUnit | null;
  canSelectBusinessUnit: boolean;
  totals: TourMapTotals;
  cities: TourMapCity[];
  tours: TourMapTour[];
  unlocatedTourIds: string[];
  pickupTourIds: string[];
  dropTourIds: string[];
}
