import { ageOf, percent } from "./format.js";

export const AGE_BUCKETS = [
  { label: "≤22", min: 0, max: 22 },
  { label: "23-27", min: 23, max: 27 },
  { label: "28-32", min: 28, max: 32 },
  { label: "33-37", min: 33, max: 37 },
  { label: "38-42", min: 38, max: 42 },
  { label: "43+", min: 43, max: 200 }
];

export function cityKey(friend) {
  return `${friend.province}|${friend.city}`;
}

/** 单次遍历汇总所有概览指标，视图层只消费结果。 */
export function computeOverview(friends, now = new Date()) {
  const provinces = new Set();
  const cities = new Set();
  const byProvince = Object.create(null);
  const byCity = Object.create(null);
  const byRelationship = Object.create(null);
  let male = 0;
  let female = 0;
  let other = 0;
  let ageSum = 0;
  let ageCount = 0;

  friends.forEach((friend) => {
    if (friend.province) {
      provinces.add(friend.province);
      byProvince[friend.province] = (byProvince[friend.province] || 0) + 1;
    }
    if (friend.province && friend.city) {
      cities.add(cityKey(friend));
      byCity[friend.city] = (byCity[friend.city] || 0) + 1;
    }
    if (friend.gender === "男") male += 1;
    else if (friend.gender === "女") female += 1;
    else other += 1;

    const age = ageOf(friend.birthday, now);
    if (age !== null) {
      ageSum += age;
      ageCount += 1;
    }
    if (friend.relationship) {
      byRelationship[friend.relationship] = (byRelationship[friend.relationship] || 0) + 1;
    }
  });

  const provinceRanking = rankEntries(byProvince);
  const topProvince = provinceRanking[0] || null;

  return {
    total: friends.length,
    provinceCount: provinces.size,
    cityCount: cities.size,
    male,
    female,
    other,
    averageAge: ageCount ? Math.round((ageSum / ageCount) * 10) / 10 : null,
    agedCount: ageCount,
    byProvince,
    byCity,
    byRelationship,
    provinceRanking,
    topProvince: topProvince ? topProvince.name : "",
    topProvinceCount: topProvince ? topProvince.value : 0,
    topProvinceShare: topProvince ? percent(topProvince.value, friends.length) : 0
  };
}

/** Object -> 降序数组（数量相同时按名称排序，保证结果稳定） */
export function rankEntries(record) {
  return Object.keys(record)
    .map((name) => ({ name, value: record[name] }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "zh-Hans-CN"));
}

export function relationshipRanking(friends) {
  const record = Object.create(null);
  friends.forEach((friend) => {
    if (!friend.relationship) return;
    record[friend.relationship] = (record[friend.relationship] || 0) + 1;
  });
  return rankEntries(record).map((item) => ({ ...item, share: percent(item.value, friends.length) }));
}

export function ageDistribution(friends, now = new Date()) {
  const counts = AGE_BUCKETS.map(() => 0);
  let unknown = 0;
  friends.forEach((friend) => {
    const age = ageOf(friend.birthday, now);
    if (age === null) {
      unknown += 1;
      return;
    }
    const index = AGE_BUCKETS.findIndex((bucket) => age >= bucket.min && age <= bucket.max);
    if (index >= 0) counts[index] += 1;
    else unknown += 1;
  });
  return {
    buckets: AGE_BUCKETS.map((bucket, index) => ({ label: bucket.label, count: counts[index] })),
    unknown
  };
}

export function topCities(friends, limit = 8) {
  const record = Object.create(null);
  friends.forEach((friend) => {
    const key = cityKey(friend);
    if (!record[key]) {
      record[key] = { province: friend.province, city: friend.city, count: 0 };
    }
    record[key].count += 1;
  });
  return Object.values(record)
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "zh-Hans-CN"))
    .slice(0, limit);
}

/** 省份下钻：该省的城市分布、朋友名单与占比。 */
export function drillDown(friends, province) {
  const scoped = friends.filter((friend) => friend.province === province);
  const record = Object.create(null);
  scoped.forEach((friend) => {
    if (!record[friend.city]) record[friend.city] = [];
    record[friend.city].push(friend);
  });
  const cities = Object.keys(record)
    .map((city) => ({ city, friends: record[city], count: record[city].length }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "zh-Hans-CN"));

  return {
    province,
    total: scoped.length,
    cityCount: cities.length,
    cities,
    friends: scoped.slice().sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN")),
    share: percent(scoped.length, friends.length)
  };
}

export function genderSplit(overview) {
  const total = overview.total || 1;
  return {
    male: percent(overview.male, total),
    female: percent(overview.female, total),
    other: percent(overview.other, total)
  };
}
