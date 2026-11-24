import type { WebsiteAttraction } from "@/types/website";

export interface WebsiteAttractionRow {
  attraction: WebsiteAttraction;
  /** 组件所属父景点；父景点本身或无父记录时为 undefined。 */
  parent?: WebsiteAttraction;
}

/**
 * 独立站景点弹窗的父子清单：按配置顺序列出父景点，其后紧跟全部可选组件。
 *
 * 非空关键词（去首尾空白，英文不区分大小写）只匹配父景点中英文名，命中时带出该父景点全部可选组件；
 * 组件名命中不带出父景点组。父景点不可选的组件归入其父记录（可来自完整配置）名下匹配。
 *
 * @param selectable - 已按配置版本、城市与启用状态筛选、保持配置顺序的景点与组件。
 * @param keyword - 用户输入的关键词。
 * @param allAttractions - 绑定版本的完整景点配置，用于找到不可选父景点。
 */
export function websiteAttractionRows(
  selectable: WebsiteAttraction[],
  keyword: string,
  allAttractions: WebsiteAttraction[] = selectable,
): WebsiteAttractionRow[] {
  const query = keyword.trim().toLowerCase();
  const matchesParent = (parent: WebsiteAttraction | undefined) =>
    !query || Boolean(parent && (parent.nameZh.toLowerCase().includes(query) || parent.nameEn.toLowerCase().includes(query)));
  const isComponentOf = (item: WebsiteAttraction, parentId: string) => item.kind === "component" && item.parentId === parentId;
  const listed = new Set<string>();
  const result: WebsiteAttractionRow[] = [];
  for (const parent of selectable) {
    const isParent = parent.kind === "attraction" || !parent.parentId;
    if (!isParent || !matchesParent(parent)) continue;
    result.push({ attraction: parent });
    listed.add(parent.id);
    for (const child of selectable) {
      if (!isComponentOf(child, parent.id)) continue;
      result.push({ attraction: child, parent });
      listed.add(child.id);
    }
  }
  // 父景点不在可选范围内的组件：仍按其父景点名称匹配，不按组件名。
  for (const record of selectable) {
    if (listed.has(record.id)) continue;
    const parent = allAttractions.find((candidate) => candidate.id === record.parentId);
    if (matchesParent(parent)) result.push({ attraction: record, parent });
  }
  return result;
}
