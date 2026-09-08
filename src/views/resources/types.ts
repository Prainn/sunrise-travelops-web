import type { ResourceRecord } from "@/types/resource";

export interface ResourceColumn {
  prop: string;
  labelKey: string;
  minWidth?: number;
}

export interface ResourceFormField extends ResourceColumn {
  disabled?: boolean;
  required?: boolean;
  type?: "text" | "number" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
}

export type ResourceRow = ResourceRecord;
