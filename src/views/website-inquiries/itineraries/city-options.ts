import type { WebsiteCity, WebsiteDay } from "@/types/website";

export function selectableWebsiteCityIds(cities: WebsiteCity[], destinations: string[]) {
  const scope = new Set(destinations);
  return new Set(cities
    .filter((city) => city.status === "enabled" && (!scope.size || scope.has(city.id)))
    .map((city) => city.id));
}

export function websiteCityOptions(
  cities: WebsiteCity[],
  selectableCityIds: ReadonlySet<string>,
  ...retained: (string | null | undefined)[]
) {
  const retainedIds = new Set(retained);
  return cities.filter((city) => selectableCityIds.has(city.id) || retainedIds.has(city.id));
}

export function websiteDayRouteCityIds(day?: WebsiteDay) {
  if (!day) return [];
  return [day.departCityId, day.endCityId, ...day.legs.flatMap((leg) => [leg.fromCityId, leg.toCityId])];
}
