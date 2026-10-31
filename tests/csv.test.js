import { test, assert } from "./harness.js";
import {
  CSV_HEADERS,
  friendsToCSV,
  parseCSV,
  parseFriendsCSV,
  parseFriendsJSON,
  serializeCSV
} from "../src/lib/csv.js";

test("parseCSV 解析基础行列", () => {
  assert.deepEqual(parseCSV("a,b\n1,2"), [["a", "b"], ["1", "2"]]);
});

test("parseCSV 支持引号内的逗号与换行", () => {
  const rows = parseCSV('姓名,备注\n张三,"含,逗号"\n李四,"第一行\n第二行"');
  assert.deepEqual(rows[1], ["张三", "含,逗号"]);
  assert.deepEqual(rows[2], ["李四", "第一行\n第二行"]);
});

test("parseCSV 还原转义的双引号并忽略 CRLF 的 CR", () => {
  const rows = parseCSV('a,b\r\n1,"他说""你好"""');
  assert.deepEqual(rows, [["a", "b"], ["1", '他说"你好"']]);
});

test("parseCSV 去掉 BOM 并丢弃纯空行", () => {
  const rows = parseCSV("\uFEFF姓名,性别\n\n张三,男\n");
  assert.deepEqual(rows, [["姓名", "性别"], ["张三", "男"]]);
});

test("serializeCSV 对特殊字符加引号", () => {
  assert.equal(serializeCSV([["a", "b,c"], ['x"y', "z"]]), 'a,"b,c"\r\n"x""y",z');
});

test("friendsToCSV 带 BOM 与固定表头", () => {
  const csv = friendsToCSV([
    { name: "林小满", gender: "女", birthday: "1996-04-12", province: "北京市", city: "朝阳区", relationship: "同学", notes: "备注" }
  ]);
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.equal(csv.slice(1).split("\r\n")[0], CSV_HEADERS.join(","));
  assert.ok(csv.includes("林小满,女,1996-04-12,北京市,朝阳区,同学,备注"));
});

test("parseFriendsCSV 按中文表头映射并保留有效记录", () => {
  const text = "姓名,性别,生日,省份,城市,关系,备注\n林小满,女,1996-04-12,北京市,朝阳区,同学,同班\n陈一诺,男,,上海市,浦东新区,同事,";
  const result = parseFriendsCSV(text);
  assert.equal(result.total, 2);
  assert.equal(result.friends.length, 2);
  assert.equal(result.skipped.length, 0);
  assert.equal(result.friends[0].name, "林小满");
  assert.equal(result.friends[1].birthday, "");
  assert.ok(result.friends[0].id);
});

test("parseFriendsCSV 支持英文表头与列顺序无关", () => {
  const text = "city,name,province,gender,relationship\n杭州市,沈知夏,浙江省,女,同学";
  const result = parseFriendsCSV(text);
  assert.equal(result.friends.length, 1);
  assert.equal(result.friends[0].city, "杭州市");
  assert.equal(result.friends[0].province, "浙江省");
});

test("parseFriendsCSV 跳过地区不匹配或缺字段的行并给出原因", () => {
  const text = "姓名,性别,生日,省份,城市,关系,备注\n甲,女,,北京市,杭州市,同学,\n乙,女,,北京市,朝阳区,同学,";
  const result = parseFriendsCSV(text);
  assert.equal(result.friends.length, 1);
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "省份与城市不匹配");
});

test("parseFriendsCSV 拒绝非法生日", () => {
  const result = parseFriendsCSV("姓名,性别,生日,省份,城市,关系\n甲,女,1996-02-30,北京市,朝阳区,同学");
  assert.equal(result.friends.length, 0);
  assert.equal(result.skipped[0].reason, "生日应为 YYYY-MM-DD");
});

test("parseFriendsJSON 接受数组与对象两种结构", () => {
  const asArray = parseFriendsJSON(JSON.stringify([{ name: "甲", gender: "女", province: "北京市", city: "朝阳区", relationship: "朋友" }]));
  assert.equal(asArray.friends.length, 1);
  assert.equal(asArray.skipped.length, 0);

  const asObject = parseFriendsJSON(JSON.stringify({ friends: [{ name: "乙", province: "上海市", city: "徐汇区" }] }));
  assert.equal(asObject.friends.length, 1);
});

test("parseFriendsJSON 对损坏内容抛出可读错误", () => {
  assert.throws(() => parseFriendsJSON("{oops"));
});
