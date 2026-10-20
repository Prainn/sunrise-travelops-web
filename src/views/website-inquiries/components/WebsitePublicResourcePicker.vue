<template>
  <div class="website-public-picker flex flex-col gap-3">
    <el-form label-position="top" class="grid grid-cols-2 gap-x-4 max-[650px]:grid-cols-1" @submit.prevent>
      <el-form-item :label="$t('websiteItineraryUi.publicCity')">
        <WebsiteResourceSelect
          :model-value="cityId"
          kind="city"
          :selected-name="cityName"
          :placeholder="$t('websiteItineraryUi.publicCityPlaceholder')"
          @update:model-value="(id) => !id && changeCity(null)"
          @select="changeCity"
        />
      </el-form-item>
      <el-form-item :label="$t('common.keywords')">
        <el-input
          v-model="keyword"
          clearable
          :placeholder="$t('websiteItineraryUi.publicKeywordPlaceholder')"
          @keyup.enter="fetchFirstPage"
          @clear="fetchFirstPage"
        >
          <template #append>
            <el-button :icon="Search" :aria-label="$t('common.search')" @click="fetchFirstPage" />
          </template>
        </el-input>
      </el-form-item>
    </el-form>
    <p class="m-0 text-[12px] text-muted">
      {{ $t(cityHintKey) }}
    </p>
    <DataTable
      :data="rows"
      row-key="id"
      size="small"
      :loading="loading"
      :height="260"
      :filtered="Boolean(cityName || keyword.trim())"
      :error="error"
      highlight-current-row
      :current-row-key="modelValue ?? undefined"
      @retry="fetchPage"
      @row-click="pick"
    >
      <el-table-column width="48" align="center">
        <template #default="{ row }">
          <el-radio
            :model-value="modelValue ?? undefined"
            :value="row.id"
            :aria-label="row.name"
            @change="pick(row as WebsiteResourceOption)"
          />
        </template>
      </el-table-column>
      <el-table-column :label="$t('websiteItineraryUi.publicResourceName')" prop="name" min-width="200" />
      <el-table-column :label="$t('websiteItineraryUi.publicCity')" prop="city" min-width="120" />
    </DataTable>
    <Pagination
      v-model:page="page"
      v-model:limit="pageSize"
      variant="compact"
      :page-sizes="[10, 20, 50]"
      :total="total"
      @pagination="fetchPage"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { Search } from "@element-plus/icons-vue";
import DataTable from "@/components/DataTable/index.vue";
import Pagination from "@/components/Pagination/index.vue";
import {
  websiteErrorMessage,
  websiteService,
  type WebsiteResourceOption,
} from "@/services/website.service";
import WebsiteResourceSelect from "./WebsiteResourceSelect.vue";

/**
 * 公共酒店/餐厅选择：公共城市取自 kind=city 的分页结果，按其名称做服务端城市筛选与分页。
 *
 * 独立站配置城市只通过明确的 resourceId 关联预选公共城市，不用中英文名称猜测；
 * 公共城市筛选只影响本次查询，不修改当天住宿城市或专属配置。
 */
const props = defineProps<{
  kind: "hotel" | "restaurant";
  /** 当前暂存的公共资源 ID */
  modelValue: string | null;
  /** 当天配置城市关联的公共城市 ID */
  linkedCityId: string | null;
}>();
const emit = defineEmits<{
  "update:modelValue": [value: string | null];
  select: [value: WebsiteResourceOption | undefined];
}>();

const cityId = ref<string | null>(null);
const cityName = ref("");
const isLinkedCityMissing = ref(false);
const keyword = ref("");
const page = ref(1);
const pageSize = ref(10);
const total = ref(0);
const rows = ref<WebsiteResourceOption[]>([]);
const loading = ref(false);
const error = ref("");
/** 本次弹窗内新点选的候选；保存快照中的原值不在当前页时不视为失效 */
const picked = ref<WebsiteResourceOption>();
let generation = 0;

const cityHintKey = computed(() => {
  if (cityName.value) return "websiteItineraryUi.publicCityFiltered";
  return props.linkedCityId && isLinkedCityMissing.value
    ? "websiteItineraryUi.publicCityNotFound"
    : props.linkedCityId
      ? "websiteItineraryUi.publicCityUnfiltered"
      : "websiteItineraryUi.publicCityNotLinked";
});

function changeCity(option: WebsiteResourceOption | undefined | null) {
  cityId.value = option?.id ?? null;
  cityName.value = option?.name ?? "";
  // 切换城市后清除不再匹配的待确认选择。
  if (picked.value && cityName.value && picked.value.city !== cityName.value) {
    picked.value = undefined;
    emit("update:modelValue", null);
    emit("select", undefined);
  }
  void fetchFirstPage();
}

function pick(row: WebsiteResourceOption) {
  picked.value = row;
  emit("update:modelValue", row.id);
  emit("select", row);
}

async function fetchFirstPage() {
  page.value = 1;
  await fetchPage();
}

async function fetchPage() {
  const current = ++generation;
  loading.value = true;
  error.value = "";
  try {
    const result = await websiteService.resources(props.kind, {
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value,
      city: cityName.value,
    });
    // 旧城市或旧关键词的迟到响应不得覆盖新结果。
    if (current !== generation) return;
    rows.value = result.list;
    total.value = result.total;
  } catch (cause) {
    if (current !== generation) return;
    rows.value = [];
    total.value = 0;
    error.value = websiteErrorMessage(cause);
  } finally {
    if (current === generation) loading.value = false;
  }
}

/**
 * 读取一页公共城市，仅在其中存在关联 ID 的记录时预选；不遍历全库，也没有按 ID 查询的端点。
 */
async function preselectLinkedCity(token: number) {
  if (!props.linkedCityId) return;
  try {
    const result = await websiteService.resources("city", { page: 1, pageSize: 100 });
    if (token !== generation) return;
    const city = result.list.find((row) => row.id === props.linkedCityId);
    if (city) {
      cityId.value = city.id;
      cityName.value = city.name;
    } else isLinkedCityMissing.value = true;
  } catch {
    isLinkedCityMissing.value = true;
  }
}

onMounted(async () => {
  const current = generation;
  await preselectLinkedCity(current);
  // 用户在预选完成前已主动查询时，不再覆盖其条件。
  if (current === generation) await fetchFirstPage();
});
</script>
