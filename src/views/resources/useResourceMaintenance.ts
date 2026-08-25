import { computed, reactive, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import { tourismResources, type TourismResourceRecord, type TourismResourceType } from "@/data/data";

const resourceStore = reactive(tourismResources);

export function useResourceMaintenance(type: TourismResourceType, prefix: string) {
  const { t } = useI18n();
  const rows = computed(() => resourceStore[type]);
  const isDialogVisible = ref(false);
  const editingId = ref("");
  const record = ref<TourismResourceRecord>(createEmptyRecord());
  const isEditing = computed(() => Boolean(editingId.value));

  function createEmptyRecord(): TourismResourceRecord {
    return {
      id: "", code: "", name: "", city: "", countryOrRegion: "", contact: "", email: "", phone: "", status: "enabled", remark: "",
    };
  }

  function generateCode() {
    const maxSequence = rows.value.reduce((max, item) => {
      const match = item.code.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    return `${prefix}-${String(maxSequence + 1).padStart(3, "0")}`;
  }

  function openCreateDialog() {
    editingId.value = "";
    record.value = { ...createEmptyRecord(), code: generateCode() };
    isDialogVisible.value = true;
  }

  function openEditDialog(row: TourismResourceRecord) {
    editingId.value = row.id;
    record.value = { ...row };
    isDialogVisible.value = true;
  }

  function toggleStatus(row: TourismResourceRecord) {
    row.status = row.status === "enabled" ? "disabled" : "enabled";
    ElMessage.success(t("common.updateSuccess"));
  }

  function saveRecord(value: TourismResourceRecord) {
    if (editingId.value) {
      const current = rows.value.find((item) => item.id === editingId.value);
      if (current) Object.assign(current, value);
    } else {
      rows.value.push({ ...value, id: `${type}-${Date.now()}` });
    }
    isDialogVisible.value = false;
    ElMessage.success(t(editingId.value ? "common.updateSuccess" : "common.createSuccess"));
  }

  async function deleteRecord(row: TourismResourceRecord) {
    try {
      await ElMessageBox.confirm(t("common.deleteConfirm"), t("common.tip"), { type: "warning" });
    } catch {
      return;
    }

    const index = rows.value.findIndex((item) => item.id === row.id);
    if (index < 0) return;
    rows.value.splice(index, 1);
    ElMessage.success(t("common.deleteSuccess"));
  }

  return { rows, record, isDialogVisible, isEditing, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord };
}
