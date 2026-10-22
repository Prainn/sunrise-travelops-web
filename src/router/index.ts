import type { App } from "vue";
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";

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
    path: "/unavailable",
    component: () => import("@/views/error/503.vue"),
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
        path: "menu-permissions",
        name: "MenuPermissions",
        component: () => import("@/views/system/menu-permissions/index.vue"),
        meta: {
          title: "menuPermissions",
          icon: "el-icon-Lock",
          scopes: ["headquarters"],
          roles: ["ROOT"],
          perms: ["sys:menu-permission:list"],
          menuKey: "menu-permissions",
        },
      },
      {
        path: "dict",
        name: "Dict",
        component: () => import("@/views/system/dict/index.vue"),
        meta: {
          menuKey: "dict",
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
          menuKey: "dict",
          title: "dictionaryOptions",
          hidden: true,
          keepAlive: true,
          perms: ["sys:dict-item:list"],
        },
      },
      {
        path: "business-category",
        name: "BusinessCategory",
        component: () => import("@/views/system/business-category/index.vue"),
        meta: {
          menuKey: "business-dict",
          title: "businessCategories",
          icon: "el-icon-Grid",
          keepAlive: true,
          perms: ["sys:business-dictionary:list"],
        },
      },
      {
        path: "user",
        name: "User",
        component: () => import("@/views/system/user/index.vue"),
        meta: {
          menuKey: "users",
          title: "userList",
          icon: "el-icon-User",
          keepAlive: true,
          perms: ["sys:user:list"],
        },
      },
      {
        path: "business-groups",
        name: "BusinessGroups",
        component: () => import("@/views/system/business-groups/index.vue"),
        meta: {
          menuKey: "business-groups",
          title: "businessGroups",
          icon: "el-icon-UserFilled",
          keepAlive: true,
          scopes: ["headquarters", "linxi"],
          perms: ["sys:business-group:list"],
        },
      },
      {
        path: "account-links",
        name: "AccountLinks",
        component: () => import("@/views/system/account-links/index.vue"),
        meta: {
          menuKey: "account-links",
          title: "accountLinks",
          icon: "el-icon-Connection",
          keepAlive: true,
          scopes: ["headquarters"],
          perms: ["sys:account-link:manage"],
        },
      },
      {
        path: "operation-logs",
        name: "OperationLogs",
        component: () => import("@/views/system/operation-logs/index.vue"),
        meta: {
          menuKey: "operations",
          title: "operationLogs",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["sys:operation-log:list"],
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
          scopes: ["shengxu", "headquarters"],
          menuKey: "inquiries",
          title: "inquiryList",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["inquiry:list"],
        },
      },
      {
        path: ":inquiryId/itineraries",
        name: "InquiryItineraries",
        component: () => import("@/views/inquiries/itineraries/entry.vue"),
        meta: {
          menuKey: "inquiries", inquiryWorkspace: true,
          title: "itineraryManagement",
          hidden: true,
          perms: ["itinerary:list", "website:itinerary:list"],
        },
      },
      {
        path: "logs",
        name: "InquiryLogReport",
        component: () => import("@/views/inquiries/logs/index.vue"),
        meta: {
          scopes: ["shengxu", "headquarters"],
          menuKey: "inquiry-summary",
          title: "inquiryLogReport",
          icon: "el-icon-DataAnalysis",
          keepAlive: true,
          perms: ["inquiry:list"],
        },
      },
      {
        path: ":inquiryId/logs",
        name: "InquiryLogs",
        component: () => import("@/views/inquiries/logs/index.vue"),
        meta: {
          scopes: ["shengxu", "headquarters"],
          menuKey: "inquiries",
          title: "inquiryLogs",
          hidden: true,
          perms: ["inquiry:list"],
        },
      },
    ],
  },
  {
    path: "/website-inquiries",
    name: "WebsiteInquiries",
    component: Layout,
    meta: {
      title: "websiteInquiries",
      icon: "el-icon-ChatLineSquare",
      alwaysShow: true,
      scopes: ["linxi", "website", "headquarters"],
    },
    children: [
      {
        path: "",
        name: "WebsiteInquiryList",
        component: () => import("@/views/website-inquiries/index.vue"),
        meta: {
          menuKey: "inquiries",
          title: "inquiryList",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["website:inquiry:list"],
        },
      },
      {
        path: "logs",
        name: "WebsiteInquiryLogReport",
        component: () => import("@/views/website-inquiries/logs/index.vue"),
        meta: {
          menuKey: "website-inquiry-summary",
          title: "inquiryLogReport",
          icon: "el-icon-DataAnalysis",
          keepAlive: true,
          perms: ["website:inquiry:list"],
        },
      },
      {
        path: ":inquiryId/logs",
        name: "WebsiteInquiryLogs",
        component: () => import("@/views/website-inquiries/logs/index.vue"),
        meta: {
          menuKey: "inquiries",
          title: "inquiryLogs",
          hidden: true,
          perms: ["website:inquiry:list"],
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
        path: "website",
        name: "WebsiteResources",
        component: () => import("@/views/resources/website/index.vue"),
        meta: {
          menuKey: "website-config",
          title: "websiteResources",
          icon: "el-icon-Collection",
          keepAlive: true,
          scopes: ["website", "headquarters"],
          perms: ["website:config:list"],
        },
      },
      {
        path: "agency",
        name: "Agency",
        component: () => import("@/views/resources/agency/index.vue"),
        meta: {
          menuKey: "agency",
          title: "travelAgencies",
          icon: "el-icon-Promotion",
          keepAlive: true,
          perms: ["resource:agency:list"],
        },
      },
      {
        path: "city",
        name: "CityResource",
        component: () => import("@/views/resources/city/index.vue"),
        meta: {
          menuKey: "city", title: "cities", icon: "el-icon-Location", perms: ["resource:city:list"] },
      },
      {
        path: "hotel",
        name: "Hotel",
        component: () => import("@/views/resources/hotel/index.vue"),
        meta: {
          menuKey: "hotel",
          title: "hotels",
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
          menuKey: "restaurant",
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
          menuKey: "attraction",
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
          menuKey: "transport",
          title: "vehicleModels",
          icon: "el-icon-Van",
          keepAlive: true,
          perms: ["resource:transport:list"],
        },
      },
      {
        path: "flight",
        name: "FlightResource",
        component: () => import("@/views/resources/flight/index.vue"),
        meta: {
          menuKey: "flight",
          title: "flights",
          icon: "el-icon-Position",
          keepAlive: true,
          perms: ["resource:flight:list"],
        },
      },
    ],
  },
  {
    path: "/guides",
    name: "GuideManagement",
    component: Layout,
    redirect: "/guides/list",
    meta: { title: "guideManagement", icon: "el-icon-UserFilled", alwaysShow: true },
    children: [
      {
        path: "list",
        name: "Guide",
        component: () => import("@/views/resources/guide/index.vue"),
        meta: {
          menuKey: "guide-people",
          title: "guideList",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["resource:guide:list"],
        },
      },
      {
        path: "leaves",
        name: "GuideLeaves",
        component: () => import("@/views/guides/leaves/index.vue"),
        meta: {
          menuKey: "guide-leaves",
          title: "guideLeaves",
          icon: "el-icon-Calendar",
          perms: ["resource:guide:list"],
        },
      },
      {
        path: "ratings",
        name: "GuideRatings",
        component: () => import("@/views/guides/ratings/index.vue"),
        meta: {
          menuKey: "guide-ratings",
          title: "guideRatings",
          icon: "el-icon-Star",
          perms: ["tour:rating:list"],
        },
      },
    ],
  },
  // 成团表移入数据台账分组，保留原路径、路由名与菜单键；旧 /tours 入口继续可用。
  {
    path: "/tours",
    redirect: "/tours/list",
    meta: { hidden: true },
  },
  {
    path: "/data-ledgers",
    name: "DataLedgers",
    component: Layout,
    redirect: "/tours/list",
    meta: { title: "dataLedgers", icon: "el-icon-Collection", alwaysShow: true },
    children: [
      {
        path: "/tours/list",
        name: "TourList",
        component: () => import("@/views/tours/index.vue"),
        meta: {
          menuKey: "tours",
          title: "tours",
          icon: "el-icon-Document",
          keepAlive: true,
          perms: ["tour:list"],
        },
      },
      {
        path: "shengxu",
        name: "ShengxuLedger",
        component: () => import("@/views/ledgers/shengxu/index.vue"),
        meta: {
          menuKey: "shengxu-ledger",
          title: "shengxuLedger",
          icon: "el-icon-List",
          keepAlive: true,
          scopes: ["headquarters", "shengxu"],
          perms: ["ledger:shengxu:list"],
        },
      },
      {
        path: "website-visits",
        name: "WebsiteVisits",
        component: () => import("@/views/ledgers/website-visits/index.vue"),
        meta: { menuKey: "website-visits", title: "websiteVisits", icon: "el-icon-View", keepAlive: true, scopes: ["headquarters", "website"], perms: ["website:visit:list"] },
      },
      {
        path: "direct",
        name: "DirectLedger",
        component: () => import("@/views/ledgers/direct/index.vue"),
        props: { businessUnit: "linxi" },
        meta: {
          menuKey: "direct-ledger",
          title: "directLedger",
          icon: "el-icon-List",
          keepAlive: true,
          scopes: ["headquarters", "linxi"],
          perms: ["ledger:direct:list"],
        },
      },
      {
        path: "website",
        name: "WebsiteLedger",
        component: () => import("@/views/ledgers/direct/index.vue"),
        props: { businessUnit: "website" },
        meta: {
          menuKey: "website-ledger",
          title: "websiteLedger",
          icon: "el-icon-List",
          keepAlive: true,
          scopes: ["headquarters", "website"],
          perms: ["ledger:direct:list"],
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
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: constantRoutes,
  // 刷新时，滚动条位置还原
  scrollBehavior: () => ({ left: 0, top: 0 }),
});

// 全局注册 router
export function setupRouter(app: App<Element>) {
  app.use(router);
}

export default router;
