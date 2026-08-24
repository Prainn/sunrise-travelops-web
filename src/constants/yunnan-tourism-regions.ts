export interface TourismRegionOption {
  [key: string]: unknown;
  value: string;
  label: string;
  children?: TourismRegionOption[];
}

/**
 * Sunrise 当前经营范围内的云南旅游目的地。
 *
 * 这是生产可用的业务基础配置，不属于演示数据；新增目的地时在此集中维护。
 */
export const YUNNAN_TOURISM_REGION_OPTIONS: TourismRegionOption[] = [
  {
    value: "云南省",
    label: "云南省",
    children: [
      { value: "昆明市", label: "昆明市" },
      { value: "大理白族自治州", label: "大理白族自治州" },
      { value: "丽江市", label: "丽江市" },
      { value: "迪庆藏族自治州", label: "迪庆藏族自治州" },
      { value: "保山市", label: "保山市" },
      { value: "西双版纳傣族自治州", label: "西双版纳傣族自治州" },
    ],
  },
];
