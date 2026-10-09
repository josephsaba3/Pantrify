// Adjust the supplied country roster without modifying the game bundle.
(() => {
  "use strict";
  const replace = (list, from, to) => {
    const index = list.indexOf(from);
    if (index >= 0) list[index] = to;
  };
  // Australia takes Russia's slot in the country chooser, so the flag grid keeps its layout.
  replace(countryFlags.aIds, countryFlags.getIdFromISO("RU"), countryFlags.getIdFromISO("AU"));
  // Sweden replaces Russia as the World tour's final opponent; Australia already plays in the Oceania cup.
  for (const cup of aEnemyCountries) replace(cup, "RU", "SE");
})();
