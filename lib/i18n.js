export const baseUiText = {
  en: {
    startYear: 'Start Year',
    endYear: 'End Year',
    region: 'Region',
    country: 'Country',
    language: 'Language',
    score: 'Score',
    playAgain: 'Play Again',
    allRegions: 'All regions',
    allCountries: 'All countries',
    allContinent: 'All {continent}',
    checkingPool: 'Checking pool…',
    continentAfrica: 'Africa',
    continentAmericas: 'Americas',
    continentAsia: 'Asia',
    continentEurope: 'Europe',
    continentOceania: 'Oceania',
  },
  cs: {
    startYear: 'Od roku',
    endYear: 'Do roku',
    region: 'Region',
    country: 'Země',
    language: 'Jazyk',
    score: 'Skóre',
    playAgain: 'Hrát znovu',
    allRegions: 'Všechny regiony',
    allCountries: 'Všechny země',
    allContinent: 'Celá {continent}',
    checkingPool: 'Kontroluji dostupnost...',
    continentAfrica: 'Afrika',
    continentAmericas: 'Amerika',
    continentAsia: 'Asie',
    continentEurope: 'Evropa',
    continentOceania: 'Oceánie',
  },
  it: {
    startYear: 'Anno inizio',
    endYear: 'Anno fine',
    region: 'Regione',
    country: 'Paese',
    language: 'Lingua',
    score: 'Punteggio',
    playAgain: 'Gioca ancora',
    allRegions: 'Tutte le regioni',
    allCountries: 'Tutti i paesi',
    allContinent: 'Tutta {continent}',
    checkingPool: 'Controllo disponibilità...',
    continentAfrica: 'Africa',
    continentAmericas: 'Americhe',
    continentAsia: 'Asia',
    continentEurope: 'Europa',
    continentOceania: 'Oceania',
  },
};

export function makeT(dictionary, langGetter) {
  function t(key) {
    const l = langGetter();
    return dictionary[l]?.[key] ?? dictionary.en[key] ?? key;
  }
  function tf(key, vars = {}) {
    let text = t(key);
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    return text;
  }
  return { t, tf };
}