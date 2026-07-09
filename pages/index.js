import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { pickPair } from '../lib/pickPair.js';
import { getEventTime, getEventYear } from '../lib/eventTime.js';
import { baseUiText, makeT } from '../lib/i18n.js';
import { filterEvents } from '../lib/filters.js';
import { ensureTranslated, getText } from '../lib/translate.js';
import { MILESTONES } from '../lib/milestones.js';
import SettingsPanel from '../components/SettingsPanel.js';
import GameCard from '../components/GameCard.js';
import StreakBar from '../components/StreakBar.js';
import Hud from '../components/Hud.js';
import LangNav from '../components/LangNav.js';
import ResultFeedback from '../components/ResultFeedback.js';

const MIN_EVENTS = 25;

const PAGE_UI = {
  en: {
    ...baseUiText.en,
    title: 'Which happened earlier?',
    subtitle: 'Pick the older historical event',
    loading: 'Loading events from Supabase…',
    settingsTitle: '⚙️ Game Settings',
    startGame: 'Start Game',
    streak: 'Streak',
    streakProgress: '🔥 Rank Progress',
    nextReward: 'Next rank',
    milestone: 'Milestone',
    reached: 'reached!',
    correct: 'Correct!',
    wrong: 'Wrong —',
    earlierThan: 'was earlier than',
    yearsApart: '{n} years apart',
    or: 'or',
    next: 'Next →',
    filters: '⚙️ Filters',
    youWon: 'You Won!',
    winSubtitle: 'You reached a streak of 50!',
    eventsAvailable: 'events available',
    needMore: 'Pick broader filters — need at least',
    toPlay: 'to play',
    year: 'Year',
    preparing: 'Preparing next events…',
    winRank: 'King of Historical Knowledge',
    missingEnv: 'Missing Supabase env vars',
    error: 'Error:',
    crash: 'Crash:',
    needEventsTable: 'Need at least 2 events in the table.',
  },
  cs: {
    ...baseUiText.cs,
    title: 'Co se stalo dříve?',
    subtitle: 'Vyber starší historickou událost',
    loading: 'Načítání událostí ze Supabase…',
    settingsTitle: '⚙️ Nastavení hry',
    startGame: 'Spustit hru',
    streak: 'Série',
    streakProgress: '🔥 Průběh hodnosti',
    nextReward: 'Další hodnost',
    milestone: 'Milník',
    reached: 'dosažen!',
    correct: 'Správně!',
    wrong: 'Špatně —',
    earlierThan: 'bylo dříve než',
    yearsApart: '{n} let od sebe',
    or: 'nebo',
    next: 'Další →',
    filters: '⚙️ Filtry',
    youWon: 'Vyhrál jsi!',
    winSubtitle: 'Dosáhl jsi série 50!',
    eventsAvailable: 'událostí k dispozici',
    needMore: 'Vyber méně restriktivní filtry — potřebuješ alespoň',
    toPlay: 'k hraní',
    year: 'Rok',
    preparing: 'Příprava dalších událostí…',
    winRank: 'Král historických znalostí',
    error: 'Chyba:',
    crash: 'Pád:',
    needEventsTable: 'V tabulce musí být alespoň 2 události.',
    missingEnv: 'Chybí Supabase proměnné prostředí',
  },
  it: {
    ...baseUiText.it,
    title: 'Quale è avvenuto prima?',
    subtitle: "Scegli l'evento storico più antico",
    loading: 'Caricamento eventi da Supabase…',
    settingsTitle: '⚙️ Impostazioni di gioco',
    startGame: 'Inizia',
    streak: 'Serie',
    streakProgress: '🔥 Progresso grado',
    nextReward: 'Prossimo grado',
    milestone: 'Traguardo',
    reached: 'raggiunto!',
    correct: 'Corretto!',
    wrong: 'Sbagliato —',
    earlierThan: 'era prima di',
    yearsApart: '{n} anni di distanza',
    or: 'oppure',
    next: 'Avanti →',
    filters: '⚙️ Filtri',
    youWon: 'Hai Vinto!',
    winSubtitle: 'Hai raggiunto una serie di 50!',
    eventsAvailable: 'eventi disponibili',
    needMore: 'Allarga i filtri — servono almeno',
    toPlay: 'per giocare',
    year: 'Anno',
    preparing: 'Preparazione prossimi eventi…',
    winRank: 'Re della conoscenza storica',
    error: 'Errore:',
    crash: 'Errore critico:',
    needEventsTable: 'Servono almeno 2 eventi nella tabella.',
    missingEnv: 'Variabili d\'ambiente Supabase mancanti',
  },
};

