import { createApp } from "vue";
import App from "./App.vue";

import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";

import { setupDirective } from "@/directives";
import router, { setupRouter } from "@/router";
import { setupStore } from "@/stores/store";
import { useUserStoreHook } from "@/stores/user";
import { refreshAccessToken } from "@/api/request";
import { setupI18n } from "@/lang";
import {
  Bell,
  Briefcase,
  Calendar,
  ChatDotRound,
  ChatLineSquare,
  Collection,
  Connection,
  DataAnalysis,
  Document,
  Food,
  Grid,
  House,
  Lightning,
  Link,
  List,
  Lock,
  Location,
  Message,
  OfficeBuilding,
  Picture,
  Place,
  Position,
  Promotion,
  Setting,
  Star,
  TrendCharts,
  User,
  UserFilled,
  Van,
  View,
} from "@element-plus/icons-vue";
import { setupOperationNavigation } from "@/utils/user-interaction";
import { setupPermissionGuard } from "@/router/guards/permission";
import { setupPageUnloadConfirmation } from "@/utils/page-lifecycle";
import { setupAuthSessionSync } from "@/utils/auth-storage";
import { setupAccountSwitchSync } from "@/utils/account-switch-runtime";
import { resolveClientPage, setupClientOperationLogLifecycle } from "@/utils/client-operation-log";

const app = createApp(App);

setupPageUnloadConfirmation();
setupAuthSessionSync();

setupDirective(app);
setupStore(app);
setupI18n(app);
setupOperationNavigation(router);
setupRouter(app);
setupAccountSwitchSync();
setupClientOperationLogLifecycle({
  getCurrentPage: () => resolveClientPage(router.currentRoute.value),
  getActorId: () => {
    const info = useUserStoreHook().userInfo;
    return info?.identityId ?? info?.userId;
  },
  refreshToken: (staleToken) => refreshAccessToken(staleToken),
});

const routeIcons = {
  Bell,
  Briefcase,
  Calendar,
  ChatDotRound,
  ChatLineSquare,
  Collection,
  Connection,
  DataAnalysis,
  Document,
  Food,
  Grid,
  House,
  Lightning,
  Link,
  List,
  Lock,
  Location,
  Message,
  OfficeBuilding,
  Picture,
  Place,
  Position,
  Promotion,
  Setting,
  Star,
  TrendCharts,
  User,
  UserFilled,
  Van,
  View,
};

Object.entries(routeIcons).forEach(([name, component]) => app.component(name, component));

setupPermissionGuard();

app.mount("#app");
