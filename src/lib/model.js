import { createId } from "./dom.js";
import { parseISODate } from "./format.js";
import { GENDERS, RELATIONSHIPS, isValidRegion } from "../data/provinces.js";

export const COLLECTION_VERSION = 1;

/** 把任意来源的数据收敛成固定字段结构，防止脏数据进入视图层。 */
export function normalizeFriend(raw = {}) {
  const now = new Date().toISOString();
  return {
    id: String(raw.id || createId()),
    name: String(raw.name || "").trim().slice(0, 20),
    gender: GENDERS.includes(raw.gender) ? raw.gender : "",
    birthday: parseISODate(raw.birthday) ? String(raw.birthday).trim() : "",
    province: String(raw.province || "").trim(),
    city: String(raw.city || "").trim(),
    relationship: RELATIONSHIPS.includes(raw.relationship) ? raw.relationship : "",
    notes: String(raw.notes || "").trim().slice(0, 500),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || raw.createdAt || now
  };
}

/** 表单/导入数据的业务校验，返回人类可读的错误列表。 */
export function validateFriend(friend) {
  const errors = [];
  if (!friend.name) errors.push("请填写姓名");
  else if (friend.name.length > 20) errors.push("姓名不能超过 20 个字符");
  if (!GENDERS.includes(friend.gender)) errors.push("请选择性别");
  if (!RELATIONSHIPS.includes(friend.relationship)) errors.push("请选择关系");
  if (!friend.province) errors.push("请选择省份");
  if (!friend.city) errors.push("请选择城市");
  if (friend.province && friend.city && !isValidRegion(friend.province, friend.city)) {
    errors.push("省份与城市不匹配");
  }
  if (friend.birthday) {
    const date = parseISODate(friend.birthday);
    if (!date) errors.push("生日格式不正确");
    else if (date.getTime() > Date.now()) errors.push("生日不能晚于今天");
  }
  return errors;
}

/** 去重键：姓名 + 省份 + 城市，避免重复导入同一个人。 */
export function uniquenessKey(friend) {
  return [friend.name, friend.province, friend.city].join("|");
}

export function dedupeFriends(incoming, existing) {
  const seen = new Set(existing.map(uniquenessKey));
  const fresh = [];
  let duplicates = 0;
  incoming.forEach((friend) => {
    const key = uniquenessKey(friend);
    if (seen.has(key)) {
      duplicates += 1;
      return;
    }
    seen.add(key);
    fresh.push(friend);
  });
  return { fresh, duplicates };
}
