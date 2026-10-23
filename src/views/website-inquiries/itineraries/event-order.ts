import type { WebsiteDay } from "@/types/website";
import { orderById } from "@/views/inquiries/itineraries/reorder-board";
import { websiteGuideBoardId } from "./day-order";

/**
 * 补齐未记录的明细，保留已有交错顺序；删除失效或重复的 ID。
 */
export function websiteDayEventIds(day: WebsiteDay): string[] {
  const remaining = new Set([
    ...day.items.map(item => item.id),
    ...day.legs.map(leg => leg.id),
    ...day.hotels.map(hotel => hotel.id),
    ...day.meals.map(meal => meal.id),
    ...(day.guideLanguage ? [websiteGuideBoardId(day.id)] : []),
    ...day.services.map(service => service.id),
  ]);
  const ordered = (day.eventOrder ?? []).filter(id => remaining.delete(id));
  return [...ordered, ...remaining];
}

/**
 * 将已确认的明细放到指定卡片之后；餐次复用当天原 ID，不重复创建。
 * 同步分类数组顺序，供交通链校验等原有消费者使用。
 */
export function insertWebsiteEvent(day: WebsiteDay, id: string, afterId: string) {
  if (id === afterId) return;
  const order = websiteDayEventIds(day).filter(eventId => eventId !== id);
  const anchor = order.indexOf(afterId);
  order.splice(anchor < 0 ? order.length : anchor + 1, 0, id);
  day.eventOrder = order;
  day.items = orderById(day.items, order);
  day.legs = orderById(day.legs, order);
}
