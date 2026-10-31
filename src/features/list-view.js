import { $, escapeHtml } from "../lib/dom.js";
import { ageOf, formatBirthday, initialOf } from "../lib/format.js";
import { RELATIONSHIP_COLORS } from "../lib/theme.js";

const RELATIONSHIP_CLASS = {
  "朋友": "friend",
  "同学": "classmate",
  "同事": "colleague",
  "亲戚": "relative",
  "合作伙伴": "partner",
  "其他": "other"
};

const GENDER_CLASS = { "男": "male", "女": "female" };

export function createListView({ onEdit, onDelete, onLoadDemo, onClearFilters }) {
  const list = $("#friend-list");
  const sub = $("#list-sub");

  list.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]");
    if (action) {
      const row = action.closest("[data-id]");
      const id = row ? row.dataset.id : "";
      if (action.dataset.action === "edit") onEdit(id);
      else if (action.dataset.action === "delete") onDelete(id);
      else if (action.dataset.action === "load-demo") onLoadDemo();
      else if (action.dataset.action === "clear-filters") onClearFilters();
      return;
    }
    const row = event.target.closest(".row[data-id]");
    if (row && !event.target.closest("button")) onEdit(row.dataset.id);
  });

  function update(state, { visible = [], total = 0, filtered = false } = {}) {
    const theme = state.theme;
    if (sub) sub.textContent = filtered ? `筛选后 ${visible.length} / ${total} 条` : `共 ${total} 条记录`;

    if (!visible.length) {
      list.innerHTML = total
        ? `<div class="empty">
            <span class="empty__glyph" aria-hidden="true">🔍</span>
            <p>没有符合条件的记录</p>
            <small>试着换个关键词，或清除当前的筛选条件。</small>
            <button class="btn btn--quiet btn--sm" type="button" data-action="clear-filters">清除筛选</button>
          </div>`
        : `<div class="empty">
            <span class="empty__glyph" aria-hidden="true">👥</span>
            <p>还没有任何朋友记录</p>
            <small>点击右上角「添加朋友」手动录入，或先载入一套虚构示例数据体验完整功能。</small>
            <button class="btn btn--primary btn--sm" type="button" data-action="load-demo">载入示例数据</button>
          </div>`;
      return;
    }

    list.innerHTML = visible
      .map((friend) => {
        const age = ageOf(friend.birthday);
        const metaBits = [friend.gender, age === null ? "" : `${age} 岁`, friend.relationship].filter(Boolean);
        const badgeClass = RELATIONSHIP_CLASS[friend.relationship] || "other";
        const accent = RELATIONSHIP_COLORS[theme === "dark" ? "dark" : "light"][friend.relationship];
        return `<article class="row row--enter" data-id="${escapeHtml(friend.id)}" style="animation-delay:${Math.min(240, visible.indexOf(friend) * 12)}ms">
          <div class="avatar avatar--${GENDER_CLASS[friend.gender] || "other"}" aria-hidden="true">${escapeHtml(initialOf(friend.name))}</div>
          <div class="row__identity">
            <span class="row__name">${escapeHtml(friend.name)}</span>
            <span class="row__meta">${escapeHtml(metaBits.join(" · "))}</span>
          </div>
          <div class="row__place">
            <span class="row__city">${escapeHtml(friend.city)}</span>
            <span class="row__province">${escapeHtml(friend.province)}</span>
          </div>
          <span class="badge badge--${badgeClass}" style="color:${accent}">${escapeHtml(friend.relationship)}</span>
          <div class="row__notes" title="${escapeHtml(friend.notes)}">${escapeHtml(friend.notes || "")}</div>
          <div class="row__actions">
            <button class="icon-btn" type="button" data-action="edit" aria-label="编辑 ${escapeHtml(friend.name)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h4l10-10a2.5 2.5 0 0 0-3.5-3.5L4.5 16.5 4 20z"/></svg>
            </button>
            <button class="icon-btn danger" type="button" data-action="delete" aria-label="删除 ${escapeHtml(friend.name)}">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V5h6v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7"/></svg>
            </button>
          </div>
        </article>`;
      })
      .join("");
  }

  return { update };
}

