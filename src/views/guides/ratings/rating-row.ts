import type { TourRatingRow } from "@/types/tour";

/** 评分行身份是 团+导游；同团不同人互不影响，同人多段仍只有一行。 */
export function ratingKey(row: Pick<TourRatingRow, "tourId" | "guideId">): string {
  return `${row.tourId}:${row.guideId}`;
}

/** 保存成功后只替换该组合行。 */
export function replaceRatingRow(rows: TourRatingRow[], saved: TourRatingRow): void {
  const index = rows.findIndex((item) => ratingKey(item) === ratingKey(saved));
  if (index >= 0) rows.splice(index, 1, saved);
}
