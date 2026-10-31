import { $, escapeHtml } from "../lib/dom.js";
import { paletteFor, tooltipStyle } from "../lib/theme.js";
import { rankEntries } from "../lib/stats.js";

const GEO_URLS = ["./vendor/china-geo.json", "https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json"];

export function createMapView({ onSelectProvince }) {
  const container = $("#map-chart");
  const skeleton = $("#map-skeleton");
  const badge = $("#map-badge");
  const sub = $("#map-sub");
  let chart = null;
  let geoReady = false;
  let geoPromise = null;
  let failed = false;

  function echartsRef() {
    return typeof window !== "undefined" ? window.echarts : null;
  }

  async function ensureGeo() {
    if (geoReady) return true;
    if (geoPromise) return geoPromise;

    geoPromise = (async () => {
      const echarts = echartsRef();
      if (!echarts) return false;
      for (const url of GEO_URLS) {
        try {
          const response = await fetch(url, { cache: "force-cache" });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const geojson = await response.json();
          echarts.registerMap("china", geojson);
          geoReady = true;
          return true;
        } catch (error) {
          /* 尝试下一个数据源 */
        }
      }
      return false;
    })();

    return geoPromise;
  }

  function ensureChart(theme) {
    const echarts = echartsRef();
    if (!echarts || !container) return null;
    if (chart && chart.getOption) return chart;
    chart = echarts.init(container, null, { renderer: "canvas" });
    chart.on("click", (params) => {
      if (!params || params.componentType !== "series" || !params.name) return;
      const province = params.name;
      // 延后到事件循环之外再更新状态，避免在 ECharts 派发事件的过程中重绘地图。
      setTimeout(() => onSelectProvince(province), 0);
    });
    return chart;
  }

  function emptyOption(palette, message) {
    return {
      backgroundColor: "transparent",
      graphic: {
        type: "text",
        left: "center",
        top: "middle",
        style: { text: message, fill: palette.text2, fontSize: 13, lineHeight: 22, textAlign: "center" }
      }
    };
  }

  function buildOption(state, palette) {
    const friends = state.friends || [];
    const counts = Object.create(null);
    friends.forEach((friend) => {
      counts[friend.province] = (counts[friend.province] || 0) + 1;
    });
    const data = Object.keys(counts).map((name) => ({ name, value: counts[name] }));
    if (state.selectedProvince) {
      data.forEach((item) => {
        if (item.name !== state.selectedProvince) return;
        item.itemStyle = { areaColor: palette.accent, borderColor: palette.mapBorder, borderWidth: 1.5 };
        item.label = { show: true, color: "#ffffff", fontWeight: 600 };
      });
    }
    const max = Math.max(1, ...data.map((item) => item.value));
    const showLabels = window.innerWidth > 720;

    return {
      backgroundColor: "transparent",
      tooltip: {
        trigger: "item",
        enterable: false,
        ...tooltipStyle(palette),
        formatter(params) {
          const province = params.name;
          const people = friends.filter((friend) => friend.province === province);
          if (!people.length) {
            return `<div style="font-weight:650;margin-bottom:4px">${escapeHtml(province)}</div><div style="opacity:.65">暂无记录</div>`;
          }
          const cities = rankEntries(
            people.reduce((acc, friend) => {
              acc[friend.city] = (acc[friend.city] || 0) + 1;
              return acc;
            }, Object.create(null))
          )
            .slice(0, 4)
            .map((item) => `${escapeHtml(item.name)} ${item.value} 人`)
            .join(" · ");
          const names = people.slice(0, 6).map((friend) => escapeHtml(friend.name)).join("、");
          return `<div style="font-weight:650;font-size:13px;margin-bottom:6px">${escapeHtml(province)}</div>
            <div style="margin-bottom:4px"><b style="font-size:16px">${people.length}</b> 位朋友</div>
            <div style="opacity:.65;margin-bottom:6px">${cities}</div>
            <div style="opacity:.85">${names}${people.length > 6 ? " 等" : ""}</div>
            <div style="opacity:.5;margin-top:6px;font-size:11px">点击可下钻查看城市分布</div>`;
        }
      },
      visualMap: {
        type: "continuous",
        min: 0,
        max,
        left: 8,
        bottom: 8,
        itemWidth: 10,
        itemHeight: 90,
        calculable: true,
        text: ["多", "少"],
        textStyle: { color: palette.text2, fontSize: 11 },
        inRange: { color: palette.mapScale },
        outOfRange: { color: [palette.mapEmpty] }
      },
      series: [
        {
          type: "map",
          map: "china",
          roam: true,
          zoom: 1.18,
          center: [104, 36],
          scaleLimit: { min: 0.9, max: 6 },
          label: {
            show: showLabels,
            fontSize: 10,
            color: palette.text2,
            formatter: (params) => (params.value ? `${params.name.replace(/(省|市|自治区|特别行政区|维吾尔|壮族|回族|回族自治区|自治区)/g, "")}` : "")
          },
          itemStyle: {
            areaColor: palette.mapEmpty,
            borderColor: palette.mapBorder,
            borderWidth: 1
          },
          emphasis: {
            label: { show: true, color: "#fff", fontSize: 11, fontWeight: 600 },
            itemStyle: { areaColor: palette.accent, borderColor: palette.mapBorder, borderWidth: 1.5 }
          },
          data
        }
      ]
    };
  }

  async function update(state, options = {}) {
    const palette = paletteFor(state.theme);
    if (options.themeChanged && chart) {
      chart.dispose();
      chart = null;
    }

    const echarts = echartsRef();
    if (!echarts) {
      if (skeleton) skeleton.classList.add("is-hidden");
      if (container) container.innerHTML = '<p style="text-align:center;padding:40px;color:var(--label-2)">图表库加载失败，请检查 vendor/echarts.min.js</p>';
      return;
    }

    const instance = ensureChart(state.theme);
    if (!instance) return;

    if (!geoReady) {
      const ok = await ensureGeo();
      if (!ok) {
        failed = true;
        if (skeleton) skeleton.classList.add("is-hidden");
        instance.setOption(emptyOption(palette, "地图数据加载失败\n请刷新页面或检查 vendor/china-geo.json"), true);
        if (sub) sub.textContent = "地图数据不可用，榜单与关系图仍可使用";
        return;
      }
    }
    if (skeleton) skeleton.classList.add("is-hidden");

    instance.setOption(buildOption(state, palette), true);
    instance.resize();

    const provinceTotal = new Set(state.friends.map((friend) => friend.province)).size;
    if (badge) badge.textContent = `${state.friends.length} 位朋友`;
    if (sub) {
      sub.textContent = failed
        ? "地图数据不可用，榜单与关系图仍可使用"
        : `覆盖 ${provinceTotal} 个省级行政区 · 点击省份可下钻`;
    }
  }

  function resize() {
    if (chart) chart.resize();
  }

  return { update, resize };
}
