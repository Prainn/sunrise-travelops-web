import { request } from "@/api/request";
import type { PageResult } from "@/types/common";
import type {
  GuideLeaveInput,
  GuideLeaveRecord,
  RatingField,
  TourBusinessUnit,
  TourFlightOption,
  TourGuideOption,
  TourInput,
  TourRatingRow,
  TourRecord,
  TourSource,
  TourSourceModule,
} from "@/types/tour";
import { selectedResourceBusinessUnit, selectedResourceLibrary } from "./resource-library";

export interface TourListQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  businessUnit?: TourBusinessUnit;
  status?: "active" | "cancelled";
}

export interface PagedKeywordQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}

function clean<T extends object>(query: T) {
  return Object.fromEntries(
    Object.entries(query).map(([key, value]) => [
      key,
      typeof value === "string" ? value.trim() || undefined : value,
    ]),
  );
}

/** 请假表沿用资源库隔离：总部选择业务后改传 businessUnit。 */
function leaveScope() {
  return selectedResourceBusinessUnit.value
    ? { businessUnit: selectedResourceBusinessUnit.value }
    : { library: selectedResourceLibrary.value };
}

export const tourService = {
  list(query: TourListQuery) {
    return request.get<PageResult<TourRecord>>("/tours", { params: clean(query) });
  },
  sources(sourceModule: TourSourceModule, keyword?: string) {
    return request.get<TourSource[]>("/tours/sources", {
      params: clean({ sourceModule, keyword }),
    });
  },
  operators(businessUnit: TourBusinessUnit) {
    return request.get<Array<{ id: string; name: string }>>("/tours/operators", {
      params: { businessUnit },
    });
  },
  flights(businessUnit: TourBusinessUnit, keyword?: string) {
    return request.get<TourFlightOption[]>("/tours/flights", {
      params: clean({ businessUnit, keyword }),
    });
  },
  availableGuides(params: {
    businessUnit: TourBusinessUnit;
    startDate: string;
    days: number;
    pickupFlightId: string;
    dropFlightId: string;
    excludeTourId?: string;
  }) {
    return request.get<TourGuideOption[]>("/tours/available-guides", { params });
  },
  create(
    source: { sourceModule: TourSourceModule; inquiryId: string; quoteId: string },
    input: TourInput,
  ) {
    return request.post<TourRecord>("/tours", {
      ...source,
      ...input,
      guideId: input.guideId || undefined,
    });
  },
  update(id: string, version: number, input: TourInput) {
    return request.put<TourRecord>(`/tours/${encodeURIComponent(id)}`, {
      ...input,
      guideId: input.guideId || null,
      version,
    });
  },
  cancel(id: string, version: number, reason: string) {
    return request.post<TourRecord>(`/tours/${encodeURIComponent(id)}/cancel`, {
      version,
      reason,
    });
  },
  ratings(query: PagedKeywordQuery) {
    return request.get<PageResult<TourRatingRow>>("/tours/ratings", { params: clean(query) });
  },
  saveRating(tourId: string, version: number, patch: Partial<Record<RatingField, number | null>>) {
    return request.put<TourRatingRow>(`/tours/ratings/${encodeURIComponent(tourId)}`, {
      ...patch,
      version,
    });
  },
  leaves(query: PagedKeywordQuery) {
    return request.get<PageResult<GuideLeaveRecord>>("/resources/guide-leaves", {
      params: clean({ ...query, ...leaveScope() }),
    });
  },
  createLeave(input: GuideLeaveInput) {
    return request.post<GuideLeaveRecord>("/resources/guide-leaves", {
      ...input,
      library: selectedResourceLibrary.value,
    });
  },
  updateLeave(id: string, version: number, library: GuideLeaveRecord["library"], input: GuideLeaveInput) {
    return request.put<GuideLeaveRecord>(`/resources/guide-leaves/${encodeURIComponent(id)}`, {
      ...input,
      library,
      version,
    });
  },
  async deleteLeave(id: string) {
    await request.delete<void>("/resources/guide-leaves", { params: { ids: id } });
  },
};
