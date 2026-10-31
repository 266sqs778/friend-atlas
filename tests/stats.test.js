import { test, assert } from "./harness.js";
import {
  ageDistribution,
  computeOverview,
  drillDown,
  relationshipRanking,
  topCities
} from "../src/lib/stats.js";

const now = new Date(2026, 10, 1);

function friend(overrides = {}) {
  return {
    id: overrides.id || Math.random().toString(36),
    name: "示例",
    gender: "男",
    birthday: "1996-04-12",
    province: "北京市",
    city: "朝阳区",
    relationship: "同学",
    notes: "",
    createdAt: "2026-01-01T00:00:00+08:00",
    ...overrides
  };
}

const fixture = [
  friend({ id: "a", name: "甲", gender: "男", province: "北京市", city: "朝阳区", relationship: "同学", birthday: "1996-04-12" }),
  friend({ id: "b", name: "乙", gender: "女", province: "北京市", city: "海淀区", relationship: "同事", birthday: "1990-06-01" }),
  friend({ id: "c", name: "丙", gender: "女", province: "广东省", city: "深圳市", relationship: "朋友", birthday: "2002-01-05" }),
  friend({ id: "d", name: "丁", gender: "其他", province: "广东省", city: "深圳市", relationship: "朋友", birthday: "" })
];

test("computeOverview 汇总总量、地区与性别", () => {
  const overview = computeOverview(fixture, now);
  assert.equal(overview.total, 4);
  assert.equal(overview.provinceCount, 2);
  assert.equal(overview.cityCount, 3);
  assert.equal(overview.male, 1);
  assert.equal(overview.female, 2);
  assert.equal(overview.other, 1);
  assert.equal(overview.topProvince, "北京市");
  assert.equal(overview.topProvinceCount, 2);
  assert.equal(overview.topProvinceShare, 50);
});

test("computeOverview 平均年龄只统计有效生日", () => {
  const overview = computeOverview(fixture, now);
  // 30 + 36 + 24 = 90，3 人有效
  assert.equal(overview.averageAge, 30);
  assert.equal(overview.agedCount, 3);
});

test("computeOverview 处理空集合", () => {
  const overview = computeOverview([], now);
  assert.equal(overview.total, 0);
  assert.equal(overview.averageAge, null);
  assert.equal(overview.topProvince, "");
  assert.deepEqual(overview.provinceRanking, []);
});

test("ageDistribution 按区间归桶并统计缺失", () => {
  const { buckets, unknown } = ageDistribution(fixture, now);
  const counts = Object.fromEntries(buckets.map((bucket) => [bucket.label, bucket.count]));
  assert.equal(counts["23-27"], 1); // 2002 年
  assert.equal(counts["28-32"], 1); // 1996 年
  assert.equal(counts["33-37"], 1); // 1990 年
  assert.equal(unknown, 1);
});

test("topCities 按人数降序并受 limit 限制", () => {
  const cities = topCities(fixture, 2);
  assert.equal(cities.length, 2);
  assert.equal(cities[0].city, "深圳市");
  assert.equal(cities[0].count, 2);
  assert.equal(cities[1].count, 1);
});

test("relationshipRanking 返回占比", () => {
  const ranking = relationshipRanking(fixture);
  assert.equal(ranking[0].name, "朋友");
  assert.equal(ranking[0].value, 2);
  assert.equal(ranking[0].share, 50);
});

test("drillDown 输出城市分组与占比", () => {
  const drill = drillDown(fixture, "北京市");
  assert.equal(drill.total, 2);
  assert.equal(drill.cityCount, 2);
  assert.equal(drill.share, 50);
  assert.equal(drill.cities[0].friends.length, 1);

  const empty = drillDown(fixture, "西藏自治区");
  assert.equal(empty.total, 0);
  assert.equal(empty.cityCount, 0);
  assert.equal(empty.share, 0);
});
