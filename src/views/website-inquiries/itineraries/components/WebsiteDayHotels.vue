<template>
  <section>
    <div class="flex justify-between items-center mb-3">
      <strong>酒店方案</strong>
      <el-button v-if="editable" @click="addHotel">添加酒店</el-button>
    </div>
    <el-alert
      v-if="day.overnightCityId && !day.hotels.length"
      title="本日需要住宿，请至少填写一个酒店名。A／B 档由人工选择，与共用库酒店评级无自动映射。"
      type="info"
      :closable="false"
      class="mb-3"
    />
    <el-card v-for="(hotel, index) in day.hotels" :key="hotel.id" shadow="never" class="mb-3">
      <div class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1">
        <el-form-item label="酒店档次">
          <el-select v-model="hotel.tier">
            <el-option value="A" label="A 高端五星" />
            <el-option value="B" label="B 舒适四星" />
          </el-select>
        </el-form-item>
        <el-form-item label="住宿城市">
          <el-select v-model="hotel.cityId" filterable>
            <el-option
              v-for="city in config.cities"
              :key="city.id"
              :value="city.id"
              :label="city.nameZh"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择共用酒店">
          <WebsiteResourceSelect
            v-model="hotel.resourceId"
            kind="hotel"
            :selected-name="hotel.nameZh"
            @select="
              (resource) => {
                if (resource) hotel.nameZh = resource.name;
              }
            "
          />
        </el-form-item>
        <el-form-item label="该酒店方案含早">
          <el-switch v-model="hotel.breakfastIncluded" />
        </el-form-item>
        <el-form-item label="酒店中文名称">
          <el-input v-model="hotel.nameZh" maxlength="150" />
        </el-form-item>
        <el-form-item label="酒店英文名称">
          <el-input v-model="hotel.nameEn" maxlength="150" />
        </el-form-item>
        <el-form-item label="房型">
          <el-input v-model="hotel.roomType" placeholder="例如 Twin Room" maxlength="200" />
        </el-form-item>
      </div>
      <el-button v-if="editable" link type="danger" @click="day.hotels.splice(index, 1)"
        >移除酒店</el-button
      >
    </el-card>
  </section>
</template>
<script setup lang="ts">
import type { WebsiteConfig, WebsiteDay } from "@/types/website";
import WebsiteResourceSelect from "../../components/WebsiteResourceSelect.vue";
const props = defineProps<{ day: WebsiteDay; config: WebsiteConfig; editable: boolean }>();
function addHotel() {
  props.day.hotels.push({
    id: crypto.randomUUID(),
    tier: "A",
    cityId: props.day.overnightCityId ?? props.day.endCityId,
    resourceId: null,
    nameZh: "",
    nameEn: "",
    roomType: "",
    breakfastIncluded: true,
  });
}
</script>
