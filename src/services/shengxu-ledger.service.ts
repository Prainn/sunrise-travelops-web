import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  ShengxuAgencyOption,
  ShengxuContactOption,
  ShengxuLedgerInput,
  ShengxuLedgerItem,
  ShengxuLedgerOptionQuery,
  ShengxuLedgerQueryParams,
  ShengxuLedgerUpdateInput,
} from "@/types/shengxu-ledger";

const BASE_URL = "/ledgers/shengxu";

export const shengxuLedgerService = {
  list(query: ShengxuLedgerQueryParams) {
    return request.get<PageResult<ShengxuLedgerItem>>(BASE_URL, { params: { ...query } });
  },
  detail(id: string) {
    return request.get<ShengxuLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}`);
  },
  agencies(query: ShengxuLedgerOptionQuery) {
    return request.get<PageResult<ShengxuAgencyOption>>(`${BASE_URL}/agencies`, {
      params: { ...query },
    });
  },
  contacts(agencyId: string, query: ShengxuLedgerOptionQuery) {
    return request.get<PageResult<ShengxuContactOption>>(
      `${BASE_URL}/agencies/${encodeURIComponent(agencyId)}/contacts`,
      { params: { ...query } },
    );
  },
  create(body: ShengxuLedgerInput) {
    return request.post<ShengxuLedgerItem>(BASE_URL, body);
  },
  update(id: string, body: ShengxuLedgerUpdateInput) {
    return request.put<ShengxuLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}`, body);
  },
  async delete(id: string, version: number) {
    await request.delete<void>(`${BASE_URL}/${encodeURIComponent(id)}`, { params: { version } });
  },
};
