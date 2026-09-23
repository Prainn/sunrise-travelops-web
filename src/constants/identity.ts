const businessUnitNames: Record<string, string> = {
  shengxu: "盛旭",
  linxi: "霖熹",
  website: "独立站",
};

export function businessUnitName(unit: string | undefined): string {
  return unit ? (businessUnitNames[unit] ?? "-") : "-";
}

export function loginScopeName(scope: string | undefined): string {
  return scope === "headquarters" ? "总部" : businessUnitName(scope);
}
