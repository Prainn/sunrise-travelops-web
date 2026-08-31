export const RESOURCE_PERMISSIONS = {
  agency: createResourcePermissions("agency"),
  supplier: createResourcePermissions("supplier"),
  hotel: createResourcePermissions("hotel"),
  restaurant: createResourcePermissions("restaurant"),
  attraction: createResourcePermissions("attraction"),
  transport: createResourcePermissions("transport"),
  guide: createResourcePermissions("guide"),
} as const;

export type ResourcePermissionSet = {
  list: string;
  create: string;
  update: string;
  delete: string;
};

export const ALL_RESOURCE_PERMISSIONS = Object.values(RESOURCE_PERMISSIONS)
  .flatMap((permissions) => Object.values(permissions));

function createResourcePermissions(resource: string): ResourcePermissionSet {
  return {
    list: `resource:${resource}:list`,
    create: `resource:${resource}:create`,
    update: `resource:${resource}:update`,
    delete: `resource:${resource}:delete`,
  };
}
