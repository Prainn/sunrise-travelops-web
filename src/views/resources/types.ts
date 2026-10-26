import type { ResourceAuditRecord, ResourceRecord, ResourceStatus } from "@/types/resource";

export interface ResourceTableRecord extends ResourceAuditRecord {
  id: string;
  status: ResourceStatus;
}

export interface ResourceColumn {
  prop: string;
  labelKey: string;
  minWidth?: number;
}

export interface ResourceFormField extends ResourceColumn {
  disabled?: boolean;
  clearable?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  precision?: number;
  /** 必须与该字段同时填写或同时清空 */
  pairedWith?: string;
  type?: "text" | "number" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
}

export type ResourceRow = ResourceRecord;
