import { ageOf } from "./format.js";

export const DEFAULT_FILTERS = {
  keyword: "",
  genders: [],
  relationships: [],
  province: ""
};

export function createFilters(overrides = {}) {
  return { ...DEFAULT_FILTERS, ...overrides };
}

/** 多维筛选：关键词 + 性别多选 + 关系多选 + 省份。 */
export function filterFriends(friends, filters = DEFAULT_FILTERS) {
  const keyword = String(filters.keyword || "").trim().toLowerCase();
  const genders = Array.isArray(filters.genders) ? filters.genders : [];
  const relationships = Array.isArray(filters.relationships) ? filters.relationships : [];
  const province = filters.province || "";

  return friends.filter((friend) => {
    if (province && friend.province !== province) return false;
    if (genders.length && !genders.includes(friend.gender)) return false;
    if (relationships.length && !relationships.includes(friend.relationship)) return false;
    if (!keyword) return true;
    const haystack = [friend.name, friend.province, friend.city, friend.relationship, friend.notes]
      .join(" ")
      .toLowerCase();
    return haystack.includes(keyword);
  });
}

export function isFilterActive(filters) {
  return Boolean(
    String(filters.keyword || "").trim() ||
      (filters.genders && filters.genders.length) ||
      (filters.relationships && filters.relationships.length) ||
      filters.province
  );
}

export function countActiveFilters(filters) {
  let count = 0;
  if (String(filters.keyword || "").trim()) count += 1;
  count += (filters.genders || []).length;
  count += (filters.relationships || []).length;
  if (filters.province) count += 1;
  return count;
}

/** 排序不改变入参，返回新数组。 */
export function sortFriends(friends, sortKey = "recent", now = new Date()) {
  const list = friends.slice();
  switch (sortKey) {
    case "name":
      return list.sort((a, b) => a.name.localeCompare(b.name, "zh-Hans-CN"));
    case "age":
      return list.sort((a, b) => {
        const ageA = ageOf(a.birthday, now);
        const ageB = ageOf(b.birthday, now);
        if (ageA === null && ageB === null) return a.name.localeCompare(b.name, "zh-Hans-CN");
        if (ageA === null) return 1;
        if (ageB === null) return -1;
        return ageA - ageB;
      });
    case "province":
      return list.sort(
        (a, b) =>
          a.province.localeCompare(b.province, "zh-Hans-CN") ||
          a.city.localeCompare(b.city, "zh-Hans-CN") ||
          a.name.localeCompare(b.name, "zh-Hans-CN")
      );
    case "recent":
    default:
      return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
}

export function toggleValue(values, value) {
  return values.includes(value) ? values.filter((item) => item !== value) : values.concat(value);
}
