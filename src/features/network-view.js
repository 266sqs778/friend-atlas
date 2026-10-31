import { $, escapeHtml } from "../lib/dom.js";
import { paletteFor, relationshipColor, tooltipStyle } from "../lib/theme.js";
import { relationshipRanking } from "../lib/stats.js";
import { RELATIONSHIPS } from "../data/provinces.js";

export function createNetworkView() {
  const container = $("#network-chart");
  const badge = $("#network-badge");
  const relationList = $("#relation-list");
  let chart = null;

  function echartsRef() {
    return typeof window !== "undefined" ? window.echarts : null;
  }

  function ensureChart(theme) {
    if (chart) return chart;
    const echarts = echartsRef();
    if (!echarts || !container) return null;
    chart = echarts.init(container, null, { renderer: "canvas" });
    return chart;
  }

  function buildOption(state, palette) {
    const friends = state.friends || [];
    const relationships = RELATIONSHIPS.filter((name) => friends.some((friend) => friend.relationship === name));
    const categories = [{ name: "我" }].concat(relationships.map((name) => ({ name })));
    const categoryIndex = new Map(categories.map((item, index) => [item.name, index]));

    const nodes = [
      {
        id: "__me__",
        name: "我",
        category: 0,
        symbolSize: 58,
        value: friends.length,
        itemStyle: {
          color: palette.accent,
          shadowBlur: 22,
          shadowColor: palette.accentSoft,
          borderColor: palette.mapBorder,
          borderWidth: 3
        },
        label: { show: true, fontSize: 13, fontWeight: 700, color: "#ffffff" }
      }
    ];
    const links = [];

    relationships.forEach((relationship) => {
      const people = friends.filter((friend) => friend.relationship === relationship);
      const color = relationshipColor(relationship, state.theme);
      const groupId = `__group__${relationship}`;
      nodes.push({
        id: groupId,
        name: `${relationship} · ${people.length}`,
        category: categoryIndex.get(relationship),
        symbolSize: Math.min(52, 26 + people.length * 2.4),
        value: people.length,
        itemStyle: { color, borderColor: palette.mapBorder, borderWidth: 2 },
        label: { show: true, fontSize: 11, fontWeight: 600, color: palette.text }
      });
      links.push({
        source: "__me__",
        target: groupId,
        lineStyle: { color, width: 2.4, opacity: 0.9, curveness: 0.06 }
      });

      people.forEach((friend) => {
        nodes.push({
          id: friend.id,
          name: friend.name,
          category: categoryIndex.get(relationship),
          symbolSize: 18,
          value: 1,
          friendId: friend.id,
          itemStyle: { color, borderColor: palette.mapBorder, borderWidth: 1.6 },
          label: { show: true, fontSize: 10, color: palette.text2 }
        });
        links.push({
          source: groupId,
          target: friend.id,
          lineStyle: { color, width: 1, opacity: 0.45, curveness: 0.12 }
        });
      });
    });

    return {
      backgroundColor: "transparent",
      tooltip: {
        ...tooltipStyle(palette),
        formatter(params) {
          if (params.dataType !== "node") return "";
          const friend = friends.find((item) => item.id === params.data.friendId);
          if (friend) {
            return `<div style="font-weight:650;margin-bottom:4px">${escapeHtml(friend.name)}</div>
              <div style="opacity:.7">${escapeHtml(friend.relationship)} · ${escapeHtml(friend.province)}${escapeHtml(friend.city)}</div>
              ${friend.notes ? `<div style="opacity:.6;margin-top:4px;max-width:200px;white-space:normal">${escapeHtml(friend.notes)}</div>` : ""}`;
          }
          return `<div style="font-weight:650">${escapeHtml(params.name)}</div>`;
        }
      },
      legend: {
        data: categories.map((item) => item.name),
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: palette.text2, fontSize: 11 },
        inactiveColor: palette.split
      },
      series: [
        {
          type: "graph",
          layout: "force",
          roam: true,
          draggable: true,
          focusNodeAdjacency: false,
          emphasis: { focus: "adjacency", scale: true, lineStyle: { width: 2.6, opacity: 1 } },
          categories: categories.map((item) => ({ name: item.name })),
          force: {
            repulsion: friends.length > 24 ? 280 : 220,
            gravity: 0.08,
            edgeLength: friends.length > 24 ? [40, 110] : [60, 140],
            friction: 0.22,
            layoutAnimation: true
          },
          lineStyle: { color: "source", opacity: 0.5 },
          label: { position: "right", distance: 4 },
          data: nodes,
          links
        }
      ],
      animationDuration: 700,
      animationEasingUpdate: "quinticInOut"
    };
  }

  function emptyOption(palette) {
    return {
      backgroundColor: "transparent",
      graphic: {
        type: "text",
        left: "center",
        top: "middle",
        style: { text: "暂无数据\n添加朋友后即可看到关系网络", fill: palette.text2, fontSize: 13, lineHeight: 22, textAlign: "center" }
      }
    };
  }

  function renderRelationList(state, ranking) {
    if (!relationList) return;
    if (!ranking.length) {
      relationList.innerHTML = '<p class="card__sub">添加朋友后展示关系构成</p>';
      return;
    }
    relationList.innerHTML = ranking
      .map(
        (item) => `<div class="relation-row">
          <i style="background:${relationshipColor(item.name, state.theme)}"></i>
          <span>${escapeHtml(item.name)}</span>
          <em>${item.value} 人 · ${item.share}%</em>
        </div>`
      )
      .join("");
  }

  function update(state, options = {}) {
    const palette = paletteFor(state.theme);
    if (options.themeChanged && chart) {
      chart.dispose();
      chart = null;
    }
    const instance = ensureChart(state.theme);
    const friends = state.friends || [];
    if (badge) badge.textContent = `${friends.length + (friends.length ? 1 : 0)} 个节点`;

    renderRelationList(state, relationshipRanking(friends));

    if (!instance) return;
    instance.setOption(friends.length ? buildOption(state, palette) : emptyOption(palette), true);
    instance.resize();
  }

  function resize() {
    if (chart) chart.resize();
  }

  return { update, resize };
}
