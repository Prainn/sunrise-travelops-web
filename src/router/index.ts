import type { App } from "vue";
import { createRouter, createWebHashHistory, type RouteRecordRaw } from "vue-router";

export const Layout = () => import("@/layouts/index.vue");

// 静态路由
export const constantRoutes: RouteRecordRaw[] = [
  {
    path: "/redirect",
    component: Layout,
    meta: { hidden: true },
    children: [
      {
        path: "/redirect/:path(.*)",
        component: () => import("@/views/redirect.vue"),
      },
    ],
  },

  {
    path: "/login",
    component: () => import("@/views/login/index.vue"),
    meta: { hidden: true },
  },

  {
    path: "/",
    name: "/",
    component: Layout,
    redirect: "/dashboard",
    children: [
      {
        path: "dashboard",
        component: () => import("@/views/dashboard/index.vue"),
        // 用于 keep-alive 功能，需要与 SFC 中自动推导或显式声明的组件名称一致
        // 参考文档: https://cn.vuejs.org/guide/built-ins/keep-alive.html#include-exclude
        name: "Dashboard",
        meta: {
          title: "dashboard",
          icon: "el-icon-House",
          affix: true,
          keepAlive: true,
        },
      },
      {
        path: "401",
        component: () => import("@/views/error/401.vue"),
        meta: { hidden: true },
      },
      {
        path: "404",
        component: () => import("@/views/error/404.vue"),
        meta: { hidden: true },
      },
      {
        path: "profile",
        name: "Profile",
        component: () => import("@/views/profile/index.vue"),
        meta: { title: "profile", icon: "el-icon-User", hidden: true },
      },
    ],
  },
  {
    path: "/system",
    name: "System",
    component: Layout,
    redirect: "/system/dict",
    meta: {
      title: "systemManagement",
      icon: "el-icon-Setting",
      alwaysShow: true,
    },
    children: [
      {
        path: "dict",
        name: "Dict",
        component: () => import("@/views/system/dict/index.vue"),
        meta: {
          title: "systemDictionary",
          icon: "el-icon-Collection",
          keepAlive: true,
          perms: ["sys:dict:list"],
        },
      },
      {
        path: "dict-item",
        name: "DictItem",
        component: () => import("@/views/system/dict/dict-item.vue"),
        meta: {
          title: "dictionaryOptions",
          hidden: true,
          keepAlive: true,
          perms: ["sys:dict-item:list"],
        },
      },
      {
        path: "user",
        name: "User",
        component: () => import("@/views/system/user/index.vue"),
        meta: {
          title: "userList",
          icon: "el-icon-User",
          keepAlive: true,
          perms: ["sys:user:list"],
        },
      },
    ],
  },
  {
    path: "/inquiries",
    name: "Inquiries",
    component: Layout,
    redirect: "/inquiries/list",
    meta: {
      title: "inquiries",
      icon: "el-icon-ChatLineSquare",
      alwaysShow: true,
    },
    children: [
      {
        path: "list",
        name: "InquiryList",
        component: () => import("@/views/inquiries/index.vue"),
        meta: {
          title: "inquiryList",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["inquiry:list"],
        },
      },
      {
        path: ":inquiryId/itineraries",
        name: "InquiryItineraries",
        component: () => import("@/views/inquiries/itineraries/index.vue"),
        meta: {
          title: "itineraryManagement",
          hidden: true,
          perms: ["itinerary:list"],
        },
      },
    ],
  },
  {
    path: "/resources",
    name: "TourismResources",
    component: Layout,
    redirect: "/resources/agency",
    meta: {
      title: "tourismResources",
      icon: "el-icon-Briefcase",
      alwaysShow: true,
    },
    children: [
      {
        path: "agency",
        name: "Agency",
        component: () => import("@/views/resources/agency/index.vue"),
        meta: {
          title: "travelAgencies",
          icon: "el-icon-Promotion",
          keepAlive: true,
          perms: ["resource:agency:list"],
        },
      },
      {
        path: "supplier",
        name: "Supplier",
        component: () => import("@/views/resources/supplier/index.vue"),
        meta: {
          title: "suppliers",
          icon: "el-icon-OfficeBuilding",
          keepAlive: true,
          perms: ["resource:supplier:list"],
        },
      },
      {
        path: "hotel",
        name: "Hotel",
        component: () => import("@/views/resources/hotel/index.vue"),
        meta: {
          title: "hotelsAndRoomTypes",
          icon: "el-icon-House",
          keepAlive: true,
          perms: ["resource:hotel:list"],
        },
      },
      {
        path: "restaurant",
        name: "Restaurant",
        component: () => import("@/views/resources/restaurant/index.vue"),
        meta: {
          title: "restaurants",
          icon: "el-icon-Food",
          keepAlive: true,
          perms: ["resource:restaurant:list"],
        },
      },
      {
        path: "attraction",
        name: "Attraction",
        component: () => import("@/views/resources/attraction/index.vue"),
        meta: {
          title: "attractions",
          icon: "el-icon-Place",
          keepAlive: true,
          perms: ["resource:attraction:list"],
        },
      },
      {
        path: "transport",
        name: "TransportResource",
        component: () => import("@/views/resources/transport/index.vue"),
        meta: {
          title: "vehiclesAndDrivers",
          icon: "el-icon-Van",
          keepAlive: true,
          perms: ["resource:transport:list"],
        },
      },
      {
        path: "guide",
        name: "Guide",
        component: () => import("@/views/resources/guide/index.vue"),
        meta: {
          title: "guides",
          icon: "el-icon-UserFilled",
          keepAlive: true,
          perms: ["resource:guide:list"],
        },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
    meta: { hidden: true },
  },
];

/**
 * 创建路由
 */
const router = createRouter({
  history: createWebHashHistory(),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

export default router;
