import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  DirectLedgerCreateInput,
  DirectLedgerItem,
  DirectLedgerOperationInput,
  DirectLedgerOperatorOption,
  DirectLedgerOperatorQuery,
  DirectLedgerQueryParams,
  DirectLedgerUpdateInput,
} from "@/types/direct-ledger";

const BASE_URL = "/ledgers/direct";

export const directLedgerService = {
  list(query: DirectLedgerQueryParams) {
    return request.get<PageResult<DirectLedgerItem>>(BASE_URL, { params: { ...query } });
  },
  filterOptions(query: DirectLedgerOperatorQuery & { kind: "creator" | "operator" }) {
    return request.get<PageResult<{ id: string; name: string }>>(`${BASE_URL}/filter-options`, {
      params: { ...query },
    });
  },
  detail(id: string) {
    return request.get<DirectLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}`);
  },
  /** 操作计调选项：本业务启用且分工 operation/both。 */
  operators(query: DirectLedgerOperatorQuery) {
    return request.get<PageResult<DirectLedgerOperatorOption>>(`${BASE_URL}/operators`, {
      params: { ...query },
    });
  },
  /** 收客计调选项：本业务启用且分工 reception/both。 */
  collectors(query: DirectLedgerOperatorQuery) {
    return request.get<PageResult<DirectLedgerOperatorOption>>(`${BASE_URL}/collectors`, {
      params: { ...query },
    });
  },
  /** 霖熹启用接单业务组；独立站不调用。 */
  receivingGroups(query: DirectLedgerOperatorQuery) {
    return request.get<PageResult<DirectLedgerOperatorOption>>(`${BASE_URL}/receiving-groups`, {
      params: { ...query },
    });
  },
  create(body: DirectLedgerCreateInput) {
    return request.post<DirectLedgerItem>(BASE_URL, body);
  },
  update(id: string, body: DirectLedgerUpdateInput) {
    return request.put<DirectLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}`, body);
  },
  review(id: string, version: number) {
    return request.post<DirectLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}/review`, {
      version,
    });
  },
  updateOperation(id: string, body: DirectLedgerOperationInput) {
    return request.put<DirectLedgerItem>(`${BASE_URL}/${encodeURIComponent(id)}/operation`, body);
  },
  async delete(id: string, version: number) {
    await request.delete<void>(`${BASE_URL}/${encodeURIComponent(id)}`, { params: { version } });
  },
};
