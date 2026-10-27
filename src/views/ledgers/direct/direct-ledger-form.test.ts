import { describe, expect, it } from "vitest";
import type { DirectLedgerItem } from "@/types/direct-ledger";
import {
  directLedgerFormFromItem,
  directLedgerInput,
  fromTriState,
  toTriState,
} from "./direct-ledger-form";

const item: DirectLedgerItem = {
  id: "ledger-1",
  businessUnit: "linxi",
  orderNo: "DL-0000000001",
  receivedDate: "2026-10-19",
  source: " 携程123 ",
  creatorId: "user-1",
  creatorName: "收客计调",
  receivingGroupId: "group-1",
  receivingAccountName: "定制师杨娟组",
  operatorId: "user-3",
  operatorName: "操作计调",
  orderStatus: "converted",
  effectiveContact: false,
  proposalSent: true,
  loss: false,
  priority: false,
  itinerary: "",
  notConvertedReason: "",
  lossNote: "",
  remark: "",
  feedbackReason: "",
  solution: "",
  dealDate: null,
  departureDate: "2026-11-01",
  complaint: false,
  satisfied: null,
  workflowStatus: "operated",
  reviewedAt: null,
  reviewedBy: null,
  operated: true,
  operatedAt: "2026-10-19T08:00:00.000Z",
  version: 3,
  createdAt: "2026-10-19T07:00:00.000Z",
  updatedAt: "2026-10-19T08:00:00.000Z",
  updatedBy: "user-3",
  capabilities: {
    canEdit: false,
    canDelete: false,
    canReview: false,
    canOperate: false,
    canChangeStatus: false,
  },
};

describe("direct ledger form", () => {
  it("submits only contract fields and keeps false/null values", () => {
    const body = directLedgerInput(directLedgerFormFromItem(item), "linxi");

    expect(body).toEqual({
      receivedDate: "2026-10-19",
      source: "携程123",
      receivingGroupId: "group-1",
      operatorId: "user-3",
      orderStatus: "converted",
      effectiveContact: false,
      proposalSent: true,
      loss: false,
      priority: false,
      itinerary: "",
      notConvertedReason: "",
      lossNote: "",
      remark: "",
      feedbackReason: "",
      solution: "",
      dealDate: null,
      departureDate: "2026-11-01",
      complaint: false,
      satisfied: null,
    });
  });

  it("never sends a receiving group for website records", () => {
    const form = { ...directLedgerFormFromItem(item), receivingGroupId: "group-1" };

    expect(directLedgerInput(form, "website").receivingGroupId).toBeNull();
  });

  it("maps tri-state answers without swallowing false", () => {
    expect([null, true, false].map(toTriState)).toEqual(["unset", "yes", "no"]);
    expect((["unset", "yes", "no"] as const).map(fromTriState)).toEqual([null, true, false]);
  });
});
