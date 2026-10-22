export type DirectLedgerBusinessUnit = "linxi" | "website";
export type DirectLedgerWorkflowStatus = "pending_confirmation" | "pending_operation" | "operated";
export type DirectLedgerOrderStatus = "unconverted" | "converted";

/** 霖熹/独立站台账列表查询；总部必须显式传 businessUnit。 */
export interface DirectLedgerQueryParams {
  page: number;
  pageSize: number;
  keyword?: string;
  creatorId?: string;
  operatorId?: string;
  from?: string;
  to?: string;
  orderStatus?: DirectLedgerOrderStatus;
  workflowStatus?: DirectLedgerWorkflowStatus;
  businessUnit?: DirectLedgerBusinessUnit;
}

/** 收客计调、操作计调与接单业务组共用的分页选项查询。 */
export interface DirectLedgerOperatorQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  businessUnit?: DirectLedgerBusinessUnit;
}

/** 人员或接单业务组选项；业务组名称为管理员录入的完整显示值。 */
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
  /** 霖熹必填启用业务组 ID；独立站固定为 null，由后端回填“独立站”。 */
  receivingGroupId: string | null;
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

/** 新增时由当前业务决定归属；ROOT 代建必须指定收客计调。 */
export interface DirectLedgerCreateInput extends DirectLedgerInput {
  businessUnit?: DirectLedgerBusinessUnit;
  creatorId?: string;
}

export interface DirectLedgerUpdateInput extends DirectLedgerInput {
  version: number;
}

export interface DirectLedgerOperationInput {
  version: number;
}

/** 直客台账列表项与详情：一个客户一次出游需求。 */
export interface DirectLedgerItem extends DirectLedgerInput {
  id: string;
  businessUnit: DirectLedgerBusinessUnit;
  orderNo: string;
  receivedMonth: string;
  /** 收客计调及其姓名快照。 */
  creatorId: string;
  creatorName: string;
  /** 接单业务组或“独立站”的名称快照。 */
  receivingAccountName: string;
  operatorName: string;
  workflowStatus: DirectLedgerWorkflowStatus;
  reviewedAt: string | null;
  reviewedBy: string | null;
  operated: boolean;
  /** 首次操作时间；曾操作后锁定普通字段。 */
  operatedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
  capabilities: DirectLedgerCapabilities;
}
