import type { TourismResourceRecord } from "@/data/data";

export interface ResourceColumn {
  prop: string;
  labelKey: string;
  minWidth?: number;
}

export interface ResourceFormField extends ResourceColumn {
  required?: boolean;
  type?: "text" | "number" | "textarea" | "select";
  options?: Array<{ label: string; value: string }>;
}

export type ResourceRow = TourismResourceRecord;
