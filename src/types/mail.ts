import type { IntegrationActivity, IntegrationRuntime } from "./integration";

export type MailAddress = { email: string; name?: string };
export type MailView = "all" | "unassigned" | "mine";
export interface MailboxOptions {
  mailboxes: string[];
  canSwitch: boolean;
}
export type MailState = "received" | "draft" | "preparing" | "sending" | "unknown" | "failed" | "sent";
export interface MailAttachment {
  id: string;
  fileName: string;
  sizeBytes: number;
  available: boolean;
}
export interface MailMessage {
  id: string;
  threadId: string;
  direction: "inbound" | "outbound";
  state: MailState;
  isRead: boolean;
  occurredAt: string;
  originalId: string | null;
  internetId: string | null;
  sender: MailAddress;
  recipients: MailAddress[];
  replyTo: MailAddress[];
  cc: MailAddress[];
  subject: string;
  body: string;
  signature: string | null;
  attachments: MailAttachment[];
  version: number;
}
export interface MailThread {
  id: string;
  mailbox: string;
  subject: string;
  customerEmail: string;
  customerName: string;
  lastAt: string;
  unreadCount: number;
  ownerId: string | null;
  ownerName: string | null;
  inquiryId: string | null;
  sourceMessageId: string | null;
  version: number;
}
export interface MailQuotedTurn {
  sourceMessageId: string;
  position: number;
  sender: string;
  sentAt: string;
  to: string | null;
  cc: string | null;
  subject: string | null;
  body: string;
}
export interface MailReadingMessage extends MailMessage {
  authoredBody: string | null;
  quotedHistory: MailQuotedTurn[];
}
export interface MailDetail extends MailThread {
  messages: MailReadingMessage[];
  assignments: { actor: string; previousOwner: string | null; owner: string; reason: string; at: string }[];
  canReply: boolean;
  sendBlockedReason: "send_paused" | "not_configured" | null;
  canAssign: boolean;
  canCreateInquiry: boolean;
  canUpdateCustomer: boolean;
  canCreateLedger: boolean;
  ledger: { id: string; orderNo: string } | null;
  signature: string | null;
}
export interface MailIntegrationStatus {
  runtime: IntegrationRuntime;
  staleAfterSeconds: number;
  mailboxes: { mailbox: string; inbox: IntegrationActivity; sent: IntegrationActivity }[];
}
export interface MailDraftInput {
  version: number;
  to: string[];
  cc: string[];
  subject: string;
  body: string;
}
