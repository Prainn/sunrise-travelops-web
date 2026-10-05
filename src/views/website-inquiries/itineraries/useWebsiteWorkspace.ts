import { computed, ref, watch } from "vue";
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  websiteErrorMessage,
  websiteService,
  websiteItineraryInput,
} from "@/services/website.service";
import { useUserStore } from "@/stores/user";
import { hasUserPermission } from "@/utils/permission";
import type {
  WebsiteConfig,
  WebsiteInquiry,
  WebsiteItinerary,
  WebsitePreview,
  WebsiteQuotation,
} from "@/types/website";
import { cloneWebsiteDraft, emptyDay, emptyItinerary } from "../options";
import { printWebsiteQuotation } from "./print";

export function useWebsiteWorkspace() {
  const route = useRoute();
  const user = useUserStore();
  const inquiry = ref<WebsiteInquiry>();
  const plans = ref<WebsiteItinerary[]>([]);
  const plan = ref<WebsiteItinerary>();
  const config = ref<WebsiteConfig>();
  const currentConfig = ref<WebsiteConfig>();
  const loading = ref(false);
  const saving = ref(false);
  const error = ref("");
  const baseline = ref("");
  const preview = ref<WebsitePreview>();
  const previewVisible = ref(false);
  const quotation = ref<WebsiteQuotation>();
  const skeletonId = ref("");
  let generation = 0;
  const ended = computed(
    () => inquiry.value?.status === "lost" || inquiry.value?.status === "archived",
  );
  const can = (permission: string) => hasUserPermission(user.userInfo, permission);
  const editable = computed(
    () => plan.value?.status === "draft" && !ended.value && can("website:itinerary:update"),
  );
  const canCreate = computed(() => !ended.value && can("website:itinerary:create"));
  const canConfirm = computed(
    () => plan.value?.status === "draft" && !ended.value && can("website:itinerary:confirm"),
  );
  const canDownload = computed(() => can("website:itinerary:download"));
  const dirty = computed(() =>
    Boolean(plan.value && JSON.stringify(websiteItineraryInput(plan.value)) !== baseline.value),
  );
  function showError(cause: unknown) {
    ElMessage.error(websiteErrorMessage(cause));
  }
  async function allowDiscard() {
    if (!dirty.value) return true;
    try {
      await ElMessageBox.confirm("当前行程有未保存修改，继续将丢弃这些修改。", "未保存修改", {
        confirmButtonText: "丢弃并继续",
        cancelButtonText: "继续编辑",
        type: "warning",
      });
      return true;
    } catch {
      return false;
    }
  }
  async function setPlan(record: WebsiteItinerary, currentGeneration = generation) {
    const versionConfig =
      record.configVersion === currentConfig.value?.version
        ? currentConfig.value
        : await websiteService.config(record.configVersion);
    if (currentGeneration !== generation) return;
    config.value = versionConfig;
    plan.value = cloneWebsiteDraft(record);
    baseline.value = JSON.stringify(websiteItineraryInput(record));
    preview.value = undefined;
    quotation.value = undefined;
    skeletonId.value = "";
  }
  async function load() {
    const current = ++generation;
    loading.value = true;
    error.value = "";
    plan.value = undefined;
    plans.value = [];
    baseline.value = "";
    try {
      const id = String(route.params.inquiryId);
      const [record, records, latestConfig] = await Promise.all([
        websiteService.inquiry(id),
        websiteService.itineraries(id),
        websiteService.config(),
      ]);
      if (current !== generation) return;
      inquiry.value = record;
      plans.value = records;
      currentConfig.value = latestConfig;
      config.value = latestConfig;
      const requested = String(route.query.itineraryId ?? "");
      const selected =
        records.find((item) => item.id === requested) ??
        records.find((item) => item.status === "draft") ??
        records[0];
      if (selected) await setPlan(selected, current);
    } catch (cause) {
      if (current === generation) error.value = websiteErrorMessage(cause);
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  async function selectPlan(id: string) {
    if (saving.value || !(await allowDiscard())) return;
    const record = plans.value.find((item) => item.id === id);
    if (!record) return;
    loading.value = true;
    const current = ++generation;
    try {
      await setPlan(record, current);
    } catch (cause) {
      showError(cause);
    } finally {
      if (current === generation) loading.value = false;
    }
  }
  async function storeResult(record: WebsiteItinerary, refreshInquiry = false) {
    const index = plans.value.findIndex((item) => item.id === record.id);
    if (index >= 0) plans.value.splice(index, 1, record);
    else plans.value.unshift(record);
    await setPlan(record);
    if (refreshInquiry && inquiry.value)
      inquiry.value = await websiteService.inquiry(inquiry.value.id);
  }
  async function save() {
    if (!plan.value || !editable.value || saving.value) return false;
    if (!plan.value.title.trim()) {
      ElMessage.error("请填写行程标题");
      return false;
    }
    if (
      plan.value.days.some(
        (day) =>
          !day.departCityId ||
          !day.endCityId ||
          day.legs.some((leg) => !leg.fromCityId || !leg.toCityId) ||
          day.hotels.some((hotel) => !hotel.cityId),
      )
    ) {
      ElMessage.error("请补齐每日起止城市、交通段城市和酒店城市后保存");
      return false;
    }
    saving.value = true;
    try {
      await storeResult(await websiteService.saveItinerary(plan.value));
      ElMessage.success("已保存行程草稿");
      return true;
    } catch (cause) {
      showError(cause);
      return false;
    } finally {
      saving.value = false;
    }
  }
  async function create() {
    if (!inquiry.value || !canCreate.value || saving.value || !(await allowDiscard())) return;
    let title: string;
    try {
      const result = await ElMessageBox.prompt("请输入新行程标题", "新增独立站行程", {
        inputValue: `${inquiry.value.customerName}行程`,
        inputValidator: (value) => Boolean(value?.trim()) || "请填写标题",
        confirmButtonText: "创建",
        cancelButtonText: "取消",
      });
      title = result.value;
    } catch {
      return;
    }
    saving.value = true;
    try {
      const latest = await websiteService.config();
      currentConfig.value = latest;
      await storeResult(
        await websiteService.createItinerary(inquiry.value.id, {
          ...emptyItinerary(inquiry.value, latest.version),
          title,
          inquiryVersion: inquiry.value.version,
        }),
        true,
      );
      ElMessage.success("已创建草稿，请手工添加每日安排或选择已维护的城市骨架");
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  async function copy() {
    if (!plan.value || !canCreate.value || saving.value || !(await allowDiscard())) return;
    saving.value = true;
    try {
      await storeResult(
        await websiteService.copyItinerary(plan.value.id, plan.value.version),
        true,
      );
      ElMessage.success("已复制为独立草稿，原报价保持锁定");
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  async function reset() {
    if (!plan.value || !(await allowDiscard())) return;
    const record = plans.value.find((item) => item.id === plan.value?.id);
    if (record) await setPlan(record);
  }
  async function useCurrentConfig() {
    if (!plan.value || !editable.value || saving.value) return;
    try {
      const latest = await websiteService.config();
      currentConfig.value = latest;
      config.value = latest;
      plan.value.configVersion = latest.version;
      preview.value = undefined;
      ElMessage.info("已切换编辑配置，请核对景点、城市与路线后保存；失效引用须人工改选");
    } catch (cause) {
      showError(cause);
    }
  }
  async function generate() {
    if (!plan.value || !editable.value || !skeletonId.value || saving.value) return;
    if (dirty.value) {
      ElMessage.warning("请先保存行程，再生成草案");
      return;
    }
    try {
      await ElMessageBox.confirm("生成将替换当前草稿的每日安排，是否继续？", "按城市骨架生成", {
        confirmButtonText: "生成",
        cancelButtonText: "取消",
        type: "warning",
      });
    } catch {
      return;
    }
    saving.value = true;
    try {
      await storeResult(
        await websiteService.generateItinerary(plan.value.id, plan.value.version, skeletonId.value),
      );
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  async function openPreview() {
    if (!plan.value || saving.value) return;
    if (dirty.value) {
      ElMessage.warning("请先保存行程，再预览已保存版本");
      return;
    }
    saving.value = true;
    try {
      if (plan.value.status === "quoted") {
        quotation.value = await websiteService.quotation(plan.value.id);
        preview.value = quotation.value;
      } else preview.value = await websiteService.preview(plan.value.id);
      previewVisible.value = true;
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  async function confirm(codes: string[]) {
    if (!preview.value || !canConfirm.value || saving.value || dirty.value) return;
    saving.value = true;
    try {
      const confirmed = await websiteService.confirm(preview.value, codes);
      if (plan.value) {
        const record = await websiteService.itinerary(plan.value.id);
        await storeResult(record, true);
      }
      quotation.value = confirmed;
      preview.value = confirmed;
      ElMessage.success("已冻结英文客户版与中文内部版");
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  async function print(language: "en" | "zh") {
    if (!quotation.value || !canDownload.value || saving.value) return;
    saving.value = true;
    try {
      await printWebsiteQuotation(quotation.value, language);
    } catch (cause) {
      showError(cause);
    } finally {
      saving.value = false;
    }
  }
  function addDay() {
    if (plan.value && editable.value) plan.value.days.push(emptyDay(plan.value.days.length + 1));
  }
  function removeDay(index: number) {
    plan.value?.days.splice(index, 1);
    renumber();
  }
  function moveDay(index: number, direction: number) {
    const item = plan.value?.days.splice(index, 1)[0];
    if (item) plan.value?.days.splice(index + direction, 0, item);
    renumber();
  }
  function renumber() {
    plan.value?.days.forEach((day, index) => {
      day.dayNumber = index + 1;
    });
  }
  watch(
    () => route.params.inquiryId,
    () => void load(),
    { immediate: true },
  );
  onBeforeRouteLeave(() => allowDiscard());
  onBeforeRouteUpdate((to, from) =>
    to.params.inquiryId !== from.params.inquiryId || to.query.module !== from.query.module
      ? allowDiscard()
      : true,
  );
  return {
    inquiry,
    plans,
    plan,
    config,
    currentConfig,
    loading,
    saving,
    error,
    dirty,
    editable,
    canCreate,
    canConfirm,
    canDownload,
    preview,
    previewVisible,
    quotation,
    skeletonId,
    save,
    create,
    copy,
    reset,
    selectPlan,
    useCurrentConfig,
    generate,
    openPreview,
    confirm,
    print,
    addDay,
    removeDay,
    moveDay,
  };
}
