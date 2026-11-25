export function vehicleSeatCount(value: string): string | undefined {
  return /^([1-9]\d*)_seat$/.exec(value)?.[1];
}

export function websiteVehicleLabel(value: string, t: (key: string, params: { seats: string }) => string): string {
  const seats = vehicleSeatCount(value);
  return seats ? t("websiteInquiry.vehicleSeatLabel", { seats }) : value;
}
