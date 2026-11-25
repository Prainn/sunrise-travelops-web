/** 车型字典升级前后都可选，业务值与新字典共用 N_seat。 */
export function dictionaryVehicleCode(code: string): string | undefined {
  if (vehicleSeatCount(code)) return code;
  const seats = /^seat([1-9]\d*)$/.exec(code)?.[1];
  return seats ? `${seats}_seat` : undefined;
}

export function vehicleSeatCount(value: string): string | undefined {
  return /^([1-9]\d*)_seat$/.exec(value)?.[1];
}

export function websiteVehicleLabel(value: string, t: (key: string, params: { seats: string }) => string): string {
  const seats = vehicleSeatCount(value);
  return seats ? t("websiteInquiry.vehicleSeatLabel", { seats }) : value;
}
