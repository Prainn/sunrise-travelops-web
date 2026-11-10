export const COMMON_EMOJIS = [
  ["😀", "1f600"], ["😃", "1f603"], ["😄", "1f604"], ["😊", "1f60a"],
  ["😉", "1f609"], ["😂", "1f602"], ["😍", "1f60d"], ["😮", "1f62e"],
  ["😢", "1f622"], ["🙏", "1f64f"], ["👍", "1f44d"], ["👎", "1f44e"],
  ["❤️", "2764"], ["🎉", "1f389"], ["✅", "2705"], ["👋", "1f44b"],
] as const;
export const emojiUrl = (emoji: string) => {
  const item = COMMON_EMOJIS.find(([value]) => value === emoji);
  return item ? `/emoji/${item[1]}.svg` : undefined;
};
export const splitEmojis = (text: string) => text.split(new RegExp(`(${COMMON_EMOJIS.map(([emoji]) => emoji).join("|")})`, "gu"));
