/** 将小数形式的增长率格式化为百分比。 */
export function formatGrowthRate(growthRate: number): string {
  if (growthRate === 0) return "-";

  const percentage = Math.abs(growthRate * 100)
    .toFixed(2)
    .replace(/\.?0+$/, "");
  return `${percentage}%`;
}
