/** 纯函数格式化工具：日期、年龄、姓名首字。全部无副作用，便于单测。 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** 解析 YYYY-MM-DD 为本地日期，避免时区把日期推前/推后一天。 */
export function parseISODate(value) {
  if (typeof value !== "string") return null;
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

export function isValidBirthday(value) {
  const date = parseISODate(value);
  if (!date) return false;
  return date.getTime() <= Date.now();
}

/** 周岁：未过生日则减一岁；生日缺失或非法时返回 null。 */
export function ageOf(birthday, now = new Date()) {
  const date = parseISODate(birthday);
  if (!date) return null;
  let age = now.getFullYear() - date.getFullYear();
  const monthDiff = now.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 && age < 130 ? age : null;
}

export function formatBirthday(birthday) {
  const date = parseISODate(birthday);
  if (!date) return "—";
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function formatMonthDay(birthday) {
  const date = parseISODate(birthday);
  if (!date) return "—";
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
}

export function initialOf(name) {
  const trimmed = String(name || "").trim();
  return trimmed ? Array.from(trimmed)[0] : "?";
}

export function percent(part, total) {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
