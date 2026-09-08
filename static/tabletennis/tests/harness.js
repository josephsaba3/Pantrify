(() => {
  "use strict";
  let suite = "";
  const results = [];
  window.BrowserTests = {
    results,
    assert: {
      equal(actual, expected, message = "Values should match") {
        if (!Object.is(actual, expected)) throw new Error(`${message}: expected ${expected}, got ${actual}`);
      },
      ok(value, message = "Expected a truthy value") {
        if (!value) throw new Error(message);
      },
    },
    describe(name, run) {
      suite = name;
      run();
    },
    it(name, run) {
      const row = document.createElement("li");
      try {
        run();
        results.push({ suite, name, passed: true });
        row.textContent = `PASS — ${suite}: ${name}`;
      } catch (error) {
        results.push({ suite, name, passed: false, error: error.message });
        row.textContent = `FAIL — ${suite}: ${name}: ${error.message}`;
        row.style.color = "#b00020";
      }
      document.querySelector("#results").append(row);
      const failed = results.filter(result => !result.passed).length;
      document.querySelector("#summary").textContent = `${results.length - failed} passed, ${failed} failed`;
    },
  };
  window.addEventListener("error", event => {
    document.querySelector("#summary").textContent = `ERROR — ${event.message || "Could not load a test script"}`;
  }, true);
})();
