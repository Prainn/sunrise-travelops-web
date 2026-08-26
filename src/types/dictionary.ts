import type { BaseQueryParams } from "@/types/common";

export type DictionaryTagType = "success" | "warning" | "info" | "primary" | "danger" | "";

export interface DictTypeQueryParams extends BaseQueryParams {
  keywords?: string;
  status?: number;
}

export interface DictTypeItem {
  id: string;
  name: string;
  dictCode: string;
  status: number;
  remark?: string;
}

export interface DictTypeForm {
  id?: string;
  name?: string;
  dictCode?: string;
  status?: number;
  remark?: string;
}

export interface DictItemQueryParams extends BaseQueryParams {
  keywords?: string;
  dictCode?: string;
}

export interface DictItem {
  id: string;
  dictCode: string;
  label: string;
  value: string;
  status: number;
  sort?: number;
  tagType?: DictionaryTagType;
}

export interface DictItemForm {
  id?: string;
  dictCode?: string;
  label?: string;
  value?: string;
  status?: number;
  sort?: number;
  tagType?: DictionaryTagType;
}

export interface DictItemOption {
  value: number | string;
  label: string;
  tagType?: DictionaryTagType;
}

export type SystemDictionaryType = DictTypeItem & {
  nameKey?: string;
  remarkKey?: string;
};

export type SystemDictionaryItem = DictItem & {
  labelKey?: string;
};
