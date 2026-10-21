/** 盛旭台账列表查询。 */
export interface ShengxuLedgerQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  creatorId?: string;
  agencyId?: string;
  from?: string;
  to?: string;
}

/** 后端按当前身份与记录状态计算的盛旭台账能力。 */
export interface ShengxuLedgerCapabilities {
  canEdit: boolean;
  canDelete: boolean;
}

/** 盛旭台账列表项与详情：一天一个组团社的报价与成团记录。 */
export interface ShengxuLedgerItem {
  id: string;
  businessUnit: "shengxu";
  recordDate: string;
  creatorId: string;
  creatorName: string;
  agencyId: string;
  agencyName: string;
  contactId: string;
  contactName: string;
  countryOrRegion: string;
  city: string;
  quotedGroups: number;
  convertedGroups: number;
  quoteSent: boolean;
  itinerary: string;
  notConvertedReason: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  capabilities: ShengxuLedgerCapabilities;
}

/** 新增/完整编辑请求，只含合同允许写入的业务字段。 */
export interface ShengxuLedgerInput {
  recordDate: string;
  agencyId: string;
  contactId: string;
  quotedGroups: number;
  convertedGroups: number;
  quoteSent: boolean;
  itinerary: string;
  notConvertedReason: string;
}

export interface ShengxuLedgerUpdateInput extends ShengxuLedgerInput {
  version: number;
}

/** 组团社/联系人选项查询；编辑时传 ledgerId 以原创建人限制选项。 */
export interface ShengxuLedgerOptionQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  ledgerId?: string;
}

export interface ShengxuAgencyOption {
  id: string;
  name: string;
  countryOrRegion: string;
  city: string;
  /** ROOT 代建时由组团社带出的收客计调。 */
  coordinatorId?: string;
  coordinatorName?: string;
}

export interface ShengxuContactOption {
  id: string;
  name: string;
  phone: string;
}
