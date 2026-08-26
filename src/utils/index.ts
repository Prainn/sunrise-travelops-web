/**
 * 工具函数统一导出
 */

// 数据验证
export { isExternal } from "./validate";

// 数据格式化
export { addDays, formatDate, formatDateTime, formatGrowthRate, formatMoney } from "./format";
export { fromCents, multiplyMoney, roundMoney, sumMoney, toCents } from "./money";
export { generateNextCode } from "./generate-code";
export { createId } from "./create-id";
export { hasUserPermission } from "./permission";
export { readFileAsDataUrl } from "./file";

// 本地存储
export { Storage } from "./storage";
