import { describe, expect, it } from "vitest";
import { graphic } from "echarts";
import yunnanSvg from "@/assets/maps/yunnan/yunnan-regions.svg?raw";
import productionCities from "./fixtures/production-cities.json";
import type { TourMapDay, TourMapStop } from "@/types/dashboard";
import {
  buildRouteSegments,
  issueLabelKey,
  resolveDisplayPoint,
  shanghaiToday,
  YUNNAN_DISPLAY_POINTS,
  type SvgCoord,
  type YunnanDisplayPoint,
} from "./tour-map";

const POINTS: YunnanDisplayPoint[] = [
  {
    name: "昆明",
    devResourceCityId: "dev-km",
    longitude: 102.7169,
    latitude: 25.0399,
    regionAdcode: "530100",
    svg: [621, 541],
  },
  {
    name: "大理",
    devResourceCityId: "dev-dl",
    longitude: 100.2469,
    latitude: 25.597,
    regionAdcode: "532900",
    svg: [342, 480],
  },
];

function stop(cityId: string | null, overrides: Partial<TourMapStop> = {}): TourMapStop {
  return {
    cityId,
    name: cityId ?? "",
    role: "visit",
    longitude: null,
    latitude: null,
    issue: null,
    ...overrides,
  };
}

function day(dayNumber: number, stops: TourMapStop[]): TourMapDay {
  return {
    date: `2026-10-${String(20 + dayNumber).padStart(2, "0")}`,
    dayNumber,
    stops,
    overnightStatus: "planned",
    description: "",
    attractions: [],
    meals: [],
    transport: [],
    hotelPlans: [],
  } as TourMapDay;
}

const COORDS: Record<string, SvgCoord> = { a: [1, 1], b: [2, 2], c: [3, 3] };
const locate = (cityId: string) => COORDS[cityId] ?? null;
const ids = (segments: ReturnType<typeof buildRouteSegments>) =>
  segments.map((segment) => segment.map((point) => point.cityId));

describe("resolveDisplayPoint", () => {
  it("生产快照45个云南目的地均可跨环境落图，省外不扩入", () => {
    const yunnanCities = productionCities.filter((city) => city.province === "云南");
    expect(yunnanCities).toHaveLength(45);
    for (const city of yunnanCities) {
      expect(resolveDisplayPoint({ ...city, id: `different-environment-${city.name}` })?.name)
        .toBe(city.name);
      expect(resolveDisplayPoint({
        ...city,
        id: `different-environment-${city.name}`,
        longitude: city.longitude + 0.001,
      })).toBeNull();
    }
    for (const name of ["盐源", "香格里拉镇", "成都", "康定", "雅江", "理塘", "雅安"]) {
      expect(YUNNAN_DISPLAY_POINTS.some((point) => point.name === name)).toBe(false);
    }
  });

  it("全部静态点位落在其声明的原SVG州市区域内", () => {
    const paths = new Map([...yunnanSvg.matchAll(/<path[^>]+name="(\d+)"[^>]+d="([^"]+)"/g)]
      .map((match) => [match[1], match[2]]));
    expect(paths.size).toBe(16);
    expect(YUNNAN_DISPLAY_POINTS).toHaveLength(49);
    for (const point of YUNNAN_DISPLAY_POINTS) {
      const path = paths.get(point.regionAdcode);
      expect(path, point.name).toBeDefined();
      const Region = graphic.extendPath(path!, { style: { fill: "#000", stroke: "none" } });
      expect(new Region().contain(...point.svg), point.name).toBe(true);
    }
  });

  it("优先按开发库 ID 匹配，即使名称不同", () => {
    const city = { id: "dev-dl", name: "大理市", longitude: 100.2469, latitude: 25.597 };
    expect(resolveDisplayPoint(city, POINTS)?.name).toBe("大理");
  });

  it("其他环境按精确中文名匹配", () => {
    const city = { id: "prod-km", name: "昆明", longitude: 102.7169, latitude: 25.0399 };
    expect(resolveDisplayPoint(city, POINTS)?.regionAdcode).toBe("530100");
  });

  it("经纬度与点位文件不一致视为待校准", () => {
    const city = { id: "prod-km", name: "昆明", longitude: 102.72, latitude: 25.0399 };
    expect(resolveDisplayPoint(city, POINTS)).toBeNull();
  });

  it("经纬度为空或为 0 均不落图", () => {
    expect(
      resolveDisplayPoint({ id: "dev-km", name: "昆明", longitude: null, latitude: 25.0399 }, POINTS),
    ).toBeNull();
    expect(
      resolveDisplayPoint({ id: "dev-km", name: "昆明", longitude: 0, latitude: 0 }, POINTS),
    ).toBeNull();
  });

  it("名称不精确匹配时不模糊猜测", () => {
    const city = { id: "x", name: "昆明市", longitude: 102.7169, latitude: 25.0399 };
    expect(resolveDisplayPoint(city, POINTS)).toBeNull();
  });
});

describe("buildRouteSegments", () => {
  it("保持服务端顺序，只合并相邻重复城市", () => {
    const segments = buildRouteSegments(
      [day(1, [stop("a"), stop("b")]), day(2, [stop("b"), stop("a")])],
      locate,
    );
    expect(ids(segments)).toEqual([["a", "b", "a"]]);
  });

  it("问题点、无城市和待校准点断开路线", () => {
    const segments = buildRouteSegments(
      [
        day(1, [
          stop("a"),
          stop("b", { issue: "outside_yunnan" }),
          stop("c"),
          stop(null),
          stop("a"),
          stop("unknown"),
          stop("b"),
        ]),
      ],
      locate,
    );
    expect(ids(segments)).toEqual([["a"], ["c"], ["a"], ["b"]]);
  });

  it("日期不相邻或中间空白日都会断开", () => {
    expect(ids(buildRouteSegments([day(1, [stop("a")]), day(3, [stop("b")])], locate))).toEqual([
      ["a"],
      ["b"],
    ]);
    expect(
      ids(buildRouteSegments([day(1, [stop("a")]), day(2, []), day(3, [stop("b")])], locate)),
    ).toEqual([["a"], ["b"]]);
  });

  it("断开后再次出现同一城市不跨段合并", () => {
    const segments = buildRouteSegments([day(1, [stop("a"), stop(null), stop("a")])], locate);
    expect(ids(segments)).toEqual([["a"], ["a"]]);
  });
});

describe("helpers", () => {
  it("按 Asia/Shanghai 计算当天", () => {
    expect(shanghaiToday(new Date("2026-10-25T16:30:00Z"))).toBe("2026-10-26");
    expect(shanghaiToday(new Date("2026-10-25T15:59:00Z"))).toBe("2026-10-25");
  });

  it("未知问题码使用通用提示", () => {
    expect(issueLabelKey("outside_yunnan")).toBe("dashboard.tourMap.issues.outside_yunnan");
    expect(issueLabelKey("new_code")).toBe("dashboard.tourMap.issues.unknown");
  });
});
