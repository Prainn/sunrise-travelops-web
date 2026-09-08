import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope } from "vue";
import { useRemoteOptions } from "./useRemoteOptions";
const scopes: ReturnType<typeof effectScope>[] = [];
function setup(fetcher = vi.fn()) {
  const scope = effectScope(); scopes.push(scope);
  const error = vi.fn();
  const remote = scope.run(() => useRemoteOptions<{ id: string }>(fetcher, error))!;
  return { remote, fetcher, error, scope };
}
afterEach(() => scopes.splice(0).forEach(scope => scope.stop()));
describe("remote select options", () => {
  it("loads on demand, appends pages and stops at the total", async () => {
    const { remote, fetcher } = setup();
    fetcher.mockResolvedValueOnce({ list: [{ id: 'a' }], total: 2 }).mockResolvedValueOnce({ list: [{ id: 'b' }], total: 2 });
    expect(fetcher).not.toHaveBeenCalled();
    await remote.search(' 门票 ');
    await remote.loadMore(); await remote.loadMore();
    expect(fetcher.mock.calls).toEqual([[{ keyword: '门票', page: 1, pageSize: 20 }], [{ keyword: '门票', page: 2, pageSize: 20 }]]);
    expect(remote.items.value).toEqual([{ id: 'a' }, { id: 'b' }]);
    expect(remote.hasMore.value).toBe(false);
  });
  it("prevents duplicate requests and ignores an earlier search response", async () => {
    const { remote, fetcher } = setup();
    let resolve!: (value: unknown) => void;
    fetcher.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const oldRequest = remote.search('old');
    await remote.search('old'); await remote.loadMore();
    expect(fetcher).toHaveBeenCalledTimes(1);
    fetcher.mockResolvedValue({ list: [{ id: 'new' }], total: 1 });
    await remote.search('new');
    resolve({ list: [{ id: 'old' }], total: 100 }); await oldRequest;
    expect(remote.items.value).toEqual([{ id: 'new' }]);
  });
  it("resets paging and ignores requests after the popup closes", async () => {
    const { remote, fetcher } = setup();
    fetcher.mockResolvedValueOnce({ list: [{ id: 'a' }], total: 3 });
    await remote.search('');
    let resolve!: (value: unknown) => void;
    fetcher.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    const append = remote.loadMore(); remote.reset();
    resolve({ list: [{ id: 'b' }], total: 3 }); await append;
    expect(remote.items.value).toEqual([]);
    fetcher.mockResolvedValue({ list: [{ id: 'c' }], total: 1 });
    await remote.search('');
    expect(fetcher).toHaveBeenLastCalledWith({ keyword: '', page: 1, pageSize: 20 });
  });
  it("keeps loaded options on append failure and does not retry in a loop", async () => {
    const { remote, fetcher, error } = setup();
    fetcher.mockResolvedValueOnce({ list: [{ id: 'a' }], total: 2 }).mockRejectedValueOnce(new Error('offline'));
    await remote.search(''); await remote.loadMore(); await remote.loadMore();
    expect(remote.items.value).toEqual([{ id: 'a' }]);
    expect(error).toHaveBeenCalledOnce(); expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
