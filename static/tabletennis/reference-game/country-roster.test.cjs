const { test } = require("node:test");
const assert = require("node:assert/strict");
const { boot } = require("./verify.cjs");

test("Australia replaces Russia in the country chooser, Finals draws and World tour", async () => {
  const h = await boot(1440, 900), c = h.context;
  const flags = c.countryFlags, ru = flags.getIdFromISO("RU"), au = flags.getIdFromISO("AU");
  assert.equal(flags.aIds.length, 40);
  assert.equal(new Set(flags.aIds).size, 40);
  assert.equal(flags.aIds.includes(ru), false);
  assert.equal(flags.aIds[16], au, "Australia takes Russia's chooser slot");
  assert.equal(flags.aAllCountryCodes[au], "AU");
  for (const cup of c.aEnemyCountries) assert.equal(cup.includes("RU"), false);
  assert.equal(c.aEnemyCountries[9][5], "SE");

  c.butEventHandler("playFromStart", {});
  c.butEventHandler("countryChoice", { id: 16 });
  assert.equal(c.oGameData.userId, au);
  assert.match(h.flow.innerHTML, /Australia/);
  h.click("finals");
  h.click("difficulty", { level: "medium" });
  const draw = c.TableTennisModes.finals.rounds[0].flatMap(match => [match.home, match.away]);
  assert.equal(draw.includes(au), true);
  assert.equal(draw.includes(ru), false);
});

test("a saved Russia selection is sent back to the country chooser", async () => {
  const h = await boot(1440, 900), c = h.context;
  c.oGameData.userId = c.countryFlags.getIdFromISO("RU");
  c.initStartScreen();
  h.click("play");
  assert.equal(c.gameState, "chooseCountry");
});
