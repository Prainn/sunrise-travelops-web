import type { WebsiteRoute } from "@/types/website";

export function websiteRouteTransportDetails(route: WebsiteRoute) {
  const singleVehicle = route.mode === "private_vehicle" && route.vehicleOptions?.length === 1
    ? route.vehicleOptions[0]
    : undefined;
  return {
    vehicleType: singleVehicle?.vehicleType ?? null,
    distanceKm: route.distanceKm ?? null,
    durationMinutes: route.mode === "private_vehicle"
      ? singleVehicle?.durationMinutes ?? null
      : route.durationMinutes ?? null,
  };
}
