/** 生成带业务前缀的唯一实体 ID。 */
export function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}
