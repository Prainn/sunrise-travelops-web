import { ref } from "vue";
import { DEFAULT_PAGE_SIZE } from "@/components/Pagination/config";

export function useResourcePagination() {
  const pageNum = ref(1);
  const pageSize = ref(DEFAULT_PAGE_SIZE);
  function paginationQuery() {
    return { page: pageNum.value, pageSize: pageSize.value };
  }
  return { pageNum, pageSize, paginationQuery };
}
