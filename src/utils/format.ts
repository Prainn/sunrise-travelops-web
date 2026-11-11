/** 将日期格式化为本地日期字符串。 */
export function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** 将日期格式化为本地日期时间字符串，精确到分钟。 */
export function formatDateTime(input: Date | string | null | undefined): string {
  if (!input) return "-";
  const value = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(value.getTime())) return "-";
  const hours = String(value.getHours()).padStart(2, "0");
  const minutes = String(value.getMinutes()).padStart(2, "0");
  return `${formatDate(value)} ${hours}:${minutes}`;
}

const SHANGHAI_DATE_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Shanghai",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 按 Asia/Shanghai 格式化时刻，精确到分钟；业务提醒与跟进时间统一以上海时间展示。 */
export function formatShanghaiDateTime(input: Date | string | null | undefined): string {
  if (!input) return "-";
  const value = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(value.getTime())) return "-";
  const parts = Object.fromEntries(
    SHANGHAI_DATE_TIME.formatToParts(value).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

/** 在日期字符串上增加指定天数。 */
export function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + days);
  return formatDate(value);
}

/** 读取金额；未填或无效值保留为空，不能视为零元。 */
export function parseMoney(value: string | number | null | undefined): number | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** 金额统一显示两位小数，未填显示占位符，不包含货币符号。 */
export function formatMoney(value: string | number | null | undefined): string {
  const amount = parseMoney(value);
  if (amount === null) return "—";
  return amount.toLocaleString("zh-CN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
