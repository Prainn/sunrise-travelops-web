import { createApp } from "vue";
import App from "./App.vue";

import "element-plus/theme-chalk/dark/css-vars.css";
import "@/styles/index.scss";
import "uno.css";
import "animate.css";

import { setupDirective } from "@/directives";
import { setupRouter } from "@/router";
import { setupStore } from "@/stores/store";
import { setupI18n } from "@/lang";
import {
  Briefcase,
  Calendar,
  ChatLineSquare,
  Collection,
  DataAnalysis,
  Document,
  Food,
  Grid,
  House,
  List,
  Lock,
  Location,
  OfficeBuilding,
  Place,
  Position,
  Promotion,
  Setting,
  Star,
  User,
  UserFilled,
  Van,
} from "@element-plus/icons-vue";
import { setupPermissionGuard } from "@/router/guards/permission";
import { setupPageUnloadConfirmation } from "@/utils/page-lifecycle";
import { setupAuthSessionSync } from "@/utils/auth-storage";

const app = createApp(App);

setupPageUnloadConfirmation();
setupAuthSessionSync();

setupDirective(app);
setupStore(app);
setupI18n(app);
setupRouter(app);

const routeIcons = {
  Briefcase,
  Calendar,
  ChatLineSquare,
  Collection,
  DataAnalysis,
  Document,
  Food,
  Grid,
  House,
  List,
  Lock,
  Location,
  OfficeBuilding,
  Place,
  Position,
  Promotion,
  Setting,
  Star,
  User,
  UserFilled,
  Van,
};

Object.entries(routeIcons).forEach(([name, component]) => app.component(name, component));

setupPermissionGuard();

app.mount("#app");