export default function Home() {
  const [lang, setLang] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('gameLang') || 'en' : 'en'));
  const [screen, setScreen] = useState('loading');
  const [allEvents, setAllEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [pair, setPair] = useState(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [guessState, setGuessState] = useState({ aState: '', bState: '' });
  const [showNext, setShowNext] = useState(false);
  const [celebration, setCelebration] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [showLoader, setShowLoader] = useState(false);
  const [initError, setInitError] = useState(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_KEY) {
      return 'Missing Supabase env vars';
    }
    return '';
  });

  const shownPairsRef = useRef(new Set());
  const translationsRef = useRef({});
  const lockedRef = useRef(false);
  const celebrationTimeoutRef = useRef(null);
  const winTimeoutRef = useRef(null);
  const confettiBoxRef = useRef(null);

  const { t, tf } = makeT(PAGE_UI, () => lang);

  const getLabel = useCallback((e) => {
    return e.date ? e.date : `${t('year')} ${e.year}`;
  }, [t]);

  // Init: load events from Supabase
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return; // initError stays as default empty, loading screen shows
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    (async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id, short_name, date, year, description, countries, region');

        if (error) {
          setInitError(t('error') + ' ' + error.message);
          return;
        }
        if (!data || data.length < 2) {
          setInitError(t('needEventsTable'));
          return;
        }

        setAllEvents(data);
        setScreen('settings');
      } catch (err) {
        setInitError(t('crash') + ' ' + err.message);
        console.error(err);
      }
    })();
  }, []);

  // Re-translate current pair when language changes (during game)
  useEffect(() => {
    if (!pair || screen !== 'game') return;
    (async () => {
      const l = lang;
      if (l === 'en') return;
      const origA = events.find((e) => e.id === pair.a.id) || pair.a;
      const origB = events.find((e) => e.id === pair.b.id) || pair.b;
      await ensureTranslated([origA, origB], translationsRef.current, l);
      const ta = getText(origA, translationsRef.current, l);
      const tb = getText(origB, translationsRef.current, l);
      setPair((p) => p && {
        ...p,
        a: { ...p.a, short_name: ta.short_name, description: ta.description },
        b: { ...p.b, short_name: tb.short_name, description: tb.description },
      });
      // Rebuild lastResult with freshly-translated event objects
      if (lastResult) {
        setLastResult((lr) => lr && {
          ...lr,
          earlier: pair.earlierId === pair.a.id
            ? { ...pair.a, short_name: ta.short_name, description: ta.description }
            : { ...pair.b, short_name: tb.short_name, description: tb.description },
          later: pair.earlierId === pair.a.id
            ? { ...pair.b, short_name: tb.short_name, description: tb.description }
            : { ...pair.a, short_name: ta.short_name, description: ta.description },
        });
      }
    })();
  }, [lang]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (celebrationTimeoutRef.current) clearTimeout(celebrationTimeoutRef.current);
      if (winTimeoutRef.current) clearTimeout(winTimeoutRef.current);
    };
  }, []);

  function changeLang(l) {
    if (l === lang) return;
    localStorage.setItem('gameLang', l);
    setLang(l);
  }

  function spawnConfetti() {
    const box = confettiBoxRef.current;
    if (!box) return;
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
    setTimeout(() => { if (box) box.innerHTML = ''; }, 4500);
  }

  function triggerCelebration(number) {
    setCelebration(number);
    spawnConfetti();
    celebrationTimeoutRef.current = setTimeout(() => {
      setCelebration(null);
    }, 2500);
  }

  async function maybeTranslate(p) {
    const l = lang;
    if (l === 'en') return p;
    await ensureTranslated([p[0], p[1]], translationsRef.current, l);
    return p.map((e) => {
      const tr = getText(e, translationsRef.current, l);
      return { ...e, short_name: tr.short_name, description: tr.description };
    });
  }

  async function nextRound(pool) {
    const eventsPool = pool || events;
    setLastResult(null);
    setShowLoader(true);
    try {
      const [e1, e2] = pickPair(eventsPool, shownPairsRef.current);
      const [te1, te2] = await maybeTranslate([e1, e2]);
      const earlierId = getEventTime(te1) < getEventTime(te2) ? te1.id : te2.id;
      setPair({ a: te1, b: te2, earlierId });
      setLocked(false);
      lockedRef.current = false;
      setShowNext(false);
      setGuessState({ aState: '', bState: '' });
    } catch (err) {
      console.error('nextRound failed', err);
      setInitError(t('crash') + ' ' + err.message);
      setScreen('loading');
    } finally {
      setShowLoader(false);
    }
  }

  function guess(side) {
    if (lockedRef.current || !pair) return;
    lockedRef.current = true;
    setLocked(true);

    const { a, b, earlierId } = pair;
    const chosen = side === 'A' ? a : b;
    const isCorrect = chosen.id === earlierId;
    const earlier = earlierId === a.id ? a : b;
    const later = earlierId === a.id ? b : a;

    setLastResult({ earlier, later, isCorrect, gap: Math.abs(getEventYear(earlier) - getEventYear(later)) });

    const correctSide = earlierId === a.id ? 'A' : 'B';
    const newGuessState = { aState: '', bState: '' };
    newGuessState[correctSide.toLowerCase() + 'State'] = 'correct';
    if (!isCorrect) {
      newGuessState[side.toLowerCase() + 'State'] = 'wrong';
      setStreak(0);
    } else {
      const newScore = score + 1;
      const newStreak = streak + 1;
      setScore(newScore);
      setStreak(newStreak);

      if (newStreak > 0 && newStreak % 5 === 0) {
        triggerCelebration(newStreak);
      }
    }
    newGuessState.aState = (newGuessState.aState || '') + ' disabled';
    newGuessState.bState = (newGuessState.bState || '') + ' disabled';
    setGuessState(newGuessState);

    const newStreakValue = isCorrect ? streak + 1 : 0;
    if (newStreakValue >= 50) {
      winTimeoutRef.current = setTimeout(() => setShowWin(true), newStreakValue % 5 === 0 ? 2600 : 0);
    } else {
      setShowNext(true);
    }
  }

  function openSettings() {
    setScreen('settings');
    setShowWin(false);
  }

  function handleStart({ startYear, endYear, region, country, lang: selectedLang }) {
    localStorage.setItem('gameLang', selectedLang);
    setLang(selectedLang);
    const filtered = filterEvents(allEvents, { startYear, endYear, region, country });
    setEvents(filtered);
    setScore(0);
    setStreak(0);
    setLastResult(null);
    setGuessState({ aState: '', bState: '' });
    setShowNext(false);
    setShowWin(false);
    setCelebration(null);
    translationsRef.current = {};
    shownPairsRef.current = new Set();
    setScreen('game');
    nextRound(filtered);
  }

  return (
    <div className="container">
      <h1>{t('title')}</h1>
      <p className="subtitle">{t('subtitle')}</p>

      <Link
        href="/multiplayer"
        className="subtitle"
        style={{ display: 'block', marginBottom: '1rem', background: 'rgba(99,102,241,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none' }}
      >
        🎮 Multiplayer Mode →
      </Link>

      {screen === 'loading' && (
        <div id="loading">
          {initError || t('loading')}
        </div>
      )}

      {screen === 'settings' && (
        <SettingsPanel
          allEvents={allEvents}
          lang={lang}
          t={t}
          MIN_EVENTS={MIN_EVENTS}
          onStart={handleStart}
        />
      )}

      {screen === 'game' && pair && (
        <div id="game">
          <LangNav lang={lang} onChange={changeLang} />

          <Hud score={score} streak={streak} t={t} />

          <StreakBar streak={streak} t={t} />

          {lastResult && <ResultFeedback result={lastResult} t={t} tf={tf} getLabel={getLabel} />}

          <div className="cards">
            <GameCard
              id="cardA"
              event={pair.a}
              meta={getLabel(pair.a)}
              showMeta={locked}
              state={guessState.aState}
              onClick={() => guess('A')}
              ariaLabel="Pick this event as earlier"
            />
            <GameCard
              id="cardB"
              event={pair.b}
              meta={getLabel(pair.b)}
              showMeta={locked}
              state={guessState.bState}
              onClick={() => guess('B')}
              ariaLabel="Pick this event as earlier"
            />
          </div>

          <div className="vs">{t('or')}</div>

          <div className="controls">
            {showNext && (
              <button id="nextBtn" onClick={() => nextRound()}>{t('next')}</button>
            )}
            <button className="btn-secondary" id="settingsBtn" onClick={openSettings}>
              {t('filters')}
            </button>
          </div>
        </div>
      )}

      {celebration !== null && (
        <div className="celebration-overlay">
          <div className="celebration-badge">
            {MILESTONES[celebration] ? (
              <>
                <div style={{ fontSize: '0.45em', marginBottom: '0.2em', opacity: 0.9 }}>
                  {MILESTONES[celebration].badge} {MILESTONES[celebration].name}
                </div>
                🔥 {t('streak').toUpperCase()} {celebration} 🔥
              </>
            ) : (
              `🔥 ${t('streak').toUpperCase()} ${celebration} 🔥`
            )}
          </div>
        </div>
      )}

      {showWin && (
        <div className="win-overlay">
          <div className="win-content">
            <div className="win-trophy">🏆</div>
            <h2 className="win-title">{t('youWon')}</h2>
            <p className="win-rank">{t('winRank')}</p>
            <p className="win-subtitle">{t('winSubtitle')}</p>
            <button className="btn-primary" onClick={openSettings}>{t('playAgain')}</button>
          </div>
        </div>
      )}

      {showLoader && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <div className="spinner-text">{t('preparing')}</div>
        </div>
      )}

      <div id="confetti-box" ref={confettiBoxRef}></div>
    </div>
  );
}