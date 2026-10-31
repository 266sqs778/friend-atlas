import { $, $$ } from "../lib/dom.js";
import { PROVINCES, RELATIONSHIPS } from "../data/provinces.js";
import { countActiveFilters, createFilters, toggleValue } from "../lib/filters.js";

export function createFilterBar({ onChange }) {
  const search = $("#search");
  const relationshipHost = $("#filter-relationship");
  const genderHost = $("#filter-gender");
  const provinceSelect = $("#filter-province");
  const sortSelect = $("#sort");
  const resetButton = $("#btn-reset-filters");
  const countLabel = $("#filter-count");

  relationshipHost.innerHTML = RELATIONSHIPS.map(
    (name) => `<button class="chip" type="button" data-relationship="${name}" aria-pressed="false">${name}</button>`
  ).join("");

  provinceSelect.innerHTML =
    '<option value="">全部省份</option>' +
    PROVINCES.map((province) => `<option value="${province}">${province}</option>`).join("");

  let filters = createFilters();
  let sort = "recent";
  let keywordTimer = null;

  const emit = (patch = {}) => {
    if (patch.filters) filters = patch.filters;
    if (patch.sort) sort = patch.sort;
    onChange({ filters, sort });
  };

  relationshipHost.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-relationship]");
    if (!chip) return;
    emit({
      filters: { ...filters, relationships: toggleValue(filters.relationships, chip.dataset.relationship) }
    });
  });

  genderHost.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-gender]");
    if (!chip) return;
    emit({ filters: { ...filters, genders: toggleValue(filters.genders, chip.dataset.gender) } });
  });

  provinceSelect.addEventListener("change", () => {
    emit({ filters: { ...filters, province: provinceSelect.value } });
  });

  sortSelect.addEventListener("change", () => emit({ sort: sortSelect.value }));

  search.addEventListener("input", () => {
    clearTimeout(keywordTimer);
    keywordTimer = setTimeout(() => {
      emit({ filters: { ...filters, keyword: search.value } });
    }, 120);
  });

  search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      search.value = "";
      emit({ filters: { ...filters, keyword: "" } });
      search.blur();
    }
  });

  resetButton.addEventListener("click", () => {
    search.value = "";
    emit({ filters: createFilters(), sort: "recent" });
    sortSelect.value = "recent";
  });

  function syncPressed(host, attribute, values) {
    $$(`[${attribute}]`, host).forEach((chip) => {
      const isPressed = values.includes(chip.getAttribute(attribute));
      chip.setAttribute("aria-pressed", String(isPressed));
    });
  }

  function update({ filters: nextFilters, sort: nextSort, visibleCount = 0, totalCount = 0 }) {
    filters = nextFilters;
    sort = nextSort;

    if (search.value !== filters.keyword) search.value = filters.keyword;
    syncPressed(relationshipHost, "data-relationship", filters.relationships);
    syncPressed(genderHost, "data-gender", filters.genders);
    if (provinceSelect.value !== filters.province) provinceSelect.value = filters.province;
    if (sortSelect.value !== sort) sortSelect.value = sort;

    const active = countActiveFilters(filters);
    countLabel.textContent = active
      ? `已筛选 ${visibleCount} / ${totalCount} 条`
      : `共 ${totalCount} 条记录`;
  }

  function focusSearch() {
    search.focus();
    search.select();
  }

  return { update, focusSearch };
}
