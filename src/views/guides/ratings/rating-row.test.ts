import { describe, expect, it } from "vitest";
import type { TourRatingRow } from "@/types/tour";
import { ratingKey, replaceRatingRow } from "./rating-row";

const row = (guideId: string, version: number, selfScore: number | null = null) =>
  ({ tourId: "t1", guideId, version, selfScore }) as TourRatingRow;

describe("rating rows", () => {
  it("keys by tour and guide so one tour can hold several guides", () => {
    expect(ratingKey(row("g1", 0))).not.toBe(ratingKey(row("g2", 0)));
  });

  it("replaces only the saved combination and keeps versions independent; 0 is a real score", () => {
    const rows = [row("g1", 2, 80), row("g2", 0)];
    replaceRatingRow(rows, row("g2", 1, 0));
    expect(rows.map((item) => [item.guideId, item.version, item.selfScore])).toEqual([
      ["g1", 2, 80],
      ["g2", 1, 0],
    ]);
  });
});
