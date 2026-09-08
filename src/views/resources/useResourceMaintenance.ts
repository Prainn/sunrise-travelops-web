import { computed, onMounted, reactive, ref, type Ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { useI18n } from "vue-i18n";
import type { ResourceListQuery, ResourceStatus, TourismResourceRecord } from "@/types/resource";
import type { ResourceCrud } from "@/services/resource.service";

interface ResourceMaintenanceRecord {
  id: string;
  code: string;
  status: ResourceStatus;
}

interface ResourceMaintenanceOptions<T extends ResourceMaintenanceRecord> {
  records: T[];
  codePrefix: string;
  createEmpty: () => T;
  api: ResourceCrud<T>;
  loadRecords: (query?: ResourceListQuery) => Promise<T[]>;
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
  let activeQuery: ResourceListQuery | undefined;

  async function loadRecords(query?: ResourceListQuery) {
    if (query !== undefined) activeQuery = query;
    try {
      await options.loadRecords(activeQuery);
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  }

  function openCreateDialog() {
    editingId.value = "";
    record.value = {
      ...options.createEmpty(),
      code: `${options.codePrefix}-${crypto.randomUUID()}`,
    };
    isDialogVisible.value = true;
  }

  async function openEditDialog(row: T) {
    try {
      const detail = await options.api.getDetail(row.id);
      editingId.value = row.id;
      record.value = options.cloneForEdit?.(detail) ?? { ...detail };
      isDialogVisible.value = true;
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function toggleStatus(row: T) {
    try {
      const updated = await options.api.update(row.id, {
        ...row,
        status: row.status === "enabled" ? "disabled" : "enabled",
      });
      Object.assign(row, updated);
      await loadRecords();
      ElMessage.success(t("common.updateSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  }

  async function saveRecord(value: T) {
    try {
      const current = rows.find((item) => item.id === editingId.value);
      const saved = editingId.value
        ? await options.api.update(editingId.value, value)
        : await options.api.create(value);
      if (current) {
        if (options.updateRecord) options.updateRecord(current, saved);
        else Object.assign(current, saved);
      } else if (!editingId.value) {
        rows.push(options.createRecord?.(saved, saved.id) ?? saved);
      }
      await loadRecords();
      isDialogVisible.value = false;
      ElMessage.success(t(editingId.value ? "common.updateSuccess" : "common.createSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
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

    try {
      await options.api.deleteByIds(row.id);
      const index = rows.findIndex((item) => item.id === row.id);
      if (index >= 0) rows.splice(index, 1);
      await loadRecords();
      ElMessage.success(t("common.deleteSuccess"));
    } catch (error) {
      ElMessage.error(error instanceof Error ? error.message : String(error));
    }
  }

  onMounted(loadRecords);

  return {
    rows, record, isDialogVisible, isEditing,
    loadRecords, openCreateDialog, openEditDialog, toggleStatus, saveRecord, deleteRecord,
  };
}
