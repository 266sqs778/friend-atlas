import { $, $$ } from "./lib/dom.js";
import { applyTheme, resolveInitialTheme, setTheme } from "./lib/theme.js";
import { createFilters } from "./lib/filters.js";
import { filterFriends, isFilterActive, sortFriends } from "./lib/filters.js";
import { computeOverview, drillDown } from "./lib/stats.js";
import { loadFriends, saveFriends } from "./lib/storage.js";
import { dedupeFriends } from "./lib/model.js";
import { downloadFile, friendsToCSV, friendsToJSON, timestampForFilename } from "./lib/csv.js";
import { DEMO_FRIENDS } from "./data/demo-friends.js";
import { createSheets, confirmDialog, showToast } from "./features/overlays.js";
import { createMapView } from "./features/map-view.js";
import { createNetworkView } from "./features/network-view.js";
import { createAnalyticsView } from "./features/analytics-view.js";
import { createListView, createDrillView, createSummaryViews } from "./features/list-view.js";
import { createFilterBar } from "./features/filter-bar.js";
import { createFriendSheet } from "./features/friend-sheet.js";
import { createImportSheet } from "./features/import-sheet.js";
import { normalizeFriend } from "./lib/model.js";

const state = {
  friends: [],
  filters: createFilters(),
  sort: "recent",
  view: "overview",
  theme: "light",
  selectedProvince: ""
};

let mapView;
let networkView;
let analyticsView;
let listView;
let drillView;
let summary;
let filterBar;
let friendSheet;
let importSheet;
let sheets;

/* --------------------------------------------------------------- helpers */

function persist() {
  const result = saveFriends(state.friends);
  if (!result.ok && result.error) showToast(result.error, { type: "error" });
}

function visibleFriends() {
  return sortFriends(filterFriends(state.friends, state.filters), state.sort);
}

function render(meta = {}) {
  const visible = visibleFriends();
  const overview = computeOverview(visible);
  const scoped = { ...state, friends: visible };

  summary.updateKpis(overview);
  mapView.update(scoped, meta);
  drillView.update(state, drillDown(visible, state.selectedProvince));
  listView.update(state, {
    visible,
    total: state.friends.length,
    filtered: isFilterActive(state.filters)
  });
  filterBar.update({
    filters: state.filters,
    sort: state.sort,
    visibleCount: visible.length,
    totalCount: state.friends.length
  });

  if (state.view === "network") networkView.update(scoped, meta);
  if (state.view === "analytics") analyticsView.update(scoped, meta);
}

function setView(view, meta = {}) {
  state.view = view;
  $$(".view").forEach((section) => {
    const active = section.id === `view-${view}`;
    section.classList.toggle("is-active", active);
    section.hidden = !active;
  });
  $$(".segmented__item").forEach((button) => {
    const active = button.dataset.view === view;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });

  render(meta);
  requestAnimationFrame(() => {
    mapView.resize();
    networkView.resize();
    analyticsView.resize();
  });
}

/* ---------------------------------------------------------------- actions */

function toggleTheme() {
  state.theme = setTheme(state.theme === "dark" ? "light" : "dark");
  render({ themeChanged: true });
  showToast(state.theme === "dark" ? "已切换深色外观" : "已切换浅色外观");
}

function openFriendSheet(friend = null) {
  friendSheet.open(friend);
}

function editFriend(id) {
  const friend = state.friends.find((item) => item.id === id);
  if (friend) openFriendSheet(friend);
}

function handleSave(draft, isEditing) {
  if (isEditing) {
    state.friends = state.friends.map((friend) => {
      if (friend.id !== draft.id) return friend;
      return { ...draft, createdAt: friend.createdAt, updatedAt: new Date().toISOString() };
    });
    showToast(`已更新 ${draft.name} 的信息`);
  } else {
    const now = new Date().toISOString();
    state.friends = state.friends.concat({ ...draft, createdAt: now, updatedAt: now });
    showToast(`已添加朋友 ${draft.name}`);
  }
  persist();
  render();
}

async function deleteFriend(id) {
  const friend = state.friends.find((item) => item.id === id);
  if (!friend) return;
  const confirmed = await confirmDialog({
    title: "删除朋友",
    message: `确定要删除「${friend.name}」吗？删除后可在提示条中撤销。`,
    confirmLabel: "删除"
  });
  if (!confirmed) return;

  const index = state.friends.findIndex((item) => item.id === id);
  state.friends = state.friends.filter((item) => item.id !== id);
  if (state.selectedProvince && !state.friends.some((item) => item.province === state.selectedProvince)) {
    state.selectedProvince = "";
  }
  persist();
  render();

  showToast(`已删除 ${friend.name}`, {
    duration: 6500,
    actionLabel: "撤销",
    onAction() {
      const restored = state.friends.slice();
      restored.splice(Math.max(0, index), 0, friend);
      state.friends = restored;
      persist();
      render();
      showToast(`已恢复 ${friend.name}`);
    }
  });
}

