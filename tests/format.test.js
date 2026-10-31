import { test, assert } from "./harness.js";
import { ageOf, formatBirthday, initialOf, isValidBirthday, parseISODate, percent } from "../src/lib/format.js";

test("parseISODate 拒绝不存在的日期", () => {
  assert.equal(parseISODate("2026-02-30"), null);
  assert.equal(parseISODate("2026-13-01"), null);
  assert.equal(parseISODate("1996/04/12"), null);
});

test("parseISODate 解析本地日期", () => {
  const date = parseISODate("1996-04-12");
  assert.ok(date instanceof Date);
  assert.equal(date.getFullYear(), 1996);
  assert.equal(date.getMonth(), 3);
  assert.equal(date.getDate(), 12);
});

test("ageOf 在生日前后正确计算周岁", () => {
  const before = new Date(2026, 3, 11);
  const after = new Date(2026, 3, 12);
  assert.equal(ageOf("1996-04-12", before), 29);
  assert.equal(ageOf("1996-04-12", after), 30);
  assert.equal(ageOf("", after), null);
  assert.equal(ageOf("1996-04-12"), ageOf("1996-04-12", new Date()));
});

test("formatBirthday 与 initialOf 输出稳定", () => {
  assert.equal(formatBirthday("1996-04-12"), "1996/04/12");
  assert.equal(formatBirthday("bad"), "—");
  assert.equal(initialOf("林小满"), "林");
  assert.equal(initialOf("  "), "?");
});

test("isValidBirthday 不接受未来日期", () => {
  assert.equal(isValidBirthday("1996-04-12"), true);
  assert.equal(isValidBirthday("2999-01-01"), false);
  assert.equal(isValidBirthday(""), false);
});

test("percent 保留一位小数", () => {
  assert.equal(percent(1, 3), 33.3);
  assert.equal(percent(0, 0), 0);
});
