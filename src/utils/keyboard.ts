/**
 * 输入框按 Enter 执行操作，但跳过输入法确认候选词的 Enter。
 * Safari 会在 keydown 前清除 isComposing，因此同时判断组字期间的 keyCode 229。
 *
 * @param event - 输入框的 keydown 事件；Element Plus 输入框按 Event 类型抛出。
 * @param action - 非组字状态下执行的操作。
 */
export function runOnEnter(event: Event, action: () => void) {
  if (event instanceof KeyboardEvent && (event.isComposing || event.keyCode === 229)) return;
  event.preventDefault();
  action();
}