async function loadDemoData() {
  if (state.friends.length) {
    const confirmed = await confirmDialog({
      title: "载入示例数据",
      message: `当前有 ${state.friends.length} 条记录，载入示例数据会覆盖它们。是否继续？`,
      confirmLabel: "覆盖并载入"
    });
    if (!confirmed) return;
  }
  state.friends = DEMO_FRIENDS.map(normalizeFriend);
  state.selectedProvince = "";
  persist();
  render();
  showToast("已载入示例数据（人物均为虚构）");
}

async function clearAll() {
  if (!state.friends.length) {
    showToast("当前没有记录可清除", { type: "warn" });
    return;
  }
  const confirmed = await confirmDialog({
    title: "清空全部数据",
    message: `将删除全部 ${state.friends.length} 条记录，此操作不会自动备份。`,
    confirmLabel: "全部清空"
  });
  if (!confirmed) return;
  state.friends = [];
  state.selectedProvince = "";
  persist();
  render();
  showToast("已清空全部数据");
}

function exportData(withJson) {
  if (!state.friends.length) {
    showToast("没有数据可以导出", { type: "warn" });
    return;
  }
  const stamp = timestampForFilename();
  if (withJson) {
    downloadFile(`friend-atlas-backup-${stamp}.json`, friendsToJSON(state.friends), "application/json;charset=utf-8");
    showToast(`已导出 ${state.friends.length} 条 JSON 备份`);
  } else {
    downloadFile(`friend-atlas-${stamp}.csv`, friendsToCSV(state.friends), "text/csv;charset=utf-8");
    showToast(`已导出 ${state.friends.length} 条 CSV 记录`);
  }
}

function handleImport(result) {
  const { fresh, duplicates } = dedupeFriends(result.friends, state.friends);
  if (!fresh.length) {
    showToast("没有新增记录：全部与现有数据重复", { type: "warn" });
    return;
  }
  state.friends = state.friends.concat(fresh);
  persist();
  render();
  const skipped = (result.skipped || []).length;
  const parts = [`已导入 ${fresh.length} 条`];
  if (duplicates) parts.push(`忽略 ${duplicates} 条重复`);
  if (skipped) parts.push(`跳过 ${skipped} 条无效`);
  showToast(parts.join("，"));
}

/* ------------------------------------------------------------------- boot */

function bindToolbar() {
  $("#btn-theme").addEventListener("click", toggleTheme);
  $("#btn-add").addEventListener("click", () => openFriendSheet(null));
  $("#btn-import").addEventListener("click", () => importSheet.open());
  $("#btn-export").addEventListener("click", (event) => exportData(event.shiftKey));
  $("#btn-load-demo").addEventListener("click", loadDemoData);
  const clearButton = $("#btn-clear");
  if (clearButton) clearButton.addEventListener("click", clearAll);

  $$(".segmented__item").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  $$('[role="tab"]').forEach((button) => {
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      const tabs = $$('.segmented__item');
      const index = tabs.indexOf(button);
      const next = tabs[(index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
      next.focus();
      setView(next.dataset.view);
    });
  });

  $("#btn-drill-reset").addEventListener("click", () => {
    state.selectedProvince = "";
    render();
  });
}

function bindKeyboard() {
  document.addEventListener("keydown", (event) => {
    const target = event.target;
    const isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
    if (isTyping) return;
    if (event.metaKey || event.ctrlKey || event.altKey) return;

    if (event.key === "/") {
      event.preventDefault();
      filterBar.focusSearch();
    } else if (event.key.toLowerCase() === "n") {
      event.preventDefault();
      openFriendSheet(null);
    } else if (event.key.toLowerCase() === "t") {
      toggleTheme();
    } else if (event.key === "Escape" && state.selectedProvince) {
      state.selectedProvince = "";
      render();
    }
  });
}

function bindResize() {
  let timer = null;
  window.addEventListener("resize", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      mapView.resize();
      networkView.resize();
      analyticsView.resize();
    }, 160);
  });
}

function bootstrap() {
  state.theme = applyTheme(resolveInitialTheme());

  sheets = createSheets();
  summary = createSummaryViews();
  mapView = createMapView({
    onSelectProvince(province) {
      state.selectedProvince = province;
      render();
    }
  });
  networkView = createNetworkView();
  analyticsView = createAnalyticsView();
  filterBar = createFilterBar({
    onChange({ filters, sort }) {
      state.filters = filters;
      state.sort = sort;
      render();
    }
  });
  listView = createListView({
    onEdit: editFriend,
    onDelete: deleteFriend,
    onLoadDemo: loadDemoData,
    onClearFilters() {
      state.filters = createFilters();
      render();
    }
  });
  drillView = createDrillView({
    onClear() {
      state.selectedProvince = "";
      render();
    },
    onEdit: editFriend,
    onSelect(province) {
      state.selectedProvince = province;
      render();
    }
  });
  friendSheet = createFriendSheet({ sheets, onSave: handleSave });
  importSheet = createImportSheet({ sheets, onImport: handleImport });

  const loaded = loadFriends();
  state.friends = loaded.friends;
  if (loaded.error) showToast(loaded.error, { type: "warn", duration: 6000 });

  bindToolbar();
  bindKeyboard();
  bindResize();

  render();
  setView("overview");

  if (loaded.seeded) {
    setTimeout(() => {
      showToast("已载入一套虚构示例数据，可直接体验全部功能", { duration: 5200 });
    }, 600);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
