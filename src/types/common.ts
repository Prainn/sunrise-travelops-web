export interface BaseQueryParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  order?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OptionItem {
  value: string | number;
  label: string;
  children?: OptionItem[];
}
