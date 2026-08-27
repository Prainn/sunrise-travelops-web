import { computed, reactive, ref, type Ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ResourceStatus, TourismResourceRecord } from "@/types/resource";
import { createId, generateNextCode } from "@/utils";

interface ResourceMaintenanceRecord {
  id: string;
  code: string;
  status: ResourceStatus;
}

interface ResourceMaintenanceOptions<T extends ResourceMaintenanceRecord> {
  records: T[];
  idPrefix: string;
  codePrefix: string;
  createEmpty: () => T;
  cloneForEdit?: (record: T) => T;
  createRecord?: (record: T, id: string) => T;
  updateRecord?: (current: T, record: T) => void;
  deleteConfirmKey?: string;
}

export function createEmptyTourismResourceRecord(): TourismResourceRecord {
  return {
    id: "", code: "", name: "", city: "", countryOrRegion: "", contact: "", email: "", phone: "",
    status: "enabled", remark: "",
  };
}

export function useResourceMaintenance<T extends ResourceMaintenanceRecord>(options: ResourceMaintenanceOptions<T>) {
  const { t } = useI18n();
  const rows = reactive(options.records) as unknown as T[];
  const isDialogVisible = ref(false);
  const editingId = ref("");
  const record = ref<T>(options.createEmpty()) as Ref<T>;
  const isEditing = computed(() => Boolean(editingId.value));

  function openCreateDialog() {
    editingId.value = "";
    record.value = {
      ...options.createEmpty(),
      code: generateNextCode(rows, options.codePrefix),
    };
    isDialogVisible.value = true;
  }

  function openEditDialog(row: T) {
    editingId.value = row.id;
    record.value = options.cloneForEdit?.(row) ?? { ...row };
    isDialogVisible.value = true;
  }

  function toggleStatus(row: T) {
    row.status = row.status === "enabled" ? "disabled" : "enabled";
    ElMessage.success(t("common.updateSuccess"));
  }

  function saveRecord(value: T) {
    const current = rows.find((item) => item.id === editingId.value);
    if (current) {
      if (options.updateRecord) options.updateRecord(current, value);
      else Object.assign(current, value);
    } else {
      const id = createId(options.idPrefix);
      rows.push(options.createRecord?.(value, id) ?? { ...value, id });
    }
    isDialogVisible.value = false;
    ElMessage.success(t(current ? "common.updateSuccess" : "common.createSuccess"));
  }

  async function deleteRecord(row: T) {
    try {
      await ElMessageBox.confirm(
        t(options.deleteConfirmKey ?? "common.deleteConfirm"),
        t("common.tip"),
        { type: "warning" }
      );
    } catch {
      return;
    }

    const index = rows.findIndex((item) => item.id === row.id);
    if (index < 0) return;
    rows.splice(index, 1);
    ElMessage.success(t("common.deleteSuccess"));
  }

  return {
    rows, record, isDialogVisible, isEditing,
    openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord,
  };
}
