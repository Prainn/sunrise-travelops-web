import { describe, expect, it } from "vitest";
import { effectScope } from "vue";
import type { TourMapData, TourMapQuery } from "@/types/dashboard";
import { useTourMapData } from "./useTourMapData";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const mapData = (date: string) => ({ date }) as unknown as TourMapData;

function setup() {
  const pending: Array<ReturnType<typeof deferred<TourMapData>>> = [];
  const queries: TourMapQuery[] = [];
  const scope = effectScope();
  const state = scope.run(() =>
    useTourMapData({
      fetchMap: (query) => {
        queries.push(query);
        const next = deferred<TourMapData>();
        pending.push(next);
        return next.promise;
      },
    }),
  )!;
  const request = (index: number) => {
    const item = pending[index];
    if (!item) throw new Error(`request ${index} not sent`);
    return item;
  };
  return { scope, state, request, queries };
}

describe("useTourMapData", () => {
  it("较早请求晚返回时不覆盖最新结果", async () => {
    const { state, request } = setup();
    const first = state.load({ date: "2026-10-25" });
    const second = state.load({ date: "2026-10-26", businessUnit: "linxi" });

    request(1).resolve(mapData("2026-10-26"));
    await second;
    request(0).resolve(mapData("2026-10-25"));
    await first;

    expect(state.data.value).toEqual(mapData("2026-10-26"));
    expect(state.isLoading.value).toBe(false);
  });

  it("旧请求失败不影响新请求的状态", async () => {
    const { state, request } = setup();
    const first = state.load({ date: "2026-10-25" });
    const second = state.load({ date: "2026-10-26" });

    request(0).reject(new Error("old failure"));
    await first;
    expect(state.loadError.value).toBe("");
    expect(state.isLoading.value).toBe(true);

    request(1).resolve(mapData("2026-10-26"));
    await second;
    expect(state.loadError.value).toBe("");
  });

  it("切换筛选加载中保留旧数据，失败时清空不伪造结果", async () => {
    const { state, request } = setup();
    const first = state.load({ date: "2026-10-25" });
    request(0).resolve(mapData("2026-10-25"));
    await first;

    const second = state.load({ date: "2026-10-26" });
    expect(state.data.value).toEqual(mapData("2026-10-25"));
    expect(state.isLoading.value).toBe(true);
    request(1).reject(new Error("network"));
    await second;
    expect(state.data.value).toBeUndefined();
    expect(state.loadError.value).toBe("network");
  });

  it("作用域销毁后返回的结果被丢弃", async () => {
    const { scope, state, request } = setup();
    const loading = state.load({ date: "2026-10-26" });
    scope.stop();
    request(0).resolve(mapData("2026-10-26"));
    await loading;
    expect(state.data.value).toBeUndefined();
  });
});
