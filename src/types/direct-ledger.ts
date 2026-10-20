export type DirectLedgerBusinessUnit = "linxi" | "website";
export type DirectLedgerOrderStatus = "unconverted" | "converted";

/** 霖熹/独立站台账列表查询；总部必须显式传 businessUnit。 */
export interface DirectLedgerQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  from?: string;
  to?: string;
  orderStatus?: DirectLedgerOrderStatus;
  businessUnit?: DirectLedgerBusinessUnit;
}

/** 接单账号与操作计调共用的人员选项查询。 */
export interface DirectLedgerOperatorQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  businessUnit?: DirectLedgerBusinessUnit;
}

export interface DirectLedgerOperatorOption {
  id: string;
  name: string;
}

/** 后端按当前身份与记录状态计算的直客台账能力。 */
export interface DirectLedgerCapabilities {
  canEdit: boolean;
  canDelete: boolean;
  canReview: boolean;
  canOperate: boolean;
  canChangeStatus: boolean;
}

/** 可编辑业务字段；complaint/satisfied 的 null 表示未填写。 */
export interface DirectLedgerInput {
  receivedDate: string;
  source: string;
  /** 独立站固定为 null，由后端回填“独立站”。 */
  receivingAccountId: string | null;
  operatorId: string;
  orderStatus: DirectLedgerOrderStatus;
  effectiveContact: boolean;
  proposalSent: boolean;
  loss: boolean;
  priority: boolean;
  itinerary: string;
  notConvertedReason: string;
  lossNote: string;
  remark: string;
  feedbackReason: string;
  solution: string;
  dealDate: string | null;
  departureDate: string | null;
  complaint: boolean | null;
  satisfied: boolean | null;
}

/** 新增时由当前业务决定归属；ROOT 代建必须指定定制师。 */
export interface DirectLedgerCreateInput extends DirectLedgerInput {
  businessUnit?: DirectLedgerBusinessUnit;
  creatorId?: string;
}

export interface DirectLedgerUpdateInput extends DirectLedgerInput {
  version: number;
}

export interface DirectLedgerOperationInput {
  version: number;
  operated: boolean;
}

/** 直客台账列表项与详情：一个客户一次出游需求。 */
export interface DirectLedgerItem extends DirectLedgerInput {
  id: string;
  businessUnit: DirectLedgerBusinessUnit;
  orderNo: string;
  receivedMonth: string;
  creatorId: string;
  creatorName: string;
  receivingAccountName: string;
  operatorName: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  operated: boolean;
  /** 首次操作时间，取消勾选不清除，用于禁止退回未成团。 */
  operatedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  capabilities: DirectLedgerCapabilities;
}
