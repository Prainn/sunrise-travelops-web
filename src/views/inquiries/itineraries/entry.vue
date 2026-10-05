<template>
  <WebsiteItineraryWorkspace v-if="isWebsiteModule && canAccessWorkspace" />
  <LegacyItineraryWorkspace v-else-if="!isWebsiteModule && canAccessWorkspace" />
  <Page401 v-else />
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";
import { useRoute } from "vue-router";
import { hasRouteAccess } from "@/router/access";
import { useUserStore } from "@/stores/user";
import Page401 from "@/views/error/401.vue";

defineOptions({ name: "InquiryItinerariesEntry" });

const WebsiteItineraryWorkspace = defineAsyncComponent(
  () => import("@/views/website-inquiries/itineraries/index.vue"),
);
const LegacyItineraryWorkspace = defineAsyncComponent(() => import("./index.vue"));
const route = useRoute();
const userStore = useUserStore();
const isWebsiteModule = computed(() => route.query.module === "website");
const canAccessWorkspace = computed(() =>
  hasRouteAccess(
    isWebsiteModule.value
      ? { scopes: ["website", "headquarters"], perms: ["website:itinerary:list"] }
      : { perms: ["itinerary:list"] },
    userStore.userInfo,
  ),
);
</script>
