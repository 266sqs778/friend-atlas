import { test, assert } from "./harness.js";
import { createFilters, countActiveFilters, filterFriends, isFilterActive, sortFriends, toggleValue } from "../src/lib/filters.js";

const friends = [
  { id: "1", name: "林小满", gender: "女", birthday: "1996-04-12", province: "北京市", city: "朝阳区", relationship: "同学", notes: "本科同班", createdAt: "2025-01-01" },
  { id: "2", name: "陈一诺", gender: "男", birthday: "1990-09-23", province: "上海市", city: "浦东新区", relationship: "同事", notes: "前公司同组", createdAt: "2025-06-01" },
  { id: "3", name: "苏亦辰", gender: "男", birthday: "2002-01-08", province: "广东省", city: "深圳市", relationship: "朋友", notes: "羽毛球球友", createdAt: "2026-01-01" }
];

test("filterFriends 默认返回全部", () => {
  assert.equal(filterFriends(friends, createFilters()).length, 3);
});

test("filterFriends 关键词匹配姓名、城市与备注", () => {
  assert.equal(filterFriends(friends, createFilters({ keyword: "深圳" })).length, 1);
  assert.equal(filterFriends(friends, createFilters({ keyword: "球友" })).length, 1);
  assert.equal(filterFriends(friends, createFilters({ keyword: "不存在" })).length, 0);
});

test("filterFriends 性别与关系可多选", () => {
  assert.equal(filterFriends(friends, createFilters({ genders: ["男"] })).length, 2);
  assert.equal(filterFriends(friends, createFilters({ genders: ["男", "女"] })).length, 3);
  assert.equal(filterFriends(friends, createFilters({ relationships: ["同学", "朋友"] })).length, 2);
});

test("filterFriends 组合条件取交集", () => {
  const result = filterFriends(friends, createFilters({ genders: ["男"], province: "广东省", keyword: "球" }));
  assert.equal(result.length, 1);
  assert.equal(result[0].name, "苏亦辰");
});

test("isFilterActive 与 countActiveFilters 反映筛选状态", () => {
  assert.equal(isFilterActive(createFilters()), false);
  assert.equal(countActiveFilters(createFilters()), 0);

  const filters = createFilters({ keyword: "深圳", genders: ["男"], province: "广东省" });
  assert.equal(isFilterActive(filters), true);
  assert.equal(countActiveFilters(filters), 3);
});

test("toggleValue 增删选中值", () => {
  assert.deepEqual(toggleValue([], "同学"), ["同学"]);
  assert.deepEqual(toggleValue(["同学"], "同学"), []);
});

test("sortFriends 支持姓名、年龄、省份与最近添加", () => {
  const byName = sortFriends(friends, "name");
  assert.equal(byName[0].name, "陈一诺");

  const byAge = sortFriends(friends, "age", new Date(2026, 0, 1));
  assert.equal(byAge[0].name, "苏亦辰"); // 年龄最小
  assert.equal(byAge[2].name, "陈一诺"); // 年龄最大

  const byProvince = sortFriends(friends, "province");
  assert.equal(byProvince[0].province, "北京市");

  const recent = sortFriends(friends, "recent");
  assert.equal(recent[0].name, "苏亦辰");
});

test("sortFriends 不修改入参", () => {
  const copy = friends.map((item) => item.name);
  sortFriends(friends, "name");
  assert.deepEqual(friends.map((item) => item.name), copy);
});
