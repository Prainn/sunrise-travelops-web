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
  ChatLineSquare,
  Collection,
  Document,
  Food,
  Grid,
  House,
  OfficeBuilding,
  Place,
  Promotion,
  Setting,
  User,
  UserFilled,
  Van,
} from "@element-plus/icons-vue";
import { setupPermissionGuard } from "@/router/guards/permission";

const app = createApp(App);

setupDirective(app);
setupStore(app);
setupI18n(app);
setupRouter(app);

const routeIcons = {
  Briefcase,
  ChatLineSquare,
  Collection,
  Document,
  Food,
  Grid,
  House,
  OfficeBuilding,
  Place,
  Promotion,
  Setting,
  User,
  UserFilled,
  Van,
};

Object.entries(routeIcons).forEach(([name, component]) => app.component(name, component));

setupPermissionGuard();

app.mount("#app");
