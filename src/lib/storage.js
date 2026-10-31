import { DEMO_FRIENDS } from "../data/demo-friends.js";
import { normalizeFriend } from "./model.js";

export const STORAGE_KEY = "friend-atlas.collection.v1";
export const THEME_KEY = "friend-atlas.theme";

function safeStorage(storage) {
  if (storage) return storage;
  try {
    return window.localStorage;
  } catch (error) {
    return null;
  }
}

/**
 * 读取本地集合。首次访问（无键）时返回示例数据，
 * 这样 Demo 打开即有内容；用户清空后会保存空数组，不再重新播种。
 */
export function loadFriends(storage) {
  const store = safeStorage(storage);
  if (!store) return { friends: DEMO_FRIENDS.map(normalizeFriend), seeded: true, error: null };

  let raw = null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch (error) {
    return { friends: DEMO_FRIENDS.map(normalizeFriend), seeded: true, error: "无法访问本地存储" };
  }

  if (raw === null) {
    return { friends: DEMO_FRIENDS.map(normalizeFriend), seeded: true, error: null };
  }

  try {
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : parsed && Array.isArray(parsed.friends) ? parsed.friends : [];
    return { friends: list.map(normalizeFriend), seeded: false, error: null };
  } catch (error) {
    return { friends: DEMO_FRIENDS.map(normalizeFriend), seeded: true, error: "本地数据损坏，已回到示例数据" };
  }
}

export function saveFriends(friends, storage) {
  const store = safeStorage(storage);
  if (!store) return { ok: false, error: "当前环境不支持本地存储" };
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, friends }));
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: "本地保存失败，可能存储空间不足" };
  }
}

export function loadTheme(storage) {
  const store = safeStorage(storage);
  if (!store) return "";
  try {
    const value = store.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "";
  } catch (error) {
    return "";
  }
}

export function saveTheme(theme, storage) {
  const store = safeStorage(storage);
  if (!store) return;
  try {
    store.setItem(THEME_KEY, theme);
  } catch (error) {
    /* 主题保存失败不影响主流程 */
  }
}
