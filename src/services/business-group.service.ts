import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  BusinessGroup,
  BusinessGroupCreateInput,
  BusinessGroupItem,
  BusinessGroupQueryParams,
  BusinessGroupUpdateInput,
} from "@/types/business-group";

const BASE_URL = "/system/business-groups";

export const businessGroupService = {
  getPage(query: BusinessGroupQueryParams) {
    return request.get<PageResult<BusinessGroupItem>>(BASE_URL, {
      params: {
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword?.trim() || undefined,
        status: query.status || undefined,
      },
    });
  },
  detail(id: string) {
    return request.get<BusinessGroup>(`${BASE_URL}/${encodeURIComponent(id)}`);
  },
  create(body: BusinessGroupCreateInput) {
    return request.post<BusinessGroup>(BASE_URL, body);
  },
  update(id: string, body: BusinessGroupUpdateInput) {
    return request.put<BusinessGroup>(`${BASE_URL}/${encodeURIComponent(id)}`, body);
  },
};
