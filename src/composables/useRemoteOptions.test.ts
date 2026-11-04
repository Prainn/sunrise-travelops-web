import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useRemoteOptions, type RemoteOptionsPage } from "./useRemoteOptions";

const scopes: ReturnType<typeof effectScope>[] = [];
afterEach(() => scopes.splice(0).forEach((scope) => scope.stop()));

function setup() {
  const scope = effectScope();
  scopes.push(scope);
  const fetchOptions = vi.fn<() => Promise<RemoteOptionsPage<{ id: string }>>>();
  const onError = vi.fn();
  const options = scope.run(() => useRemoteOptions(fetchOptions, onError))!;
  return { fetchOptions, onError, options };
}

describe("remote option failures", () => {
  it("passes the original rejection to the UI and allows retrying the search", async () => {
    const { fetchOptions, onError, options } = setup();
    const error = new Error("请选择本业务启用的计调");
    fetchOptions.mockRejectedValueOnce(error).mockResolvedValueOnce({ list: [{ id: "1" }], total: 1 });
    await options.search("计调");
    expect(onError).toHaveBeenCalledExactlyOnceWith(error);
    expect(options.loading.value).toBe(false);
    await options.search("计调");
    expect(options.items.value).toEqual([{ id: "1" }]);
  });

  it("does not show an error from an obsolete search", async () => {
    const { fetchOptions, onError, options } = setup();
    let reject!: (reason: Error) => void;
    fetchOptions.mockReturnValueOnce(new Promise((_, fail) => { reject = fail; }));
    const pending = options.search("old");
    fetchOptions.mockResolvedValueOnce({ list: [{ id: "new" }], total: 1 });
    await options.search("new");
    reject(new Error("旧请求失败"));
    await pending;
    expect(onError).not.toHaveBeenCalled();
    expect(options.items.value).toEqual([{ id: "new" }]);
  });
});
