// Optional headless logic checks: node tests/run.cjs. The game itself needs no Node.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const context = vm.createContext({
  console,
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  document: { createElement: () => ({ style: {} }), querySelector: () => ({ append() {} }) }
});
// Use the browser runner's script list so the same tests run in both environments.
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");
for (const [, source] of html.matchAll(/<script src="([^"]+)"/g)) {
  const filename = path.resolve(__dirname, source);
  vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });
}
const results = context.window.BrowserTests.results;
for (const result of results.filter(test => !test.passed)) console.error(`FAIL: ${result.suite}: ${result.name}: ${result.error}`);
const failed = results.filter(test => !test.passed).length;
console.log(`${results.length - failed} passed, ${failed} failed (logic tests; no browser rendering)`);
process.exitCode = failed ? 1 : 0;
