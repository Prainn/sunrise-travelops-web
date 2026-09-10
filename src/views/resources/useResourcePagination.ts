import { ref } from "vue";

export const RESOURCE_PAGE_SIZE = 20;

export function useResourcePagination() {
  const pageNum = ref(1);
  const pageSize = ref(RESOURCE_PAGE_SIZE);
  function paginationQuery() {
    return { page: pageNum.value, pageSize: pageSize.value };
  }
  return { pageNum, pageSize, paginationQuery };
}
