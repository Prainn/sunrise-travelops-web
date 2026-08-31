import {
  attractions,
  guides,
  hotels,
  restaurants,
  tourismResources,
} from "@/data/data";

/**
 * 资源数据访问边界。
 *
 * 当前仍返回本地原型数据；接入后端后由本服务统一替换为接口调用，页面不再感知数据来源。
 */
export const resourceService = {
  agencies: tourismResources.agency,
  suppliers: tourismResources.supplier,
  transports: tourismResources.transport,
  hotels,
  restaurants,
  attractions,
  guides,
};
