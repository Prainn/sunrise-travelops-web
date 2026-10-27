import type { FlightMapAirport, FlightMapLeg } from "@/types/dashboard";

/** WGS84 [longitude, latitude] */
export type LonLat = [number, number];
/** 投影平面坐标，y 轴向下，与 ECharts geo 数据空间一致 */
export type ProjectedPoint = [number, number];
export type FlightKind = FlightMapLeg["kind"];

export const WORLD_MAP_NAME = "sunrise-world";

/** 可落图机场；code 与经纬度都存在才会生成。 */
export interface LocatedAirport {
  code: string;
  name: string | null;
  englishName: string | null;
  coord: LonLat;
}

/** 同日期、方向、航班号与两端时刻相同的航段聚合，保留全部关联团。 */
export interface FlightGroup {
  key: string;
  routeKey: string;
  kind: FlightKind;
  flightNumber: string | null;
  departureTime: string | null;
  arrivalTime: string | null;
  departureAirport: FlightMapAirport;
  arrivalAirport: FlightMapAirport;
  legs: FlightMapLeg[];
  /** 组内航段属于不同团（每团每方向一条），可直接相加 */
  people: number;
}

/** 按方向与出发→到达机场对合并绘制的路线。 */
export interface FlightRoute {
  key: string;
  kind: FlightKind;
  from: LocatedAirport;
  to: LocatedAirport;
  groupKeys: string[];
  legCount: number;
  /** 跨 ±180° 已切段，每段为连续经纬度折线 */
  segments: LonLat[][];
}

export interface FlightAirportNode extends LocatedAirport {
  routeKeys: string[];
  pickupLegs: number;
  dropLegs: number;
}

export interface FlightNetwork {
  groups: FlightGroup[];
  routes: FlightRoute[];
  airports: FlightAirportNode[];
}

export interface ProjectedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const DEG = Math.PI / 180;
/** 投影输出放大到百位量级，便于 ECharts 计算包围盒 */
const PROJECTION_SCALE = 100;
const ARC_SAMPLES = 72;
const MAX_LATITUDE = 85;
/** 聚焦时最多放大到此倍数，保留周边国家与海洋的全球语境 */
const MAX_FOCUS_ZOOM = 3.2;
/** 聚焦框最小占世界宽/高比例，避免单条国内航线被放得过大 */
const MIN_FOCUS_RATIO = 0.2;

/**
 * Natural Earth I 投影（Šavrič 等多项式），比等距圆柱更贴近全球视觉比例。
 *
 * @param point - WGS84 经纬度。
 * @returns 投影平面坐标，y 向下。
 */
export function projectNaturalEarth(point: number[]): ProjectedPoint {
  const lambda = (point[0] ?? 0) * DEG;
  const phi = (point[1] ?? 0) * DEG;
  const phi2 = phi * phi;
  const phi4 = phi2 * phi2;
  const x =
    lambda * (0.8707 - 0.131979 * phi2 + phi4 * (-0.013791 + phi4 * (0.003971 * phi2 - 0.001529 * phi4)));
  const y =
    phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4)));
  return [x * PROJECTION_SCALE, -y * PROJECTION_SCALE];
}

/**
 * Natural Earth I 反投影，牛顿迭代求纬度；ECharts 要求 project/unproject 成对提供。
 *
 * @param point - 投影平面坐标。
 * @returns WGS84 经纬度。
 */
export function unprojectNaturalEarth(point: number[]): LonLat {
  const x = (point[0] ?? 0) / PROJECTION_SCALE;
  const y = -(point[1] ?? 0) / PROJECTION_SCALE;
  let phi = y;
  for (let i = 0; i < 25; i++) {
    const phi2 = phi * phi;
    const phi4 = phi2 * phi2;
    const delta =
      (phi * (1.007226 + phi2 * (0.015085 + phi4 * (-0.044475 + 0.028874 * phi2 - 0.005916 * phi4))) - y) /
      (1.007226 + phi2 * (0.015085 * 3 + phi4 * (-0.044475 * 7 + 0.028874 * 9 * phi2 - 0.005916 * 11 * phi4)));
    phi -= delta;
    if (Math.abs(delta) < 1e-9) break;
  }
  const phi2 = phi * phi;
  const lambda =
    x / (0.8707 + phi2 * (-0.131979 + phi2 * (-0.013791 + phi2 * phi2 * phi2 * (0.003971 - 0.001529 * phi2))));
  return [lambda / DEG, phi / DEG];
}

