import { useState } from 'react';
import Link from 'next/link';
import { makeT } from '../lib/i18n.js';

const HOME_UI = {
  en: {
    title: 'Higher or Lower',
    subtitle: 'Pick a game and test your knowledge',
    stepMode: 'How do you want to play?',
    stepGame: 'Pick a game',
    singlePlayer: 'Single Player',
    singlePlayerDesc: 'Play solo and build your streak',
    multiplayer: 'Multiplayer',
    multiplayerDesc: 'Create a room and compete with up to 9 friends',
    back: '← Back',
    historyDesc: 'Which event happened earlier?',
    mountainsDesc: 'Which mountain is higher?',
    riversDesc: 'Which river is longer?',
    players: 'players',
    builtWith: 'Built with real-time rooms and worldwide data',
  },
  cs: {
    title: 'Vyšší nebo nižší',
    subtitle: 'Vyber si hru a otestuj své znalosti',
    stepMode: 'Jak chceš hrát?',
    stepGame: 'Vyber si hru',
    singlePlayer: 'Pro jednoho hráče',
    singlePlayerDesc: 'Hraj sám a buduj svou sérii',
    multiplayer: 'Pro více hráčů',
    multiplayerDesc: 'Vytvoř místnost a soupeř s až 9 přáteli',
    back: '← Zpět',
    historyDesc: 'Která událost se stala dříve?',
    mountainsDesc: 'Která hora je vyšší?',
    riversDesc: 'Která řeka je delší?',
    players: 'hráčů',
    builtWith: 'Postaveno s místnostmi v reálném čase a daty z celého světa',
  },
  it: {
    title: 'Più alto o più basso',
    subtitle: 'Scegli un gioco e metti alla prova le tue conoscenze',
    stepMode: 'Come vuoi giocare?',
    stepGame: 'Scegli un gioco',
    singlePlayer: 'Giocatore singolo',
    singlePlayerDesc: 'Gioca da solo e costruisci la tua serie',
    multiplayer: 'Multigiocatore',
    multiplayerDesc: 'Crea una stanza e gareggia con fino a 9 amici',
    back: '← Indietro',
    historyDesc: 'Quale evento è avvenuto prima?',
    mountainsDesc: 'Quale montagna è più alta?',
    riversDesc: 'Quale fiume è più lungo?',
    players: 'giocatori',
    builtWith: 'Costruito con stanze in tempo reale e dati da tutto il mondo',
  },
};

const GAMES_META = [
  {
    key: 'history',
    icon: '🏛️',
    name: { en: 'History', cs: 'Historie', it: 'Storia' },
  },
  {
    key: 'mountains',
    icon: '🏔️',
    name: { en: 'Mountains', cs: 'Hory', it: 'Montagne' },
  },
  {
    key: 'rivers',
    icon: '💧',
    name: { en: 'Rivers', cs: 'Řeky', it: 'Fiumi' },
  },
];

export default function Home() {
  const [lang, setLang] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('gameLang') || 'en' : 'en'));
  const [mode, setMode] = useState(null); // null | 'single' | 'multiplayer'

  const { t } = makeT(HOME_UI, () => lang);

  function changeLang(l) {
    if (l === lang) return;
    localStorage.setItem('gameLang', l);
    setLang(l);
  }

  const modes = [
    { key: 'single', icon: '🎯', title: t('singlePlayer'), desc: t('singlePlayerDesc') },
    { key: 'multiplayer', icon: '👥', title: t('multiplayer'), desc: t('multiplayerDesc') },
  ];

  return (
    <div className="container">
      <div className="home-lang-nav">
        {['en', 'cs', 'it'].map((l) => (
          <button
            key={l}
            className={`lang-btn${l === lang ? ' active' : ''}`}
            onClick={() => changeLang(l)}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <h1>{t('title')}</h1>
      <p className="subtitle">{t('subtitle')}</p>

      {!mode && (
        <div className="home-grid">
          {modes.map((m) => (
            <button
              key={m.key}
              className="home-card"
              onClick={() => setMode(m.key)}
            >
              <div className="home-card-icon">{m.icon}</div>
              <div className="home-card-title">{m.title}</div>
              <div className="home-card-desc">{m.desc}</div>
            </button>
          ))}
        </div>
      )}

      {mode && (
        <>
          <div className="home-back">
            <button className="btn-secondary" onClick={() => setMode(null)}>
              {t('back')}
            </button>
          </div>

          <div className="home-grid">
            {GAMES_META.map((g) => (
              <Link
                key={g.key}
                href={mode === 'single' ? `/play/${g.key}` : `/play/${g.key}/multiplayer`}
                className="home-card"
              >
                <div className="home-card-icon">{g.icon}</div>
                <div className="home-card-title">{g.name[lang] || g.name.en}</div>
                <div className="home-card-desc">
                  {t(`${g.key}Desc`)}
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}