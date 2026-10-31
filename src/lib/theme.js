import { loadTheme, saveTheme } from "./storage.js";

export const RELATIONSHIP_COLORS = {
  light: {
    "朋友": "#0071e3",
    "同学": "#ff9f0a",
    "同事": "#30b0c7",
    "亲戚": "#af52de",
    "合作伙伴": "#34c759",
    "其他": "#8e8e93"
  },
  dark: {
    "朋友": "#0a84ff",
    "同学": "#ffd60a",
    "同事": "#40c8e0",
    "亲戚": "#bf5af2",
    "合作伙伴": "#30d158",
    "其他": "#98989f"
  }
};

export const CHART_PALETTES = {
  light: {
    text: "#1d1d1f",
    text2: "rgba(60,60,67,.62)",
    axis: "rgba(60,60,67,.34)",
    split: "rgba(60,60,67,.10)",
    tooltipBg: "rgba(255,255,255,.97)",
    tooltipBorder: "rgba(60,60,67,.14)",
    tooltipText: "#1d1d1f",
    mapEmpty: "#eef1f5",
    mapBorder: "#ffffff",
    accent: "#0071e3",
    accentSoft: "rgba(0,113,227,.12)",
    series: ["#0071e3", "#34c759", "#ff9f0a", "#af52de", "#ff375f", "#30b0c7", "#5e5ce6", "#8e8e93"],
    mapScale: ["#eaf4ff", "#c2def9", "#8fc2f0", "#4f9ce4", "#1a72c9", "#0a4d8f"]
  },
  dark: {
    text: "#f5f5f7",
    text2: "rgba(235,235,245,.62)",
    axis: "rgba(235,235,245,.34)",
    split: "rgba(235,235,245,.10)",
    tooltipBg: "rgba(28,28,30,.97)",
    tooltipBorder: "rgba(120,120,128,.42)",
    tooltipText: "#f5f5f7",
    mapEmpty: "#26262a",
    mapBorder: "#3a3a3e",
    accent: "#0a84ff",
    accentSoft: "rgba(10,132,255,.18)",
    series: ["#0a84ff", "#30d158", "#ffd60a", "#bf5af2", "#ff375f", "#40c8e0", "#7d8cff", "#98989f"],
    mapScale: ["#0d2338", "#123a5f", "#155589", "#1173b8", "#3a9ee8", "#79c6ff"]
  }
};

export function paletteFor(theme) {
  return CHART_PALETTES[theme === "dark" ? "dark" : "light"];
}

export function relationshipColor(relationship, theme) {
  const map = RELATIONSHIP_COLORS[theme === "dark" ? "dark" : "light"];
  return map[relationship] || map["其他"];
}

export function systemPrefersDark() {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

export function resolveInitialTheme(storage) {
  const stored = loadTheme(storage);
  if (stored) return stored;
  return systemPrefersDark() ? "dark" : "light";
}

export function applyTheme(theme, root = document.documentElement) {
  const next = theme === "dark" ? "dark" : "light";
  root.dataset.theme = next;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", next === "dark" ? "#000000" : "#f5f5f7");
  return next;
}

export function setTheme(theme, storage) {
  const next = applyTheme(theme);
  saveTheme(next, storage);
  return next;
}

export function tooltipStyle(palette) {
  return {
    backgroundColor: palette.tooltipBg,
    borderColor: palette.tooltipBorder,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: { color: palette.tooltipText, fontSize: 12 },
    extraCssText: "border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.16);backdrop-filter:blur(12px);"
  };
}
