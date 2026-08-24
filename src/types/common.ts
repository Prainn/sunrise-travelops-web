export interface BaseQueryParams {
  pageNum: number;
  pageSize: number;
  sortBy?: string;
  order?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
}

export interface OptionItem {
  value: string | number;
  label: string;
  children?: OptionItem[];
}
