import type { TourGuideService } from "@/types/tour";

export interface GuideIdentity {
  guideId: string;
  guideName: string;
  guideCode: string;
}

/** 按导游 ID 去重，保持首次出现顺序；同名不同 ID 不合并。 */
export function distinctGuides(services: readonly TourGuideService[]): GuideIdentity[] {
  const seen = new Map<string, GuideIdentity>();
  for (const { guideId, guideName, guideCode } of services)
    if (!seen.has(guideId)) seen.set(guideId, { guideId, guideName, guideCode });
  return [...seen.values()];
}

export function guideIdentityText(guide: Pick<GuideIdentity, "guideName" | "guideCode">): string {
  return guide.guideCode ? `${guide.guideName} (${guide.guideCode})` : guide.guideName;
}

/** 列表/地图摘要文本；空数组返回空串，由调用方显示“未安排”。 */
export function guideSummaryText(services: readonly TourGuideService[]): string {
  return distinctGuides(services).map(guideIdentityText).join("、");
}
