interface RecordWithCode {
  code: string;
}

/** 根据已有编码生成下一个连续编码。 */
export function generateNextCode(records: RecordWithCode[], prefix: string, digits = 3): string {
  const codePattern = new RegExp(`^${prefix}-(\\d+)$`);
  const maxSequence = records.reduce((max, record) => {
    const sequence = Number(record.code.match(codePattern)?.[1] ?? 0);
    return Math.max(max, sequence);
  }, 0);
  return `${prefix}-${String(maxSequence + 1).padStart(digits, "0")}`;
}
