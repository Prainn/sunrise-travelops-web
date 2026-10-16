/** 合同：非负金额字符串，最多 10 位整数及 2 位小数。 */
export function isValidVehiclePrice(value: string) {
  return /^\d{1,10}(\.\d{1,2})?$/.test(value);
}
