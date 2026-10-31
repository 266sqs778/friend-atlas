/** 零依赖测试运行器：同一套用例可在浏览器与 Node 中运行。 */

const registry = [];

export function test(name, fn) {
  registry.push({ name, fn });
}

function show(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return String(value);
  }
}

export const assert = {
  ok(value, message = "期望为真值") {
    if (!value) throw new Error(message);
  },
  equal(actual, expected, message = "") {
    if (actual !== expected) {
      throw new Error(`${message} 期望 ${show(expected)}，实际 ${show(actual)}`.trim());
    }
  },
  deepEqual(actual, expected, message = "") {
    if (show(actual) !== show(expected)) {
      throw new Error(`${message} 期望 ${show(expected)}，实际 ${show(actual)}`.trim());
    }
  },
  throws(fn, message = "期望抛出异常") {
    let thrown = false;
    try {
      fn();
    } catch (error) {
      thrown = true;
    }
    if (!thrown) throw new Error(message);
  }
};

export async function run() {
  const results = [];
  for (const item of registry) {
    try {
      await item.fn();
      results.push({ name: item.name, ok: true });
    } catch (error) {
      results.push({ name: item.name, ok: false, error: error && error.message ? error.message : String(error) });
    }
  }
  const passed = results.filter((item) => item.ok).length;
  return { results, passed, failed: results.length - passed };
}

export function total() {
  return registry.length;
}