export const NATURAL_EARTH_PROJECTION = {
  project: projectNaturalEarth,
  unproject: unprojectNaturalEarth,
};

/** 两端代码和经纬度齐全才返回；不猜测缺失坐标。 */
export function locateAirport(airport: FlightMapAirport): LocatedAirport | null {
  const { code, longitude, latitude } = airport;
  if (!code || longitude === null || latitude === null) return null;
  return { code, name: airport.name, englishName: airport.englishName, coord: [longitude, latitude] };
}

/** 机场展示名：英文界面优先英文名，缺失时回退另一语种名称，再回退代码。 */
export function airportName(airport: Pick<FlightMapAirport, "code" | "name" | "englishName">, locale: string) {
  const preferred = locale === "en" ? airport.englishName : airport.name;
  const fallback = locale === "en" ? airport.name : airport.englishName;
  return preferred || fallback || airport.code || "";
}

/**
 * 把已定位航段聚合为航班展示组、路线与机场节点。
 *
 * 仅处理 located=true 且两端可落图的航段；待定位航段由调用方单独列出，不丢条目。
 * 方向始终为 departureAirport → arrivalAirport，接/送团不反转。
 *
 * @param legs - 接口返回的航段，保持服务端排序。
 * @returns 展示组、合并路线及机场节点。
 */
export function buildFlightNetwork(legs: FlightMapLeg[]): FlightNetwork {
  const groups = new Map<string, FlightGroup>();
  const routes = new Map<string, FlightRoute>();
  const airports = new Map<string, FlightAirportNode>();

  function touchAirport(airport: LocatedAirport, routeKey: string, kind: FlightKind) {
    let node = airports.get(airport.code);
    if (!node) {
      node = { ...airport, routeKeys: [], pickupLegs: 0, dropLegs: 0 };
      airports.set(airport.code, node);
    }
    if (!node.routeKeys.includes(routeKey)) node.routeKeys.push(routeKey);
    if (kind === "pickup") node.pickupLegs++;
    else node.dropLegs++;
  }

  for (const leg of legs) {
    if (!leg.located) continue;
    const from = locateAirport(leg.departureAirport);
    const to = locateAirport(leg.arrivalAirport);
    if (!from || !to) continue;

    const routeKey = `${leg.kind}|${from.code}|${to.code}`;
    const groupKey = [
      routeKey,
      leg.scheduledAt.slice(0, 10),
      leg.flightNumber ?? "",
      leg.departureTime ?? "",
      leg.arrivalTime ?? "",
    ].join("|");

    let group = groups.get(groupKey);
    if (!group) {
      group = {
        key: groupKey,
        routeKey,
        kind: leg.kind,
        flightNumber: leg.flightNumber,
        departureTime: leg.departureTime,
        arrivalTime: leg.arrivalTime,
        departureAirport: leg.departureAirport,
        arrivalAirport: leg.arrivalAirport,
        legs: [],
        people: 0,
      };
      groups.set(groupKey, group);
    }
    group.legs.push(leg);
    group.people += leg.tour.totalPeople;

    let route = routes.get(routeKey);
    if (!route) {
      route = {
        key: routeKey,
        kind: leg.kind,
        from,
        to,
        groupKeys: [],
        legCount: 0,
        segments: buildArcSegments(from.coord, to.coord),
      };
      routes.set(routeKey, route);
    }
    if (!route.groupKeys.includes(groupKey)) route.groupKeys.push(groupKey);
    route.legCount++;

    touchAirport(from, routeKey, leg.kind);
    touchAirport(to, routeKey, leg.kind);
  }

  return { groups: [...groups.values()], routes: [...routes.values()], airports: [...airports.values()] };
}

/**
 * 大圆航线并向行进方向左侧轻微外弓，使往返两条路线分开；跨 ±180° 时在边界切段。
 *
 * @param from - 出发机场经纬度。
 * @param to - 到达机场经纬度。
 * @returns 经纬度折线段；同一机场返回空数组。
 */
