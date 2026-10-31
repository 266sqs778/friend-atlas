import { test, assert } from "./harness.js";
import { STORAGE_KEY, THEME_KEY, loadFriends, loadTheme, saveFriends, saveTheme } from "../src/lib/storage.js";
import { DEMO_FRIENDS } from "../src/data/demo-friends.js";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    }
  };
}

test("首次访问播种示例数据", () => {
  const storage = memoryStorage();
  const result = loadFriends(storage);
  assert.equal(result.seeded, true);
  assert.equal(result.friends.length, DEMO_FRIENDS.length);
  assert.equal(result.friends[0].name, DEMO_FRIENDS[0].name);
  assert.ok(storage.map.get(STORAGE_KEY) === undefined, "读取时不应写入存储");
});

test("保存后重新读取不重复播种", () => {
  const storage = memoryStorage();
  const saved = saveFriends([{ id: "x", name: "甲", province: "北京市", city: "朝阳区", gender: "女", relationship: "朋友", birthday: "", notes: "" }], storage);
  assert.equal(saved.ok, true);

  const result = loadFriends(storage);
  assert.equal(result.seeded, false);
  assert.equal(result.friends.length, 1);
  assert.equal(result.friends[0].name, "甲");
});

test("空数组会被持久化，不会被示例数据覆盖", () => {
  const storage = memoryStorage();
  saveFriends([], storage);
  const result = loadFriends(storage);
  assert.equal(result.seeded, false);
  assert.equal(result.friends.length, 0);
});

test("损坏的 JSON 回退到示例数据并给出提示", () => {
  const storage = memoryStorage({ [STORAGE_KEY]: "{broken" });
  const result = loadFriends(storage);
  assert.equal(result.seeded, true);
  assert.ok(result.error);
  assert.equal(result.friends.length, DEMO_FRIENDS.length);
});

test("缺少 localStorage 时仍可降级运行", () => {
  const result = loadFriends({ getItem: () => { throw new Error("blocked"); } });
  assert.equal(result.seeded, true);
  assert.ok(result.error);
});

test("主题读写与非法值兜底", () => {
  const storage = memoryStorage();
  assert.equal(loadTheme(storage), "");
  saveTheme("dark", storage);
  assert.equal(storage.map.get(THEME_KEY), "dark");
  assert.equal(loadTheme(storage), "dark");

  storage.map.set(THEME_KEY, "rainbow");
  assert.equal(loadTheme(storage), "");
});
