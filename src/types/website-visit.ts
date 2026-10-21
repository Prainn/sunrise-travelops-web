export interface WebsiteVisit {
  id: string;
  whatsapp_reference: string;
  website_inquiry_id: string;
  contract_version: string;
  first_landing_page: string | null;
  external_referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  gbraid: string | null;
  wbraid: string | null;
  created_at_utc: string;
  expires_at_utc: string;
  payload_fingerprint: string;
  converted: boolean;
  inquiry: { id: string; code: string } | null;
}
export interface WebsiteVisitQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  start?: string;
  end?: string;
}
