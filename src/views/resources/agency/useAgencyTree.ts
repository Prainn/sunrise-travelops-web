import { computed, onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { ElMessage } from "element-plus";
import { resourceService } from "@/services/resource.service";
import type { AgencyRecord } from "@/types/resource";
import { RESOURCE_PAGE_SIZE } from "../useResourcePagination";

interface AgencyBranch {
  rows: AgencyRecord[];
  page: number;
  total: number;
  loading: boolean;
}

export type AgencyTreeNode =
  | { id: string; agency: AgencyRecord; children?: AgencyTreeNode[] }
  | { id: string; parentId: string; loading: boolean };

export function useAgencyTree() {
  const api = resourceService.agencyApi;
  const roots = ref<AgencyRecord[]>([]);
  const results = ref<AgencyRecord[]>([]);
  const branches = reactive(new Map<string, AgencyBranch>());
  const expandedIds = ref<string[]>([]);
  const keyword = ref("");
  const rootPage = ref(1);
  const searchPage = ref(1);
  const rootTotal = ref(0);
  const searchTotal = ref(0);
  const rootLoading = ref(false);
  const searchLoading = ref(false);
  const selectedAgency = ref<AgencyRecord>();
  const contactsLoading = ref(false);
  let rootRequest = 0;
  let searchRequest = 0;
  let contactRequest = 0;
  let active = true;

  const searching = computed(() => Boolean(keyword.value));
  const page = computed(() => searching.value ? searchPage.value : rootPage.value);
  const total = computed(() => searching.value ? searchTotal.value : rootTotal.value);
  const loading = computed(() => searching.value ? searchLoading.value : rootLoading.value);
  const visibleAgencies = computed(() => searching.value ? results.value : roots.value.flatMap(
    (agency) => [agency, ...(expandedIds.value.includes(agency.id)
      ? branches.get(agency.id)?.rows ?? [] : [])],
  ));
  const treeRows = computed<AgencyTreeNode[]>(() => {
    if (searching.value) return results.value.map((agency) => ({ id: agency.id, agency }));
    return roots.value.map((agency) => {
      const branch = branches.get(agency.id);
      const children: AgencyTreeNode[] = (branch?.rows ?? []).map((child) => ({
        id: child.id, agency: child,
      }));
      if ((branch?.total ?? agency.childCount) > (branch?.rows.length ?? 0)) {
        children.push({ id: `${agency.id}:more`, parentId: agency.id, loading: branch?.loading ?? false });
      }
      return { id: agency.id, agency, children };
    });
  });

  function showError(error: unknown) {
    if (active) ElMessage.error(error instanceof Error ? error.message : String(error));
  }

  async function selectAgency(agency: AgencyRecord) {
    if (selectedAgency.value === agency) return;
    const request = ++contactRequest;
    selectedAgency.value = agency;
    contactsLoading.value = true;
    try {
      const contacts = await api.getContacts(agency.id);
      if (!active || request !== contactRequest) return;
      agency.contacts = contacts;
      agency.contactCount = contacts.length;
    } catch (error) {
      if (request === contactRequest) showError(error);
    } finally {
      if (active && request === contactRequest) contactsLoading.value = false;
    }
  }

  function selectVisible(preferredId = selectedAgency.value?.id) {
    const agency = visibleAgencies.value.find((row) => row.id === preferredId)
      ?? visibleAgencies.value[0];
    if (agency) void selectAgency(agency);
    else {
      contactRequest++;
      selectedAgency.value = undefined;
      contactsLoading.value = false;
    }
  }

  async function loadRoots() {
    const request = ++rootRequest;
    rootLoading.value = true;
    try {
      const result = await api.getPage({ page: rootPage.value, pageSize: RESOURCE_PAGE_SIZE, parentOnly: "true" });
      if (!active || request !== rootRequest) return;
      rootTotal.value = result.total;
      const lastPage = Math.max(1, Math.ceil(result.total / RESOURCE_PAGE_SIZE));
      if (rootPage.value > lastPage) {
        rootPage.value = lastPage;
        await loadRoots();
      } else roots.value = result.list;
    } finally {
      if (active && request === rootRequest) rootLoading.value = false;
    }
  }

  async function loadSearch() {
    const request = ++searchRequest;
    searchLoading.value = true;
    try {
      const result = await api.getPage({ page: searchPage.value, pageSize: RESOURCE_PAGE_SIZE, keyword: keyword.value });
      if (!active || request !== searchRequest) return;
      searchTotal.value = result.total;
      const lastPage = Math.max(1, Math.ceil(result.total / RESOURCE_PAGE_SIZE));
      if (searchPage.value > lastPage) {
        searchPage.value = lastPage;
        await loadSearch();
      } else results.value = result.list;
    } finally {
      if (active && request === searchRequest) searchLoading.value = false;
    }
  }

  async function loadBranch(parentId: string, refresh = false) {
    const previous = branches.get(parentId);
    if (previous?.loading && !refresh) return;
    const branch = reactive<AgencyBranch>({
      rows: previous?.rows ?? [],
      page: previous?.page ?? 0,
      total: previous?.total ?? roots.value.find((agency) => agency.id === parentId)?.childCount ?? 0,
      loading: true,
    });
    branches.set(parentId, branch);
    try {
      const nextPage = refresh ? 1 : branch.page + 1;
      const result = await api.getPage({ parentId, page: nextPage, pageSize: RESOURCE_PAGE_SIZE });
      if (!active || branches.get(parentId) !== branch) return;
      let rows = result.list;
      let loadedPage = nextPage;
      if (refresh) {
        loadedPage = Math.max(1, Math.min(branch.page, Math.ceil(result.total / RESOURCE_PAGE_SIZE)));
        const remainingPages = await Promise.all(Array.from({ length: loadedPage - 1 }, (_, index) =>
          api.getPage({ parentId, page: index + 2, pageSize: RESOURCE_PAGE_SIZE }),
        ));
        rows = rows.concat(remainingPages.flatMap((result) => result.list));
      }
      if (!active || branches.get(parentId) !== branch) return;
      branch.rows = refresh ? rows : branch.rows.concat(rows);
      branch.total = result.total;
      branch.page = loadedPage;
      const parent = roots.value.find((agency) => agency.id === parentId);
      if (parent) parent.childCount = result.total;
    } catch (error) {
      if (branches.get(parentId) === branch) showError(error);
    } finally {
      if (active && branches.get(parentId) === branch) branch.loading = false;
    }
  }

  function expandNode(node: AgencyTreeNode) {
    if (!("agency" in node)) return;
    if (!expandedIds.value.includes(node.id)) expandedIds.value.push(node.id);
    if (!branches.get(node.id)?.page) void loadBranch(node.id);
  }

  function collapseNode(node: AgencyTreeNode) {
    expandedIds.value = expandedIds.value.filter((id) => id !== node.id);
  }

  async function changeQuery(value: string) {
    const nextKeyword = value.trim();
    keyword.value = nextKeyword;
    searchPage.value = 1;
    searchRequest++;
    try {
      if (searching.value) await loadSearch();
      if (active && keyword.value === nextKeyword) selectVisible();
    } catch (error) { showError(error); }
  }

  async function changePage(value: number) {
    try {
      if (searching.value) { searchPage.value = value; await loadSearch(); }
      else { rootPage.value = value; await loadRoots(); }
      if (active) selectVisible();
    } catch (error) { showError(error); }
  }

  async function refreshAfterChange(saved?: AgencyRecord, previous?: AgencyRecord) {
    const parentIds = new Set([previous?.parentId, saved?.parentId, previous?.parentId ? undefined : previous?.id]);
    await loadRoots();
    if (!active) return;
    for (const parentId of parentIds) {
      if (parentId && branches.has(parentId)) await loadBranch(parentId, true);
    }
    if (searching.value) await loadSearch();
    if (active) selectVisible(saved?.id ?? selectedAgency.value?.id);
  }

  onMounted(async () => {
    try { await loadRoots(); if (active) selectVisible(); }
    catch (error) { showError(error); }
  });
  onBeforeUnmount(() => { active = false; });

  return { treeRows, expandedIds, searching, page, total, loading, selectedAgency, contactsLoading, selectAgency, expandNode, collapseNode, loadBranch, changeQuery, changePage, refreshAfterChange };
}
