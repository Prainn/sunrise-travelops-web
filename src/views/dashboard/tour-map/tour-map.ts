import displayPointsData from "@/assets/maps/yunnan/display-points.json";
import regionsData from "@/assets/maps/yunnan/regions.json";
import type { TourMapCity, TourMapDay, TourMapIssue, TourMapStop } from "@/types/dashboard";

/** SVG 平面坐标（viewBox 0 0 1050 1100），不是经纬度。 */
export type SvgCoord = [number, number];

export interface YunnanDisplayPoint {
  name: string;
  /** 仅开发库资源 ID，其他环境按精确中文名匹配 */
  devResourceCityId: string;
  longitude: number;
  latitude: number;
  regionAdcode: string;
  svg: SvgCoord;
}

export interface RoutePoint {
  cityId: string;
  name: string;
  coord: SvgCoord;
  date: string;
  dayNumber: number;
}

/** 已校准、可在底图绘制的城市点。 */
export interface TourMapPoint {
  cityId: string;
  name: string;
  coord: SvgCoord;
  tourCount: number;
  peopleCount: number;
}

export const YUNNAN_MAP_NAME = displayPointsData.mapId;

export const YUNNAN_DISPLAY_POINTS: YunnanDisplayPoint[] = displayPointsData.points.map(
  (point) => ({
    name: point.name,
    devResourceCityId: point.devResourceCityId,
    longitude: point.longitude,
    latitude: point.latitude,
    regionAdcode: point.regionAdcode,
    svg: toSvgCoord(point.name, point.svg),
  }),
);

/** 行政区域代码 → 州市中文名；州市与业务目的地城市不是同一层级。 */
export const YUNNAN_REGION_NAMES = new Map(
  regionsData.regions.map((region) => [region.adcode, region.name]),
);

function toSvgCoord(name: string, svg: number[]): SvgCoord {
  const [x, y] = svg;
  if (x === undefined || y === undefined) throw new Error(`Invalid SVG point for ${name}`);
  return [x, y];
}

/** 只容忍浮点表示误差，坐标被修改过的城市必须重新校准。 */
const COORDINATE_TOLERANCE = 1e-6;

const KNOWN_ISSUES: readonly TourMapIssue[] = [
  "manual_tour",
  "source_missing",
  "date_not_covered",
  "city_unlinked",
  "city_unmatched",
  "outside_yunnan",
  "coordinates_missing",
  "no_location",
];

const SHANGHAI_DATE = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Asia/Shanghai 当天的 YYYY-MM-DD，不受浏览器时区影响。 */
export function shanghaiToday(now = new Date()): string {
  return SHANGHAI_DATE.format(now);
}

/**
 * 查找城市在底图上的已校准展示点。
 *
 * 先按开发库 ID，再按精确中文名匹配；接口经纬度与点位文件不一致或为空时视为待校准。
 *
 * @param city - 接口返回的云南公共城市。
 * @param points - 与当前 SVG 配套的展示点。
 * @returns 已校准的展示点；待校准返回 null。
 */
export function resolveDisplayPoint(
  city: Pick<TourMapCity, "id" | "name" | "longitude" | "latitude">,
  points: YunnanDisplayPoint[] = YUNNAN_DISPLAY_POINTS,
): YunnanDisplayPoint | null {
  const point =
    points.find((item) => item.devResourceCityId === city.id) ??
    points.find((item) => item.name === city.name);
  if (!point || city.longitude === null || city.latitude === null) return null;
  const isSameLongitude = Math.abs(point.longitude - city.longitude) <= COORDINATE_TOLERANCE;
  const isSameLatitude = Math.abs(point.latitude - city.latitude) <= COORDINATE_TOLERANCE;
  return isSameLongitude && isSameLatitude ? point : null;
}

/**
 * 按服务端顺序把计划地点切成可连线的路线段。
 *
 * 问题点、待校准点、空白日和不相邻的日期都会断开路线；只合并相邻的重复城市，不全局去重。
 *
 * @param days - 当日或完整路线，保持接口顺序。
 * @param locate - 返回已校准城市的 SVG 坐标，无法落图返回 null。
 * @returns 路线段；单点段只画点不画线。
 */
export function buildRouteSegments(
  days: TourMapDay[],
  locate: (cityId: string) => SvgCoord | null,
): RoutePoint[][] {
  const segments: RoutePoint[][] = [];
  let current: RoutePoint[] = [];
  let previousDayNumber: number | null = null;

  function closeSegment() {
    if (current.length) segments.push(current);
    current = [];
  }

  for (const day of days) {
    const isAdjacentDay = previousDayNumber !== null && day.dayNumber === previousDayNumber + 1;
    if (!isAdjacentDay || !day.stops.length) closeSegment();
    previousDayNumber = day.dayNumber;

    for (const stop of day.stops) {
      const coord = locateStop(stop, locate);
      if (!coord || !stop.cityId) {
        closeSegment();
        continue;
      }
      if (current.at(-1)?.cityId === stop.cityId) continue;
      current.push({
        cityId: stop.cityId,
        name: stop.name,
        coord,
        date: day.date,
        dayNumber: day.dayNumber,
      });
    }
  }
  closeSegment();
  return segments;
}

function locateStop(stop: TourMapStop, locate: (cityId: string) => SvgCoord | null) {
  if (stop.issue !== null || !stop.cityId) return null;
  return locate(stop.cityId);
}

/** 问题码对应的 i18n 键；未知问题码保留通用提示，不静默隐藏。 */
export function issueLabelKey(issue: string): string {
  return KNOWN_ISSUES.includes(issue as TourMapIssue)
    ? `dashboard.tourMap.issues.${issue}`
    : "dashboard.tourMap.issues.unknown";
}