export function createSummaryViews() {
  const number = (id) => document.getElementById(id);

  function updateKpis(overview) {
    number("kpi-total").textContent = overview.total;
    number("kpi-total-hint").textContent = overview.total ? `覆盖 ${overview.provinceCount} 个省级行政区` : "点击添加或载入示例";
    number("kpi-provinces").textContent = overview.provinceCount;
    number("kpi-provinces-hint").textContent = overview.topProvince ? `最多：${overview.topProvince}` : "—";
    number("kpi-cities").textContent = overview.cityCount;
    number("kpi-cities-hint").textContent = overview.total ? `平均每省 ${(overview.cityCount / Math.max(1, overview.provinceCount)).toFixed(1)} 个城市` : "—";
    number("kpi-age").textContent = overview.averageAge === null ? "—" : overview.averageAge;
    number("kpi-age-hint").textContent = overview.agedCount ? `${overview.agedCount} 人填写了生日` : "基于已填写生日";

    const total = overview.total || 1;
    const male = Math.round((overview.male / total) * 1000) / 10;
    const female = Math.round((overview.female / total) * 1000) / 10;
    const other = Math.round((100 - male - female) * 10) / 10;
    number("genderbar-male").style.width = `${male}%`;
    number("genderbar-female").style.width = `${female}%`;
    number("genderbar-other").style.width = `${Math.max(0, other)}%`;
    number("legend-male").textContent = overview.male;
    number("legend-female").textContent = overview.female;
    number("legend-other").textContent = overview.other;
    number("kpi-gender-hint").textContent = overview.total
      ? `男 ${male}% · 女 ${female}%`
      : "—";
  }

  return { updateKpis };
}

export function createDrillView({ onClear, onEdit, onSelect }) {
  const title = $("#drill-title");
  const sub = $("#drill-sub");
  const body = $("#drill-body");
  const reset = $("#btn-drill-reset");

  reset.addEventListener("click", onClear);

  body.addEventListener("click", (event) => {
    const chip = event.target.closest("[data-id]");
    if (chip) onEdit(chip.dataset.id);
  });

  body.addEventListener("change", (event) => {
    const select = event.target.closest("#drill-province");
    if (select && select.value) onSelect(select.value);
  });

  function update(state, drill) {
    if (!state.selectedProvince) {
      title.textContent = "省份下钻";
      sub.textContent = "在地图上选择省份";
      reset.hidden = true;
      const provinces = Array.from(new Set(state.friends.map((friend) => friend.province))).sort((a, b) =>
        a.localeCompare(b, "zh-Hans-CN")
      );
      body.innerHTML = `<div class="empty">
        <span class="empty__glyph" aria-hidden="true">🗺️</span>
        <p>还没有选中省份</p>
        <small>点击左侧地图中的任一省份，即可查看该省的城市分布与好友名单。</small>
        ${
          provinces.length
            ? `<label class="drill-select">
                <span class="visually-hidden">选择省份</span>
                <select id="drill-province">
                  <option value="">或直接选择省份…</option>
                  ${provinces.map((province) => `<option value="${escapeHtml(province)}">${escapeHtml(province)}</option>`).join("")}
                </select>
              </label>`
            : ""
        }
      </div>`;
      return;
    }

    title.textContent = state.selectedProvince;
    sub.textContent = `占全部朋友的 ${drill.share}%`;
    reset.hidden = false;

    if (!drill.total) {
      body.innerHTML = `<div class="empty">
        <span class="empty__glyph" aria-hidden="true">📍</span>
        <p>这个省份还没有记录</p>
        <small>可以点击「添加朋友」把这边的朋友补进来。</small>
      </div>`;
      return;
    }

    const max = Math.max(...drill.cities.map((item) => item.count));
    body.innerHTML = `
      <div class="drill__hero"><strong>${drill.total}</strong><span>位朋友 · ${drill.cityCount} 个城市</span></div>
      <div class="city-bars">
        ${drill.cities
          .map(
            (item) => `<div class="city-bar">
              <span class="city-bar__name">${escapeHtml(item.city)}</span>
              <span class="city-bar__value">${item.count} 人</span>
              <span class="city-bar__track"><span class="city-bar__fill" style="width:${Math.round((item.count / max) * 100)}%"></span></span>
            </div>`
          )
          .join("")}
      </div>
      <div class="chip-list">
        ${drill.friends
          .map(
            (friend) => `<button class="name-chip" type="button" data-id="${escapeHtml(friend.id)}" title="${escapeHtml(friend.notes || friend.city)}">
              <span class="avatar avatar--${GENDER_CLASS[friend.gender] || "other"}">${escapeHtml(initialOf(friend.name))}</span>
              ${escapeHtml(friend.name)}
            </button>`
          )
          .join("")}
      </div>`;
  }

  return { update };
}

export function birthdayLabel(friend) {
  return friend.birthday ? formatBirthday(friend.birthday) : "未填写生日";
}
