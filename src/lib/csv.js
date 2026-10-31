import { GENDERS, RELATIONSHIPS, isValidRegion } from "../data/provinces.js";
import { normalizeFriend } from "./model.js";
import { parseISODate } from "./format.js";

export const CSV_HEADERS = ["姓名", "性别", "生日", "省份", "城市", "关系", "备注"];

const FIELD_ORDER = ["name", "gender", "birthday", "province", "city", "relationship", "notes"];

const HEADER_ALIASES = {
  name: ["姓名", "名字", "name"],
  gender: ["性别", "gender", "sex"],
  birthday: ["生日", "出生日期", "birthday", "birth"],
  province: ["省份", "省", "province"],
  city: ["城市", "市", "city"],
  relationship: ["关系", "relationship", "relation"],
  notes: ["备注", "notes", "note", "remark"]
};

/** RFC4180 风格的 CSV 解析，支持引号包裹与字段内换行。 */
export function parseCSV(text) {
  const input = String(text === undefined || text === null ? "" : text).replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((cells) => cells.some((value) => String(value).trim() !== ""));
}

function escapeCell(value) {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeCSV(rows) {
  return rows.map((row) => row.map(escapeCell).join(",")).join("\r\n");
}

/** 导出 CSV：带 BOM，Excel 直接打开不乱码。 */
export function friendsToCSV(friends) {
  const rows = [CSV_HEADERS].concat(
    friends.map((friend) => FIELD_ORDER.map((field) => friend[field] || ""))
  );
  return `\uFEFF${serializeCSV(rows)}`;
}

function detectHeader(row) {
  const normalized = row.map((cell) => String(cell).trim().toLowerCase());
  const mapping = {};
  let matched = 0;
  Object.keys(HEADER_ALIASES).forEach((field) => {
    const index = normalized.findIndex((cell) => HEADER_ALIASES[field].includes(cell));
    if (index >= 0) {
      mapping[field] = index;
      matched += 1;
    }
  });
  return matched >= 3 ? mapping : null;
}

function pick(row, mapping, field, fallbackIndex) {
  // 识别到表头时严格按表头映射，缺失的列视为空；无表头时才按固定列序。
  const index = mapping ? mapping[field] : fallbackIndex;
  if (index === undefined) return "";
  const value = row[index];
  return value === undefined || value === null ? "" : String(value).trim();
}

function rowToFriend(row, mapping) {
  const draft = {
    name: pick(row, mapping, "name", 0),
    gender: pick(row, mapping, "gender", 1),
    birthday: pick(row, mapping, "birthday", 2),
    province: pick(row, mapping, "province", 3),
    city: pick(row, mapping, "city", 4),
    relationship: pick(row, mapping, "relationship", 5),
    notes: pick(row, mapping, "notes", 6)
  };

  if (!draft.name) return { error: "缺少姓名" };
  if (!GENDERS.includes(draft.gender)) return { error: "性别需为 男 / 女 / 其他" };
  if (!draft.province) return { error: "缺少省份" };
  if (!draft.city) return { error: "缺少城市" };
  if (!isValidRegion(draft.province, draft.city)) return { error: "省份与城市不匹配" };
  if (!RELATIONSHIPS.includes(draft.relationship)) return { error: "关系不在可选范围内" };
  if (draft.birthday && !parseISODate(draft.birthday)) return { error: "生日应为 YYYY-MM-DD" };

  return { friend: normalizeFriend(draft) };
}

/** CSV 文本 -> 好友数组 + 逐条跳过原因，便于向用户透明汇报。 */
export function parseFriendsCSV(text) {
  const rows = parseCSV(text);
  if (rows.length === 0) return { friends: [], skipped: [], total: 0 };

  const mapping = detectHeader(rows[0]);
  const body = mapping ? rows.slice(1) : rows;
  const friends = [];
  const skipped = [];

  body.forEach((row, index) => {
    const recordIndex = index + 1;
    if (row.every((cell) => String(cell).trim() === "")) return;
    const result = rowToFriend(row, mapping);
    if (result.error) skipped.push({ record: recordIndex, reason: result.error });
    else friends.push(result.friend);
  });

  return { friends, skipped, total: body.length };
}

/** JSON 备份导出，保留 id / 时间戳等全部字段。 */
export function friendsToJSON(friends) {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), friends }, null, 2);
}

export function parseFriendsJSON(text) {
  let payload;
  try {
    payload = JSON.parse(String(text).replace(/^\uFEFF/, ""));
  } catch (error) {
    throw new Error("JSON 解析失败，请检查文件内容");
  }
  const list = Array.isArray(payload) ? payload : payload && Array.isArray(payload.friends) ? payload.friends : null;
  if (!list) throw new Error("JSON 结构不正确，应为 { friends: [...] }");

  const friends = [];
  const skipped = [];
  list.forEach((item, index) => {
    const friend = normalizeFriend(item || {});
    if (!friend.name || !friend.province || !friend.city) {
      skipped.push({ record: index + 1, reason: "缺少姓名或地区" });
      return;
    }
    friends.push(friend);
  });
  return { friends, skipped, total: list.length };
}

export function downloadFile(filename, content, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function timestampForFilename(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
}
