const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

/**
 * 解析逗号、分号或换行分隔的收件人地址列表。
 * 支持直接粘贴 "Name <user@example.com>" 格式，同时兼容空格分隔的纯邮箱。
 *
 * @param input - 用户输入的地址文本。
 * @returns 清理后的邮箱地址数组。
 */
export function parseMailAddresses(input: string): string[] {
  const result: string[] = [];
  for (const segment of input.split(/[,;，；\r\n]+/)) {
    const trimmed = segment.trim();
    if (!trimmed) continue;
    const bracketed = /<([^<>]+)>/.exec(trimmed);
    if (bracketed) {
      const address = bracketed[1]!.trim();
      if (address) result.push(address);
      continue;
    }
    for (const token of trimmed.split(/\s+/)) {
      if (token) result.push(token);
    }
  }
  return result;
}

/**
 * 返回不符合基础邮箱格式的地址，用于在提交前给出明确提示。
 *
 * @param addresses - 待校验邮箱数组。
 * @returns 非法地址列表。
 */
export function findInvalidMailAddresses(addresses: string[]): string[] {
  return addresses.filter((address) => !EMAIL_PATTERN.test(address));
}
