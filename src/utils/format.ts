/** 将小数形式的增长率格式化为百分比。 */
export function formatGrowthRate(growthRate: number): string {
  if (growthRate === 0) return "-";

  const percentage = Math.abs(growthRate * 100)
    .toFixed(2)
    .replace(/\.?0+$/, "");
  return `${percentage}%`;
}

/** 将日期格式化为本地日期字符串。 */
export function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 将日期格式化为本地日期时间字符串，精确到分钟。 */
export function formatDateTime(value: Date): string {
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${formatDate(value)} ${hours}:${minutes}`;
}

/** 在日期字符串上增加指定天数。 */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return formatDate(value);
}

/** 将金额格式化为两位小数，不包含货币符号。 */
export function formatMoney(value: number): string {
  return value.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
