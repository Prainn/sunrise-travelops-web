import { request } from "@/api/request";
import type {
  AccountLink,
  AccountLinkCandidateQuery,
  AccountLinkDeleteInput,
  AccountLinkQueryParams,
  AccountLinkSaveInput,
  LinkedAccount,
} from "@/types/account-link";
import type { PageResult } from "@/types/common";

const BASE_URL = "/system/account-links";

export const accountLinkService = {
  getPage(query: AccountLinkQueryParams) {
    return request.get<PageResult<AccountLink>>(BASE_URL, {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword?.trim() || undefined,
      },
    });
  },
  getCandidates(query: AccountLinkCandidateQuery) {
    return request.get<PageResult<LinkedAccount>>(`${BASE_URL}/candidates`, {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword?.trim() || undefined,
        groupId: query.groupId,
        scope: query.scope,
      },
    });
  },
  detail(id: string) {
    return request.get<AccountLink>(`${BASE_URL}/${encodeURIComponent(id)}`);
  },
  create(body: AccountLinkSaveInput) {
    return request.post<AccountLink>(BASE_URL, body);
  },
  update(id: string, body: AccountLinkSaveInput) {
    return request.put<AccountLink>(`${BASE_URL}/${encodeURIComponent(id)}`, body);
  },
  remove(id: string, body: AccountLinkDeleteInput) {
    return request.delete<void>(`${BASE_URL}/${encodeURIComponent(id)}`, { body });
  },
};
