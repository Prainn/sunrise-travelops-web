import type { TourismResourceRecord } from "@/data/data";

export interface ResourceColumn {
  prop: string;
  labelKey: string;
  minWidth?: number;
}

export interface ResourceFormField extends ResourceColumn {
  required?: boolean;
  type?: "text" | "number" | "textarea";
}

export type ResourceRow = TourismResourceRecord;
