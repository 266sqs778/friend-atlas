// Node 运行入口：node tests/run.mjs
import { run } from "./harness.js";
import "./suite.js";

const { results, passed, failed } = await run();

results.forEach((item) => {
  console.log(`${item.ok ? "✓" : "✗"} ${item.name}${item.ok ? "" : `\n    ${item.error}`}`);
});

console.log(`\n${passed} passed, ${failed} failed, ${results.length} total`);
process.exitCode = failed > 0 ? 1 : 0;