export function buildArcSegments(from: LonLat, to: LonLat): LonLat[][] {
  const a = toVector(from);
  const b = toVector(to);
  const angle = Math.acos(Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2])));
  if (angle < 1e-6) return [];

  const unwrapped: LonLat[] = [];
  for (let i = 0; i <= ARC_SAMPLES; i++) {
    const t = i / ARC_SAMPLES;
    const wa = Math.sin((1 - t) * angle) / Math.sin(angle);
    const wb = Math.sin(t * angle) / Math.sin(angle);
    const point = toLonLat([wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]]);
    const previous = unwrapped.at(-1);
    if (previous) {
      while (point[0] - previous[0] > 180) point[0] -= 360;
      while (point[0] - previous[0] < -180) point[0] += 360;
    }
    unwrapped.push(point);
  }

  const start = unwrapped[0] ?? from;
  const end = unwrapped.at(-1) ?? to;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const chord = Math.hypot(dx, dy);
  // 长航线大圆本身已有弧度，外弓随距离减弱。
  const bow = chord * 0.14 * Math.min(1, Math.max(0.3, 1 - chord / 180));
  const bowed = unwrapped.map<LonLat>((point, index) => {
    const lift = Math.sin((Math.PI * index) / ARC_SAMPLES) * bow;
    const lat = point[1] + (dx / chord) * lift;
    return [point[0] - (dy / chord) * lift, Math.max(-MAX_LATITUDE, Math.min(MAX_LATITUDE, lat))];
  });
  return splitAtAntimeridian(bowed);
}

/**
 * 连续经度折线按 ±180° 切段，边界处插入交点，避免横穿整幅地图。
 *
 * @param points - 经度已展开（可超出 ±180）的折线。
 * @returns 经度归一到 [-180, 180] 的折线段。
 */
export function splitAtAntimeridian(points: LonLat[]): LonLat[][] {
  const segments: LonLat[][] = [];
  let current: LonLat[] = [];
  let previous: LonLat | null = null;
  let previousSheet = 0;
  for (const point of points) {
    const sheet = Math.floor((point[0] + 180) / 360);
    if (previous && sheet !== previousSheet) {
      const boundary = Math.max(sheet, previousSheet) * 360 - 180;
      const t = (boundary - previous[0]) / (point[0] - previous[0]);
      const lat = previous[1] + (point[1] - previous[1]) * t;
      current.push([boundary - previousSheet * 360, lat]);
      if (current.length > 1) segments.push(current);
      current = [[boundary - sheet * 360, lat]];
    }
    current.push([point[0] - sheet * 360, point[1]]);
    previous = point;
    previousSheet = sheet;
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/**
 * 依据航线范围计算 ECharts geo 的 center/zoom；无航线返回 null 表示全球视图。
 *
 * @param routes - 已合并路线。
 * @param world - 世界底图投影包围盒。
 * @returns 投影空间中心与缩放倍数。
 */
export function computeRouteFocus(
  routes: FlightRoute[],
  world: ProjectedRect,
): { center: ProjectedPoint; zoom: number } | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const route of routes) {
    for (const segment of route.segments) {
      for (const coord of segment) {
        const [x, y] = projectNaturalEarth(coord);
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (!Number.isFinite(minX)) return null;

  const width = Math.max(maxX - minX, world.width * MIN_FOCUS_RATIO);
  const height = Math.max(maxY - minY, world.height * MIN_FOCUS_RATIO);
  const zoom = Math.min(world.width / (width * 1.5), world.height / (height * 1.5));
  return {
    center: [(minX + maxX) / 2, (minY + maxY) / 2],
    zoom: Math.max(1, Math.min(MAX_FOCUS_ZOOM, zoom)),
  };
}

/** 世界 GeoJSON 投影后的包围盒，供聚焦计算。 */
export function projectedBounds(features: Array<{ geometry: { coordinates: unknown } }>): ProjectedRect {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  function visit(value: unknown) {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === "number") {
      const [x, y] = projectNaturalEarth(value as number[]);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      return;
    }
    for (const item of value) visit(item);
  }
  for (const feature of features) visit(feature.geometry.coordinates);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

/** 经纬网：经线每 30°、纬线每 30°，经线按 5° 采样以呈现投影弧度。 */
export function buildGraticule(): LonLat[][] {
  const lines: LonLat[][] = [];
  for (let lon = -180; lon <= 180; lon += 30) {
    const line: LonLat[] = [];
    for (let lat = -MAX_LATITUDE; lat <= MAX_LATITUDE; lat += 5) line.push([lon, lat]);
    lines.push(line);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const line: LonLat[] = [];
    for (let lon = -180; lon <= 180; lon += 5) line.push([lon, lat]);
    lines.push(line);
  }
  return lines;
}

function toVector([lon, lat]: LonLat): [number, number, number] {
  const lambda = lon * DEG;
  const phi = lat * DEG;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
}

function toLonLat([x, y, z]: [number, number, number]): LonLat {
  return [Math.atan2(y, x) / DEG, Math.atan2(z, Math.hypot(x, y)) / DEG];
}
