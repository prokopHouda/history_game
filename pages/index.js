import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Home() {
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      document.getElementById('loading').textContent = 'Missing Supabase env vars';
      return;
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    const MIN_EVENTS = 25;

    let allEvents = [];
    let events = [];
    let a, b, earlierId;
    let score = 0, streak = 0, locked = false;
    let transCache = {};

    const MILESTONES = {
      5:  { name: 'History Noob',          badge: '🌱' },
      10: { name: 'Time Traveler',         badge: '⏳' },
      15: { name: 'History Buff',          badge: '📚' },
      20: { name: 'Chronicle Keeper',      badge: '📜' },
      25: { name: 'Timeline Warrior',      badge: '⚔️' },
      30: { name: 'Century Sage',          badge: '🧙' },
      35: { name: 'Era Conqueror',         badge: '🛡️' },
      40: { name: 'Living Legend',         badge: '🔥' },
      45: { name: 'Immortal Historian',    badge: '👑' },
      50: { name: 'King of Historical Knowledge', badge: '🏆' }
    };

    function getMilestone(s) {
      if (s >= 50) return MILESTONES[50];
      const level = Math.floor(s / 5) * 5;
      return MILESTONES[level] || null;
    }

    function getNextMilestone(s) {
      if (s >= 50) return null;
      const next = (Math.floor(s / 5) + 1) * 5;
      return MILESTONES[next] || null;
    }

    const UI = {
      en: {
        title: 'Which happened earlier?',
        subtitle: 'Pick the older historical event',
        loading: 'Loading events from Supabase…',
        settingsTitle: '⚙️ Game Settings',
        startYear: 'Start Year',
        endYear: 'End Year',
        region: 'Region',
        country: 'Country',
        language: 'Language',
        startGame: 'Start Game',
        score: 'Score',
        streak: 'Streak',
        streakProgress: '🔥 Rank Progress',
        nextReward: 'Next rank',
        milestone: 'Milestone',
        reached: 'reached!',
        correct: 'Correct!',
        wrong: 'Wrong —',
        earlierThan: 'was earlier than',
        or: 'or',
        next: 'Next →',
        filters: '⚙️ Filters',
        youWon: 'You Won!',
        winSubtitle: 'You reached a streak of 50!',
        playAgain: 'Play Again',
        eventsAvailable: 'events available',
        needMore: 'Pick broader filters — need at least',
        toPlay: 'to play'
      },
      cs: {
        title: 'Co se stalo dříve?',
        subtitle: 'Vyber starší historickou událost',
        loading: 'Načítání událostí ze Supabase…',
        settingsTitle: '⚙️ Nastavení hry',
        startYear: 'Od roku',
        endYear: 'Do roku',
        region: 'Region',
        country: 'Země',
        language: 'Jazyk',
        startGame: 'Spustit hru',
        score: 'Skóre',
        streak: 'Série',
        streakProgress: '🔥 Průběh hodnosti',
        nextReward: 'Další hodnost',
        milestone: 'Milník',
        reached: 'dosažen!',
        correct: 'Správně!',
        wrong: 'Špatně —',
        earlierThan: 'bylo dříve než',
        or: 'nebo',
        next: 'Další →',
        filters: '⚙️ Filtry',
        youWon: 'Vyhrál jsi!',
        winSubtitle: 'Dosáhl jsi série 50!',
        playAgain: 'Hrát znovu',
        eventsAvailable: 'událostí k dispozici',
        needMore: 'Vyber méně restriktivní filtry — potřebuješ alespoň',
        toPlay: 'k hraní'
      },
      it: {
        title: 'Quale è avvenuto prima?',
        subtitle: "Scegli l'evento storico più antico",
        loading: 'Caricamento eventi da Supabase…',
        settingsTitle: '⚙️ Impostazioni di gioco',
        startYear: 'Anno inizio',
        endYear: 'Anno fine',
        region: 'Regione',
        country: 'Paese',
        language: 'Lingua',
        startGame: 'Inizia',
        score: 'Punteggio',
        streak: 'Serie',
        streakProgress: '🔥 Progresso grado',
        nextReward: 'Prossimo grado',
        milestone: 'Traguardo',
        reached: 'raggiunto!',
        correct: 'Corretto!',
        wrong: 'Sbagliato —',
        earlierThan: 'era prima di',
        or: 'oppure',
        next: 'Avanti →',
        filters: '⚙️ Filtri',
        youWon: 'Hai Vinto!',
        winSubtitle: 'Hai raggiunto una serie di 50!',
        playAgain: 'Gioca ancora',
        eventsAvailable: 'eventi disponibili',
        needMore: 'Allarga i filtri — servono almeno',
        toPlay: 'per giocare'
      }
    };

    function lang() {
      return localStorage.getItem('gameLang') || 'en';
    }

    function t(key) {
      return UI[lang()]?.[key] || UI.en[key];
    }

    function renderLabels() {
      document.title = t('title');
      const h1 = document.querySelector('h1');
      if (h1) h1.textContent = t('title');
      const subtitle = document.querySelector('.subtitle');
      if (subtitle) subtitle.textContent = t('subtitle');
      const loading = document.getElementById('loading');
      if (loading) loading.textContent = t('loading');
      const settingsH2 = document.querySelector('#settings h2');
      if (settingsH2) settingsH2.textContent = t('settingsTitle');
      const startYearLabel = document.querySelector('label[for="startYear"]');
      if (startYearLabel) startYearLabel.textContent = t('startYear');
      const endYearLabel = document.querySelector('label[for="endYear"]');
      if (endYearLabel) endYearLabel.textContent = t('endYear');
      const regionLabel = document.querySelector('label[for="regionFilter"]');
      if (regionLabel) regionLabel.textContent = t('region');
      const countryLabel = document.querySelector('label[for="countryFilter"]');
      if (countryLabel) countryLabel.textContent = t('country');
      const langLabel = document.querySelector('label[for="langSelect"]');
      if (langLabel) langLabel.textContent = t('language');
      const startBtn = document.getElementById('startBtn');
      if (startBtn) startBtn.textContent = t('startGame');
      const nextBtn = document.getElementById('nextBtn');
      if (nextBtn) nextBtn.textContent = t('next');
      const settingsBtn = document.getElementById('settingsBtn');
      if (settingsBtn) settingsBtn.textContent = t('filters');
      const labelScore = document.getElementById('labelScore');
      if (labelScore) labelScore.textContent = t('score');
      const labelStreak = document.getElementById('labelStreak');
      if (labelStreak) labelStreak.textContent = t('streak');
      const streakTitle = document.querySelector('.streak-title');
      if (streakTitle) streakTitle.textContent = t('streakProgress');
      const vs = document.querySelector('.vs');
      if (vs) vs.textContent = t('or');
    }

    function getEventYear(e) {
      if (e.date) return parseInt(e.date.split('-')[0], 10);
      return e.year ?? 0;
    }

    function getTime(e) {
      if (e.date) return Date.parse(e.date + 'T00:00:00Z');
      const y = String(e.year).padStart(4, '0');
      return Date.parse(`${y}-01-01T00:00:00Z`);
    }

    function getLabel(e) {
      return e.date ? e.date : `Year ${e.year}`;
    }

    function countMatchingEvents() {
      const startYear = parseInt(document.getElementById('startYear').value, 10) || null;
      const endYear = parseInt(document.getElementById('endYear').value, 10) || null;
      const region = document.getElementById('regionFilter').value;
      const country = document.getElementById('countryFilter').value;

      if (startYear !== null && endYear !== null && startYear > endYear) {
        return { count: 0, valid: false };
      }

      const count = allEvents.filter((e) => {
        const y = getEventYear(e);
        if (startYear !== null && y < startYear) return false;
        if (endYear !== null && y > endYear) return false;
        if (region && e.region !== region) return false;
        if (country) {
          const list = (e.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
          if (!list.includes(country)) return false;
        }
        return true;
      }).length;

      return { count, valid: count >= MIN_EVENTS };
    }

    function updatePoolCounter() {
      const { count, valid } = countMatchingEvents();
      const counterEl = document.getElementById('poolCounter');
      const startBtn = document.getElementById('startBtn');

      if (valid) {
        counterEl.textContent = `${count} ${t('eventsAvailable')} ✅`;
        counterEl.style.color = '#34d399';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
      } else {
        counterEl.textContent = `${t('needMore')} ${MIN_EVENTS} ${t('toPlay')} (${count}) ❌`;
        counterEl.style.color = '#f87171';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
      }
    }

    function populateFilters(data) {
      const regions = [...new Set(data.map((e) => e.region).filter(Boolean))].sort();
      const regionSel = document.getElementById('regionFilter');
      regionSel.innerHTML = '<option value="">All regions</option>';
      regions.forEach((r) => {
        const opt = document.createElement('option');
        opt.value = r;
        opt.textContent = r;
        regionSel.appendChild(opt);
      });

      const countrySet = new Set();
      data.forEach((e) => {
        if (e.countries) {
          e.countries.split(',').forEach((c) => {
            const code = c.trim();
            if (code) countrySet.add(code);
          });
        }
      });
      const countries = [...countrySet].sort();
      const countrySel = document.getElementById('countryFilter');
      countrySel.innerHTML = '<option value="">All countries</option>';
      countries.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        countrySel.appendChild(opt);
      });

      const savedLang = localStorage.getItem('gameLang') || 'en';
      document.getElementById('langSelect').value = savedLang;

      updatePoolCounter();
    }

    async function applyFilters() {
      const selectedLang = document.getElementById('langSelect').value;
      localStorage.setItem('gameLang', selectedLang);
      renderLabels();

      const { count, valid } = countMatchingEvents();
      const errorEl = document.getElementById('settingsError');

      if (!valid) {
        errorEl.textContent = `${t('needMore')} ${MIN_EVENTS} ${t('toPlay')} (${count})`;
        return;
      }

      const startYear = parseInt(document.getElementById('startYear').value, 10) || null;
      const endYear = parseInt(document.getElementById('endYear').value, 10) || null;
      const region = document.getElementById('regionFilter').value;
      const country = document.getElementById('countryFilter').value;

      events = allEvents.filter((e) => {
        const y = getEventYear(e);
        if (startYear !== null && y < startYear) return false;
        if (endYear !== null && y > endYear) return false;
        if (region && e.region !== region) return false;
        if (country) {
          const list = (e.countries || '').split(',').map((c) => c.trim()).filter(Boolean);
          if (!list.includes(country)) return false;
        }
        return true;
      });

      errorEl.textContent = '';
      score = 0;
      streak = 0;
      transCache = {};
      document.getElementById('score').textContent = '0';
      document.getElementById('streak').textContent = '0';

      document.getElementById('settings').classList.add('hidden');
      document.getElementById('game').classList.remove('hidden');
      updateStreakBar();
      await nextRound();
    }

    function pickPair() {
      let i = Math.floor(Math.random() * events.length);
      let j = Math.floor(Math.random() * events.length);
      let guard = 0;
      while (j === i) {
        j = Math.floor(Math.random() * events.length);
        if (++guard > 1000) throw new Error('Stuck picking pair');
      }
      return [events[i], events[j]];
    }

    async function maybeTranslate(pair) {
      const l = lang();
      if (l === 'en') return pair;

      const ids = pair.map((e) => e.id).join(',');
      const missing = pair.filter((e) => !transCache[`${e.id}-${l}`]);

      if (missing.length > 0) {
        try {
          const res = await fetch(`/api/translate?ids=${ids}&lang=${l}`);
          const data = await res.json();
          Object.entries(data).forEach(([id, tr]) => {
            transCache[`${id}-${l}`] = tr;
          });
        } catch (err) {
          console.error('Translate fetch failed', err);
        }
      }

      return pair.map((e) => {
        const tr = transCache[`${e.id}-${l}`];
        if (!tr) return e;
        return { ...e, short_name: tr.short_name, description: tr.description };
      });
    }

    function render([e1, e2]) {
      a = e1; b = e2;
      locked = false;
      earlierId = getTime(a) < getTime(b) ? a.id : b.id;

      document.getElementById('nameA').textContent = a.short_name;
      document.getElementById('descA').textContent = a.description;
      document.getElementById('metaA').textContent = getLabel(a);
      document.getElementById('metaA').style.display = 'none';
      document.getElementById('cardA').className = 'card';

      document.getElementById('nameB').textContent = b.short_name;
      document.getElementById('descB').textContent = b.description;
      document.getElementById('metaB').textContent = getLabel(b);
      document.getElementById('metaB').style.display = 'none';
      document.getElementById('cardB').className = 'card';

      document.getElementById('feedback').textContent = '';
      document.getElementById('nextBtn').style.display = 'none';
    }

    function updateStreakBar() {
      const fill = document.getElementById('streakFill');
      const text = document.getElementById('milestoneText');
      const current = getMilestone(streak);
      const next = getNextMilestone(streak);

      if (streak > 0 && streak % 5 === 0 && current) {
        fill.style.width = '100%';
        fill.classList.add('milestone-glow');
        text.textContent = `🎉 ${current.badge} ${current.name} — ${t('milestone')} ${streak} ${t('reached')}`;
      } else {
        fill.classList.remove('milestone-glow');
        const mod = streak % 5;
        const pct = (mod / 5) * 100;
        fill.style.width = pct + '%';
        if (next && streak < 50) {
          text.textContent = `${next.badge} ${next.name} — ${t('nextReward')} ${Math.ceil(streak / 5) * 5}`;
        } else if (streak >= 50) {
          const final = MILESTONES[50];
          text.textContent = `👑 ${final.badge} ${final.name}`;
        } else {
          const first = MILESTONES[5];
          text.textContent = `${first.badge} ${first.name} — ${t('nextReward')} 5`;
        }
      }
    }

    function spawnConfetti() {
      const box = document.getElementById('confetti-box');
      box.innerHTML = '';
      const palette = ['#f87171','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6'];
      for (let i = 0; i < 50; i++) {
        const el = document.createElement('div');
        el.className = 'confetti';
        el.style.left = `calc(50% + ${(Math.random() - 0.5) * 30}vw)`;
        el.style.backgroundColor = palette[Math.floor(Math.random() * palette.length)];
        const size = 6 + Math.random() * 8;
        el.style.width = size + 'px';
        el.style.height = size + 'px';
        el.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
        el.style.animationDuration = (2 + Math.random() * 2) + 's';
        el.style.animationDelay = (Math.random() * 0.3) + 's';
        box.appendChild(el);
      }
      setTimeout(() => { box.innerHTML = ''; }, 4500);
    }

    function triggerCelebration(number) {
      const overlay = document.getElementById('celebrationOverlay');
      const ms = MILESTONES[number];
      if (ms) {
        document.getElementById('celebrationBadge').innerHTML =
          `<div style="font-size:0.45em;margin-bottom:0.2em;opacity:0.9">${ms.badge} ${ms.name}</div>🔥 ${t('streak').toUpperCase()} ${number} 🔥`;
      } else {
        document.getElementById('celebrationBadge').textContent =
          `🔥 ${t('streak').toUpperCase()} ${number} 🔥`;
      }
      overlay.classList.remove('hidden');
      spawnConfetti();
      setTimeout(() => {
        overlay.classList.add('hidden');
        updateStreakBar();
      }, 2500);
    }

    function showWin() {
      document.getElementById('winOverlay').classList.remove('hidden');
    }

    function hideWin() {
      document.getElementById('winOverlay').classList.add('hidden');
    }

    function showLoader() {
      document.getElementById('loadingOverlay').classList.remove('hidden');
      document.getElementById('loadingOverlay').style.opacity = '1';
    }

    function hideLoader() {
      document.getElementById('loadingOverlay').classList.add('hidden');
      document.getElementById('loadingOverlay').style.opacity = '0';
    }

    function guess(side) {
      if (locked) return;
      locked = true;

      const chosen = side === 'A' ? a : b;
      const isCorrect = chosen.id === earlierId;
      const earlier = earlierId === a.id ? a : b;
      const later = earlierId === a.id ? b : a;

      document.getElementById('metaA').style.display = 'block';
      document.getElementById('metaB').style.display = 'block';

      document.getElementById('card' + (earlier === a ? 'A' : 'B')).classList.add('correct');
      if (!isCorrect) {
        document.getElementById('card' + side).classList.add('wrong');
        streak = 0;
        document.getElementById('feedback').textContent =
          `${t('wrong')} ${earlier.short_name} (${getLabel(earlier)}) ${t('earlierThan')} ${later.short_name} (${getLabel(later)}).`;
        updateStreakBar();
      } else {
        score++;
        streak++;
        document.getElementById('feedback').textContent =
          `${t('correct')} ${earlier.short_name}`;
        if (streak > 0 && streak % 5 === 0) {
          triggerCelebration(streak);
        } else {
          updateStreakBar();
        }
      }

      document.getElementById('score').textContent = score;
      document.getElementById('streak').textContent = streak;
      document.getElementById('cardA').classList.add('disabled');
      document.getElementById('cardB').classList.add('disabled');

      if (streak >= 50) {
        setTimeout(() => showWin(), streak % 5 === 0 ? 2600 : 0);
      } else {
        document.getElementById('nextBtn').style.display = 'inline-block';
      }
    }

    async function nextRound() {
      showLoader();
      const pair = pickPair();
      const final = await maybeTranslate(pair);
      hideLoader();
      render(final);
      updateStreakBar();
    }

    function openSettings() {
      renderLabels();
      updatePoolCounter();
      document.getElementById('game').classList.add('hidden');
      document.getElementById('settings').classList.remove('hidden');
      document.getElementById('settingsError').textContent = '';
    }

    const onStart = () => applyFilters();
    const onGuessA = () => guess('A');
    const onGuessB = () => guess('B');
    const onNext = async () => await nextRound();
    const onSettings = () => openSettings();
    const onWinPlayAgain = () => {
      hideWin();
      openSettings();
    };

    document.getElementById('startBtn')?.addEventListener('click', onStart);
    document.getElementById('cardA')?.addEventListener('click', onGuessA);
    document.getElementById('cardB')?.addEventListener('click', onGuessB);
    document.getElementById('nextBtn')?.addEventListener('click', onNext);
    document.getElementById('settingsBtn')?.addEventListener('click', onSettings);
    document.getElementById('winBtn')?.addEventListener('click', onWinPlayAgain);

    // Live counter listeners
    ['startYear', 'endYear', 'regionFilter', 'countryFilter'].forEach((id) => {
      document.getElementById(id)?.addEventListener('input', updatePoolCounter);
      document.getElementById(id)?.addEventListener('change', updatePoolCounter);
    });

    async function init() {
      renderLabels();
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, short_name, date, year, description, countries, region');

        if (error) {
          document.getElementById('loading').textContent = 'Error: ' + error.message;
          return;
        }
        if (!data || data.length < 2) {
          document.getElementById('loading').textContent = 'Need at least 2 events in the table.';
          return;
        }

        allEvents = data;
        populateFilters(allEvents);
        document.getElementById('loading').classList.add('hidden');
        document.getElementById('settings').classList.remove('hidden');
      } catch (err) {
        document.getElementById('loading').textContent = 'Crash: ' + err.message;
        console.error(err);
      }
    }

    init();

    return () => {
      document.getElementById('startBtn')?.removeEventListener('click', onStart);
      document.getElementById('cardA')?.removeEventListener('click', onGuessA);
      document.getElementById('cardB')?.removeEventListener('click', onGuessB);
      document.getElementById('nextBtn')?.removeEventListener('click', onNext);
      document.getElementById('settingsBtn')?.removeEventListener('click', onSettings);
      document.getElementById('winBtn')?.removeEventListener('click', onWinPlayAgain);
    };
  }, []);

  return (
    <div className="container">
      <h1>Which happened earlier?</h1>
      <p className="subtitle">Pick the older historical event</p>
 
      <a href="/multiplayer" className="subtitle" style={{ display: 'block', marginBottom: '1rem', background: 'rgba(99,102,241,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none' }}>
        🎮 Multiplayer Mode →
      </a>

      <div id="loading">Loading events from Supabase…</div>

      <div id="settings" className="hidden">
        <h2>⚙️ Game Settings</h2>

        <div className="field-row">
          <div className="field">
            <label htmlFor="startYear">Start Year</label>
            <input type="number" id="startYear" placeholder="e.g. 1500" />
          </div>
          <div className="field">
            <label htmlFor="endYear">End Year</label>
            <input type="number" id="endYear" placeholder="e.g. 2000" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="regionFilter">Region</label>
          <select id="regionFilter">
            <option value="">All regions</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="countryFilter">Country</label>
          <select id="countryFilter">
            <option value="">All countries</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="langSelect">Language</label>
          <select id="langSelect">
            <option value="en">English</option>
            <option value="cs">Čeština</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <div id="poolCounter" className="pool-counter">Checking pool…</div>

        <button className="btn-primary" id="startBtn">Start Game</button>
        <div id="settingsError"></div>
      </div>

      <div id="game" className="hidden">
        <div className="hud">
          <div className="badge"><span className="label" id="labelScore">Score</span> <span id="score">0</span></div>
          <div className="badge"><span className="label" id="labelStreak">Streak</span> <span id="streak">0</span></div>
        </div>

        <div className="streak-panel">
          <div className="streak-header">
            <span className="streak-title">🔥 Rank Progress</span>
            <span className="streak-target" id="milestoneText">Next rank at 5</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" id="streakFill"></div>
            <div className="progress-masks">
              <span></span><span></span><span></span><span></span>
            </div>
          </div>
        </div>

        <div id="feedback"></div>

        <div className="cards">
          <div className="card" id="cardA">
            <h2 id="nameA"></h2>
            <p id="descA"></p>
            <div className="meta" id="metaA"></div>
          </div>
          <div className="card" id="cardB">
            <h2 id="nameB"></h2>
            <p id="descB"></p>
            <div className="meta" id="metaB"></div>
          </div>
        </div>

        <div className="vs">or</div>

        <div className="controls">
          <button id="nextBtn" style={{ display: 'none' }}>Next →</button>
          <button className="btn-secondary" id="settingsBtn">⚙️ Filters</button>
        </div>
      </div>

      <div id="celebrationOverlay" className="celebration-overlay hidden">
        <div className="celebration-badge" id="celebrationBadge"></div>
      </div>

      <div id="winOverlay" className="win-overlay hidden">
        <div className="win-content">
          <div className="win-trophy">🏆</div>
          <h2 className="win-title" id="winTitle">You Won!</h2>
          <p className="win-rank">King of Historical Knowledge</p>
          <p className="win-subtitle" id="winSubtitle">You reached a streak of 50!</p>
          <button className="btn-primary" id="winBtn">Play Again</button>
        </div>
      </div>

      <div id="loadingOverlay" className="loading-overlay hidden">
        <div className="spinner"></div>
        <div className="spinner-text">Preparing next events…</div>
      </div>

      <div id="confetti-box"></div>
    </div>
  );
}