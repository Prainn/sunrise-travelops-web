import { fileURLToPath } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

// Resource and itinerary card tests use explicit stubs, without app-wide style generation.
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { "@": fileURLToPath(new URL("../../../", import.meta.url)) } },
  test: {
    include: ["src/views/resources/website/*.test.ts", "src/views/website-inquiries/itineraries/components/WebsiteMealDialog.test.ts", "src/views/website-inquiries/itineraries/components/WebsiteVehiclePrices.test.ts", "src/views/website-inquiries/itineraries/components/WebsiteDayCards.test.ts", "src/views/tours/components/TourGuideAssignmentDialog.test.ts"],
    environment: fileURLToPath(new URL("./vitest.environment.ts", import.meta.url)),
  },
});
