import { $ } from "../lib/dom.js";
import { paletteFor, relationshipColor, tooltipStyle } from "../lib/theme.js";
import { ageDistribution, relationshipRanking, topCities, computeOverview } from "../lib/stats.js";

const CHART_IDS = ["chart-age", "chart-relationship", "chart-city", "chart-province"];

export function createAnalyticsView() {
  const charts = new Map();

  function echartsRef() {
    return typeof window !== "undefined" ? window.echarts : null;
  }

  function ensure(name, theme) {
    if (charts.has(name)) return charts.get(name);
    const el = document.getElementById(name);
    const echarts = echartsRef();
    if (!el || !echarts) return null;
    const chart = echarts.init(el, null, { renderer: "canvas" });
    charts.set(name, chart);
    return chart;
  }

  function emptyGraphic(palette, text) {
    return {
      backgroundColor: "transparent",
      graphic: {
        type: "text",
        left: "center",
        top: "middle",
        style: { text, fill: palette.text2, fontSize: 12, textAlign: "center" }
      }
    };
  }

  function axisBase(palette) {
    return {
      axisLine: { lineStyle: { color: palette.axis } },
      axisTick: { show: false },
      axisLabel: { color: palette.text2, fontSize: 11 },
      splitLine: { lineStyle: { color: palette.split, type: "dashed" } }
    };
  }

  function ageOption(friends, palette, now) {
    const { buckets, unknown } = ageDistribution(friends, now);
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 16, top: 24, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipStyle(palette) },
      xAxis: {
        type: "category",
        data: buckets.map((bucket) => bucket.label),
        ...axisBase(palette),
        splitLine: { show: false }
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        ...axisBase(palette),
        axisLine: { show: false }
      },
      series: [
        {
          type: "bar",
          data: buckets.map((bucket) => bucket.count),
          barWidth: "46%",
          itemStyle: {
            borderRadius: [7, 7, 3, 3],
            color: {
              type: "linear",
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: palette.series[0] },
                { offset: 1, color: palette.series[5] }
              ]
            }
          },
          emphasis: { itemStyle: { opacity: 0.9 } }
        }
      ],
      graphic: unknown
        ? [{ type: "text", right: 12, top: 6, style: { text: `${unknown} 人未填写生日`, fill: palette.text2, fontSize: 10 } }]
        : []
    };
  }

  function relationshipOption(friends, palette, theme) {
    const ranking = relationshipRanking(friends);
    return {
      backgroundColor: "transparent",
      tooltip: { trigger: "item", ...tooltipStyle(palette), formatter: "{b}<br/>{c} 人 · {d}%" },
      legend: {
        bottom: 0,
        icon: "circle",
        itemWidth: 8,
        itemHeight: 8,
        textStyle: { color: palette.text2, fontSize: 11 }
      },
      series: [
        {
          type: "pie",
          radius: ["48%", "72%"],
          center: ["50%", "44%"],
          avoidLabelOverlap: true,
          itemStyle: { borderColor: palette.mapBorder, borderWidth: 2, borderRadius: 6 },
          label: { show: false },
          labelLine: { show: false },
          emphasis: { scaleSize: 6 },
          data: ranking.map((item) => ({
            name: item.name,
            value: item.value,
            itemStyle: { color: relationshipColor(item.name, theme) }
          }))
        }
      ]
    };
  }

  function cityOption(friends, palette) {
    const cities = topCities(friends, 8).reverse();
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipStyle(palette) },
      xAxis: { type: "value", minInterval: 1, ...axisBase(palette), axisLine: { show: false } },
      yAxis: {
        type: "category",
        data: cities.map((item) => item.city),
        ...axisBase(palette),
        splitLine: { show: false }
      },
      series: [
        {
          type: "bar",
          data: cities.map((item) => item.count),
          barWidth: "52%",
          itemStyle: {
            borderRadius: [3, 7, 7, 3],
            color: {
              type: "linear",
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: palette.series[0] },
                { offset: 1, color: palette.series[5] }
              ]
            }
          },
          label: { show: true, position: "right", color: palette.text2, fontSize: 11 }
        }
      ]
    };
  }

  function provinceOption(friends, palette) {
    const overview = computeOverview(friends);
    const provinces = overview.provinceRanking.slice(0, 10).reverse();
    return {
      backgroundColor: "transparent",
      grid: { left: 8, right: 24, top: 12, bottom: 8, containLabel: true },
      tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, ...tooltipStyle(palette) },
      xAxis: { type: "value", minInterval: 1, ...axisBase(palette), axisLine: { show: false } },
      yAxis: {
        type: "category",
        data: provinces.map((item) => item.name),
        ...axisBase(palette),
        splitLine: { show: false }
      },
      series: [
        {
          type: "bar",
          data: provinces.map((item) => item.value),
          barWidth: "52%",
          itemStyle: {
            borderRadius: [3, 7, 7, 3],
            color: {
              type: "linear",
              x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: palette.series[2] },
                { offset: 1, color: palette.series[3] }
              ]
            }
          },
          label: { show: true, position: "right", color: palette.text2, fontSize: 11 }
        }
      ]
    };
  }

  function update(state, options = {}) {
    const palette = paletteFor(state.theme);
    const friends = state.friends || [];

    if (options.themeChanged) {
      charts.forEach((chart) => chart.dispose());
      charts.clear();
    }

    const age = ensure("chart-age", state.theme);
    if (age) age.setOption(friends.length ? ageOption(friends, palette) : emptyGraphic(palette, "暂无数据"), true);

    const relationship = ensure("chart-relationship", state.theme);
    if (relationship) {
      relationship.setOption(
        friends.length ? relationshipOption(friends, palette, state.theme) : emptyGraphic(palette, "暂无数据"),
        true
      );
    }

    const city = ensure("chart-city", state.theme);
    if (city) city.setOption(friends.length ? cityOption(friends, palette) : emptyGraphic(palette, "暂无数据"), true);

    const province = ensure("chart-province", state.theme);
    if (province) {
      province.setOption(friends.length ? provinceOption(friends, palette) : emptyGraphic(palette, "暂无数据"), true);
    }
  }

  function resize() {
    charts.forEach((chart) => chart.resize());
  }

  return { update, resize, CHART_IDS };
}
