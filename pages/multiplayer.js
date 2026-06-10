import { useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

export default function Multiplayer() {
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      document.getElementById('mp-loading').textContent = 'Missing Supabase env vars';
      return;
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    document.getElementById('mp-loading').classList.add('hidden');

    let playerId = sessionStorage.getItem('mp_player_id');
    if (!playerId) {
      playerId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('mp_player_id', playerId);
    }

    // Restore language preference from previous session
    const savedLang = sessionStorage.getItem('mp_lang');
    if (savedLang) {
      const langSel = document.getElementById('mp-langSelect');
      if (langSel) langSel.value = savedLang;
    }

    let room = null;
    let channel = null;
    let allEvents = [];
    const MIN_EVENTS = 25;
    let lastShownResultRound = null;
    let suppressRaceTracker = false;
    let turnTimeoutId = null;
    let countdownInterval = null;
    let heartbeatInterval = null;
    let disconnectCheckInterval = null;
    let roomClosed = false;
    let currentRenderedRound = null;
    let pendingWinnerRoom = null;
    const translations = {};

    const DEFAULT_COLORS = [
      '#ef4444', '#3b82f6', '#22c55e', '#eab308',
      '#a855f7', '#f97316', '#ec4899', '#14b8a6',
      '#84cc16', '#6366f1',
    ];

    function getLang() { return sessionStorage.getItem('mp_lang') || 'en'; }

    function updateLangNav() {
      const current = getLang();
      document.querySelectorAll('#mp-game .lang-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.lang === current);
      });
    }

    function refreshGameText() {
      if (!room || !room.current_pair || room.current_pair.length < 2) return;
      const [a, b] = room.current_pair;
      const ta = getText(a);
      const tb = getText(b);
      document.getElementById('mp-nameA').textContent = ta.short_name;
      document.getElementById('mp-descA').textContent = ta.description;
      document.getElementById('mp-nameB').textContent = tb.short_name;
      document.getElementById('mp-descB').textContent = tb.description;
      const round = room.current_round || 1;
      const total = room.total_rounds || 10;
      document.getElementById('mp-round').textContent = `${t('round')} ${round} / ${total}`;
      renderLeaderboard();
    }

    async function changeLang(l) {
      if (l === getLang()) return;
      sessionStorage.setItem('mp_lang', l);
      const lobbySelect = document.getElementById('mp-langSelect');
      if (lobbySelect) lobbySelect.value = l;
      updateLangNav();
      updateUIText();
      if (!document.getElementById('mp-waiting').classList.contains('hidden') && room) {
        renderWaitingScreen();
      }
      if (room && room.current_pair && room.current_pair.length === 2) {
        await ensureTranslated(room.current_pair);
        refreshGameText();
      }
    }
    const onLangChange = (e) => changeLang(e.currentTarget.dataset.lang);

    const uiText = {
      en: {
        title: 'Multiplayer',
        subtitle: 'Compete with up to 9 friends in real time',
        createGame: 'Create Game',
        joinGame: 'Join Game',
        language: 'Language',
        startYear: 'Start Year',
        endYear: 'End Year',
        region: 'Region',
        country: 'Country',
        rounds: 'Number of Rounds (5–50)',
        createRoom: 'Create Room',
        joinRoom: 'Join Room',
        roomCode: 'Room Code',
        loading: 'Loading...',
        waiting: 'Waiting Room',
        waitingOpp: 'Waiting for other players...',
        waitingHost: 'Waiting for host to start the game...',
        yourTurn: 'Your turn! Pick the earlier event.',
        loadingEvents: 'Loading events...',
        you: 'You',
        opponent: 'Opponent',
        leaderboard: 'Leaderboard',
        round: 'Round',
        correct: 'Correct!',
        wrong: 'Wrong!',
        timedOut: 'No answer',
        wasEarlier: 'was earlier',
        didYouKnow: 'Did you know?',
        roomClosedTitle: 'Room Closed',
        roomClosedMsg: 'The host has left. This room is no longer available.',
        roomClosedSub: 'Create a new room or join another one.',
        backToLobby: 'Back to Lobby',
        playersConnected: '{count} / {max} players connected',
        startGame: 'Start Game',
        nickname: 'Nickname',
        pickColor: 'Color',
        save: 'Save',
        finalStandings: 'Final Standings',
        rank: 'Rank',
        score: 'Score',
        playAgain: 'Play Again',
        returnToLobby: 'Return to lobby',
        restartGame: 'Restart game',
        minPlayers: 'Need at least 2 players to start',
        roomFull: 'Room is full',
        oppLabel: 'Opponent:',
        nextRound: 'Next round starting soon...',
        sending: 'Sending...',
        networkError: 'Network error. Please try again.',
        failedCreate: 'Failed to create room',
        failedJoin: 'Failed to join room',
        roundsRange: 'Rounds must be 5–50',
        needEvents: 'Need at least {min} events to play ({count})',
        creating: 'Creating...',
        allRegions: 'All regions',
        allCountries: 'All countries',
        placeholderStartYear: 'e.g. 1500',
        placeholderEndYear: 'e.g. 2000',
        placeholderRoomCode: 'abc',
        checkingPool: 'Checking pool…',
      },
      cs: {
        title: 'Multiplayer',
        subtitle: 'Soutěž s až 9 přáteli v reálném čase',
        createGame: 'Vytvořit hru',
        joinGame: 'Připojit se ke hře',
        language: 'Jazyk',
        startYear: 'Od roku',
        endYear: 'Do roku',
        region: 'Region',
        country: 'Země',
        rounds: 'Počet kol (5–50)',
        createRoom: 'Vytvořit místnost',
        joinRoom: 'Připojit se',
        roomCode: 'Kód místnosti',
        loading: 'Načítání...',
        waiting: 'Čekací místnost',
        waitingOpp: 'Čeká se na ostatní hráče...',
        waitingHost: 'Čeká se na hostitele, aby spustil hru...',
        yourTurn: 'Jsi na tahu! Vyber dřívější událost.',
        loadingEvents: 'Načítání událostí...',
        you: 'Ty',
        opponent: 'Soupeř',
        leaderboard: 'Žebříček',
        round: 'Kolo',
        correct: 'Správně!',
        wrong: 'Špatně!',
        timedOut: 'Bez odpovědi',
        wasEarlier: 'bylo dřív',
        didYouKnow: 'Věděl jsi?',
        roomClosedTitle: 'Místnost uzavřena',
        roomClosedMsg: 'Hostitel odešel. Tato místnost již není dostupná.',
        roomClosedSub: 'Vytvoř novou místnost nebo se připoj k jiné.',
        backToLobby: 'Zpět do lobby',
        playersConnected: '{count} / {max} hráčů připojeno',
        startGame: 'Spustit hru',
        nickname: 'Přezdívka',
        pickColor: 'Barva',
        save: 'Uložit',
        finalStandings: 'Konečné pořadí',
        rank: 'Pozice',
        score: 'Skóre',
        playAgain: 'Hrát znovu',
        returnToLobby: 'Zpět do lobby',
        restartGame: 'Restart hry',
        minPlayers: 'Ke startu jsou potřeba alespoň 2 hráči',
        roomFull: 'Místnost je plná',
        oppLabel: 'Soupeř:',
        nextRound: 'Další kolo začíná za chvíli...',
        sending: 'Odesílání...',
        networkError: 'Chyba sítě. Zkus to znovu.',
        failedCreate: 'Nepodařilo se vytvořit místnost',
        failedJoin: 'Nepodařilo se připojit do místnosti',
        roundsRange: 'Kol musí být 5–50',
        needEvents: 'Potřebuješ alespoň {min} událostí ke hře ({count})',
        creating: 'Vytváření...',
        allRegions: 'Všechny regiony',
        allCountries: 'Všechny země',
        placeholderStartYear: 'např. 1500',
        placeholderEndYear: 'např. 2000',
        placeholderRoomCode: 'abc',
        checkingPool: 'Kontroluji dostupnost...',
      },
      it: {
        title: 'Multiplayer',
        subtitle: 'Gareggia con fino a 9 amici in tempo reale',
        createGame: 'Crea partita',
        joinGame: 'Unisciti alla partita',
        language: 'Lingua',
        startYear: 'Anno inizio',
        endYear: 'Anno fine',
        region: 'Regione',
        country: 'Paese',
        rounds: 'Numero di round (5–50)',
        createRoom: 'Crea stanza',
        joinRoom: 'Unisciti',
        roomCode: 'Codice stanza',
        loading: 'Caricamento...',
        waiting: 'Sala d\'attesa',
        waitingOpp: 'In attesa degli altri giocatori...',
        waitingHost: 'In attesa che l\'host avvii la partita...',
        yourTurn: 'Tocca a te! Scegli l\'evento più antico.',
        loadingEvents: 'Caricamento eventi...',
        you: 'Tu',
        opponent: 'Avversario',
        leaderboard: 'Classifica',
        round: 'Round',
        correct: 'Corretto!',
        wrong: 'Sbagliato!',
        timedOut: 'Nessuna risposta',
        wasEarlier: 'era prima',
        didYouKnow: 'Lo sapevi?',
        roomClosedTitle: 'Stanza chiusa',
        roomClosedMsg: 'L\'host è uscito. Questa stanza non è più disponibile.',
        roomClosedSub: 'Crea una nuova stanza o unisciti a un\'altra.',
        backToLobby: 'Torna alla lobby',
        playersConnected: '{count} / {max} giocatori connessi',
        startGame: 'Avvia partita',
        nickname: 'Nickname',
        pickColor: 'Colore',
        save: 'Salva',
        finalStandings: 'Classifica finale',
        rank: 'Posizione',
        score: 'Punteggio',
        playAgain: 'Gioca ancora',
        returnToLobby: 'Torna alla lobby',
        restartGame: 'Ricomincia partita',
        minPlayers: 'Servono almeno 2 giocatori per iniziare',
        roomFull: 'Stanza piena',
        oppLabel: 'Avversario:',
        nextRound: 'Il prossimo round inizierà a breve...',
        sending: 'Invio in corso...',
        networkError: 'Errore di rete. Riprova.',
        failedCreate: 'Impossibile creare la stanza',
        failedJoin: 'Impossibile unirsi alla stanza',
        roundsRange: 'I round devono essere 5–50',
        needEvents: 'Servono almeno {min} eventi per giocare ({count})',
        creating: 'Creazione in corso...',
        allRegions: 'Tutte le regioni',
        allCountries: 'Tutti i paesi',
        placeholderStartYear: 'es. 1500',
        placeholderEndYear: 'es. 2000',
        placeholderRoomCode: 'abc',
        checkingPool: 'Controllo disponibilità...',
      },
    };

    function t(key) {
      const l = getLang();
      return uiText[l]?.[key] ?? uiText.en[key] ?? key;
    }

    function tf(key, vars = {}) {
      let text = t(key);
      Object.entries(vars).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      });
      return text;
    }

    function updateUIText() {
      const l = getLang();
      document.getElementById('mp-title').textContent = t('title');
      document.getElementById('mp-subtitle').textContent = t('subtitle');
      document.getElementById('mp-lobby-lang-label').textContent = t('language');
      document.getElementById('mp-lobby-create-title').textContent = t('createGame');
      document.getElementById('mp-lobby-startYear-label').textContent = t('startYear');
      document.getElementById('mp-lobby-endYear-label').textContent = t('endYear');
      document.getElementById('mp-lobby-region-label').textContent = t('region');
      document.getElementById('mp-lobby-country-label').textContent = t('country');
      document.getElementById('mp-lobby-rounds-label').textContent = t('rounds');
      document.getElementById('btn-create').textContent = t('createRoom');
      document.getElementById('mp-lobby-join-title').textContent = t('joinGame');
      document.getElementById('mp-lobby-roomCode-label').textContent = t('roomCode');
      document.getElementById('btn-join').textContent = t('joinRoom');
      document.getElementById('mp-loading').textContent = t('loading');
      document.getElementById('mp-waiting-title').textContent = t('waiting');
      document.getElementById('mp-nickname-label').textContent = t('nickname');
      document.getElementById('mp-color-label').textContent = t('pickColor');
      document.getElementById('btn-save-profile').textContent = t('save');
      document.getElementById('btn-start-game').textContent = t('startGame');
      document.getElementById('mp-guest-message').textContent = t('waitingHost');
      document.getElementById('mp-leaderboard-title').textContent = t('leaderboard');
      document.getElementById('mp-next-round').textContent = t('nextRound');
      document.getElementById('btn-play-again').textContent = t('restartGame');
      document.getElementById('btn-back-lobby').textContent = t('backToLobby');
      document.getElementById('btn-new-game').textContent = t('returnToLobby');
      document.getElementById('mp-startYear').placeholder = t('placeholderStartYear');
      document.getElementById('mp-endYear').placeholder = t('placeholderEndYear');
      document.getElementById('joinCode').placeholder = t('placeholderRoomCode');
      const regionSel = document.getElementById('mp-regionFilter');
      if (regionSel && regionSel.options[0]) regionSel.options[0].textContent = t('allRegions');
      const countrySel = document.getElementById('mp-countryFilter');
      if (countrySel && countrySel.options[0]) countrySel.options[0].textContent = t('allCountries');
    }

    function getMyPlayer() {
      if (!room || !room.players) return null;
      return room.players.find((p) => p.id === playerId);
    }

    function isHost() {
      const me = getMyPlayer();
      return me?.isHost || false;
    }

    function renderWaitingScreen() {
      if (!room) return;
      const codeDisplay = room.code ? room.code.toUpperCase() : '—';
      document.getElementById('mp-room-info').textContent = `Room: ${codeDisplay} — ${tf('playersConnected', {
        count: room.players?.length || 1,
        max: room.max_players || 10,
      })}`;

      const listEl = document.getElementById('mp-players-list');
      listEl.innerHTML = '';
      (room.players || []).forEach((p) => {
        const isMe = p.id === playerId;
        const div = document.createElement('div');
        div.style.cssText = `
          display:flex; align-items:center; gap:0.5rem;
          padding:0.5rem 0.75rem; border-radius:8px;
          background: rgba(255,255,255,0.05);
          margin-bottom:0.4rem;
          font-weight: ${isMe ? '700' : '400'};
          border: ${isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'};
        `;
        const dot = document.createElement('span');
        dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${p.color || '#94a3b8'};display:inline-block;flex-shrink:0;`;
        const name = document.createElement('span');
        name.textContent = p.nickname || (p.isHost ? 'Host' : 'Guest');
        if (isMe) {
          const badge = document.createElement('span');
          badge.textContent = ` (${t('you')})`;
          badge.style.color = '#94a3b8';
          badge.style.fontSize = '0.8rem';
          name.appendChild(badge);
        }
        if (p.isHost) {
          const hostBadge = document.createElement('span');
          hostBadge.textContent = ' 👑';
          hostBadge.style.fontSize = '0.8rem';
          name.appendChild(hostBadge);
        }
        div.appendChild(dot);
        div.appendChild(name);
        listEl.appendChild(div);
      });

      // Profile editor — only update if user is not currently typing
      const me = getMyPlayer();
      const nicknameInput = document.getElementById('mp-nickname-input');
      if (me && nicknameInput && document.activeElement !== nicknameInput) {
        nicknameInput.value = me.nickname || '';
      }

      // Color picker
      const colorPicker = document.getElementById('mp-color-picker');
      if (colorPicker && colorPicker.children.length === 0) {
        DEFAULT_COLORS.forEach((c) => {
          const btn = document.createElement('button');
          btn.style.cssText = `
            width:28px; height:28px; border-radius:50%; border:2px solid transparent;
            background:${c}; cursor:pointer; padding:0; margin:2px;
          `;
          btn.addEventListener('click', () => {
            document.querySelectorAll('#mp-color-picker button').forEach((b) => {
              b.style.borderColor = 'transparent';
            });
            btn.style.borderColor = '#fff';
            btn.dataset.selected = c;
          });
          colorPicker.appendChild(btn);
        });
      }

      // Show/hide host controls
      const isHostPlayer = isHost();
      document.getElementById('mp-host-controls').classList.toggle('hidden', !isHostPlayer);
      document.getElementById('mp-guest-message').classList.toggle('hidden', isHostPlayer);

      // Enable/disable start button
      const startBtn = document.getElementById('btn-start-game');
      if (startBtn) {
        const canStart = (room.players?.length || 0) >= 2;
        startBtn.disabled = !canStart;
        startBtn.style.opacity = canStart ? '1' : '0.5';
        startBtn.style.cursor = canStart ? 'pointer' : 'not-allowed';
      }
    }

    async function saveProfile() {
      if (!room || !room.code) return;
      const nickname = document.getElementById('mp-nickname-input').value.trim().slice(0, 15);
      const selectedColorBtn = document.querySelector('#mp-color-picker button[style*="border-color: rgb(255, 255, 255)"], #mp-color-picker button[style*="border-color: #fff"]');
      const color = selectedColorBtn?.dataset.selected || getMyPlayer()?.color;
      try {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'update-profile', roomCode: room.code, playerId, nickname, color }),
        });
      } catch (err) {
        console.error('Profile update failed', err);
      }
    }

    async function startGame() {
      if (!room || !room.code) return;
      const btn = document.getElementById('btn-start-game');
      btn.disabled = true;
      btn.textContent = t('sending');
      try {
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start', roomCode: room.code, playerId }),
        });
        const data = await res.json();
        if (!res.ok) {
          btn.disabled = false;
          btn.textContent = t('startGame');
          document.getElementById('mp-start-error').textContent = data.error || t('networkError');
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = t('startGame');
        document.getElementById('mp-start-error').textContent = t('networkError');
      }
    }

    async function leaveRoom() {
      if (!room || !room.code) return;
      try {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', roomCode: room.code, playerId }),
        });
      } catch (err) {
        console.error('Leave failed', err);
      }
    }

    function renderLeaderboard() {
      if (!room || !room.players) return;
      const scores = room.scores || {};
      const players = [...(room.players || [])].map((p) => ({
        ...p,
        score: scores[p.id] || 0,
      }));
      players.sort((a, b) => b.score - a.score);

      const container = document.getElementById('mp-leaderboard-body');
      if (!container) return;
      container.innerHTML = '';

      players.forEach((p, idx) => {
        const isMe = p.id === playerId;
        const row = document.createElement('div');
        row.style.cssText = `
          display:flex; align-items:center; justify-content:space-between;
          padding:0.4rem 0.6rem; border-radius:6px;
          background: ${isMe ? 'rgba(255,255,255,0.08)' : 'transparent'};
          font-size: 0.9rem; gap: 0.5rem;
        `;

        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:0.5rem;';
        const rank = document.createElement('span');
        rank.textContent = `${idx + 1}.`;
        rank.style.cssText = 'width:1.5rem; text-align:right; color:#94a3b8; font-weight:700;';
        const dot = document.createElement('span');
        dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${p.color || '#94a3b8'};display:inline-block;`;
        const name = document.createElement('span');
        name.textContent = p.nickname || 'Guest';
        if (isMe) name.style.fontWeight = '700';

        left.appendChild(rank);
        left.appendChild(dot);
        left.appendChild(name);

        const score = document.createElement('span');
        score.textContent = p.score;
        score.style.cssText = 'font-weight:800; color:#fbbf24; min-width:2rem; text-align:right;';

        row.appendChild(left);
        row.appendChild(score);
        container.appendChild(row);
      });
    }

    function renderRoundLeaderboard(result) {
      if (!result || !result.answered) return;
      const container = document.getElementById('mp-round-leaderboard');
      if (!container) return;
      container.innerHTML = '';

      const entries = Object.entries(result.answered).map(([pid, ans]) => {
        const player = room?.players?.find((p) => p.id === pid);
        return {
          id: pid,
          nickname: player?.nickname || ans.nickname || 'Guest',
          color: player?.color || ans.color || '#94a3b8',
          points: ans.points || 0,
          isCorrect: ans.isCorrect,
          timedOut: ans.timedOut,
          isMe: pid === playerId,
        };
      });
      entries.sort((a, b) => b.points - a.points);

      const title = document.createElement('div');
      title.textContent = t('leaderboard');
      title.style.cssText = 'font-size:0.75rem; text-transform:uppercase; font-weight:800; color:#94a3b8; letter-spacing:0.05em; margin-bottom:0.5rem; text-align:center;';
      container.appendChild(title);

      entries.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.style.cssText = `
          display:flex; align-items:center; justify-content:space-between;
          padding:0.3rem 0.5rem; border-radius:4px;
          font-size: 0.85rem; gap: 0.5rem;
          ${entry.isMe ? 'background:rgba(255,255,255,0.06);' : ''}
        `;
        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:0.4rem;';
        const dot = document.createElement('span');
        dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${entry.color};display:inline-block;`;
        const name = document.createElement('span');
        name.textContent = `${idx + 1}. ${entry.nickname}`;
        if (entry.isMe) name.style.fontWeight = '700';
        left.appendChild(dot);
        left.appendChild(name);

        const right = document.createElement('span');
        let symbol = '';
        if (entry.timedOut) symbol = '⏱️';
        else if (entry.isCorrect) symbol = '✅';
        else symbol = '❌';
        right.textContent = `${symbol} ${entry.points > 0 ? '+' : ''}${entry.points}pts`;
        right.style.fontWeight = '700';
        if (entry.isCorrect) right.style.color = '#22c55e';
        else if (entry.timedOut) right.style.color = '#fbbf24';
        else right.style.color = '#ef4444';

        row.appendChild(left);
        row.appendChild(right);
        container.appendChild(row);
      });
    }

    function renderFinalStandings(standings) {
      const container = document.getElementById('mp-standings');
      if (!container) return;
      container.innerHTML = '';

      if (!standings || !Array.isArray(standings) || standings.length === 0) return;

      standings.forEach((s, idx) => {
        const isMe = s.id === playerId;
        const row = document.createElement('div');
        row.style.cssText = `
          display:flex; align-items:center; justify-content:space-between;
          padding:0.6rem 1rem; border-radius:8px;
          background: ${isMe ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)'};
          margin-bottom: 0.4rem; font-size: 1rem;
          border: ${isMe ? '1px solid rgba(255,255,255,0.2)' : '1px solid transparent'};
        `;

        const left = document.createElement('div');
        left.style.cssText = 'display:flex; align-items:center; gap:0.6rem;';

        const rank = document.createElement('span');
        rank.textContent = `#${idx + 1}`;
        rank.style.cssText = `width:2.5rem; text-align:center; font-weight:800; color:${idx < 3 ? '#fbbf24' : '#94a3b8'}; font-size:1.1rem;`;

        const dot = document.createElement('span');
        dot.style.cssText = `width:12px;height:12px;border-radius:50%;background:${s.color || '#94a3b8'};display:inline-block;`;

        const name = document.createElement('span');
        name.textContent = s.nickname || 'Guest';
        name.style.fontWeight = isMe ? '700' : '400';

        left.appendChild(rank);
        left.appendChild(dot);
        left.appendChild(name);

        const score = document.createElement('span');
        score.textContent = s.score;
        score.style.cssText = 'font-weight:800; color:#fbbf24; font-size:1.2rem;';

        row.appendChild(left);
        row.appendChild(score);
        container.appendChild(row);
      });
    }

    async function initLobby() {
      updateUIText();
      const { data } = await supabase.from('events').select('id, short_name, date, year, description, countries, region');
      if (data) {
        allEvents = data;
        populateFilters(data);
        updatePoolCounter();
      }
    }
    initLobby();

    function getEventYear(e) {
      if (e.date) return parseInt(e.date.split('-')[0], 10);
      return e.year ?? 0;
    }

    function countMatchingEvents() {
      const startYear = parseInt(document.getElementById('mp-startYear').value, 10) || null;
      const endYear = parseInt(document.getElementById('mp-endYear').value, 10) || null;
      const region = document.getElementById('mp-regionFilter').value;
      const country = document.getElementById('mp-countryFilter').value;

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
      const counterEl = document.getElementById('mp-poolCounter');
      const startBtn = document.getElementById('btn-create');

      if (valid) {
        counterEl.textContent = `${count} events available ✅`;
        counterEl.style.color = '#34d399';
        startBtn.disabled = false;
        startBtn.style.opacity = '1';
        startBtn.style.cursor = 'pointer';
      } else {
        counterEl.textContent = tf('needEvents', { min: MIN_EVENTS, count });
        counterEl.style.color = '#f87171';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
      }
    }

    function populateFilters(data) {
      const regions = [...new Set(data.map((e) => e.region).filter(Boolean))].sort();
      const regionSel = document.getElementById('mp-regionFilter');
      regionSel.innerHTML = '<option value="">' + t('allRegions') + '</option>';
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
      const countrySel = document.getElementById('mp-countryFilter');
      countrySel.innerHTML = '<option value="">' + t('allCountries') + '</option>';
      countries.forEach((c) => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        countrySel.appendChild(opt);
      });

      ['mp-startYear', 'mp-endYear', 'mp-regionFilter', 'mp-countryFilter'].forEach((id) => {
        document.getElementById(id)?.addEventListener('input', updatePoolCounter);
        document.getElementById(id)?.addEventListener('change', updatePoolCounter);
      });
    }

    async function createRoom() {
      const btn = document.getElementById('btn-create');
      const originalText = btn.textContent;
      btn.disabled = true;
      btn.innerHTML = `<div style="display:inline-flex;align-items:center;gap:0.5rem;">
        <div style="width:16px;height:16px;border:2px solid rgba(255,255,255,0.3);border-top-color:#fff;border-radius:50%;animation:spin 0.8s linear infinite;"></div>
        ${t('creating')}
      </div>`;

      const rounds = parseInt(document.getElementById('roundsInput').value, 10) || 10;
      if (rounds < 5 || rounds > 50) {
        document.getElementById('mp-poolCounter').textContent = t('roundsRange');
        document.getElementById('mp-poolCounter').style.color = '#f87171';
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const { count, valid } = countMatchingEvents();
      if (!valid) {
        document.getElementById('mp-poolCounter').textContent = tf('needEvents', { min: MIN_EVENTS, count });
        document.getElementById('mp-poolCounter').style.color = '#f87171';
        btn.disabled = false;
        btn.textContent = originalText;
        return;
      }

      const myLang = document.getElementById('mp-langSelect').value || 'en';
      sessionStorage.setItem('mp_lang', myLang);

      const filters = {
        startYear: parseInt(document.getElementById('mp-startYear').value, 10) || null,
        endYear: parseInt(document.getElementById('mp-endYear').value, 10) || null,
        region: document.getElementById('mp-regionFilter').value,
        country: document.getElementById('mp-countryFilter').value,
      };

      try {
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', playerId, total_rounds: rounds, filters, lang: myLang }),
        });
        const json = await res.json();
        if (json.room) {
          room = json.room;
          showWaiting();
          renderWaitingScreen();
          subscribeToRoom(room.code);
        } else {
          document.getElementById('mp-loading').classList.remove('hidden');
          document.getElementById('mp-loading').textContent = json.error || t('failedCreate');
          btn.disabled = false;
          btn.textContent = originalText;
        }
      } catch (err) {
        document.getElementById('mp-loading').classList.remove('hidden');
        document.getElementById('mp-loading').textContent = t('networkError');
        btn.disabled = false;
        btn.textContent = originalText;
      }
    }

    async function joinRoom() {
      const code = document.getElementById('joinCode').value.trim().toLowerCase();
      if (!code) return;
      const lang = document.getElementById('mp-langSelect').value || 'en';
      sessionStorage.setItem('mp_lang', lang);
      updateUIText();

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomCode: code, playerId, lang }),
      });
      const json = await res.json();
      if (json.room) {
        room = json.room;
        showWaiting();
        renderWaitingScreen();
        subscribeToRoom(room.code);
      } else {
        document.getElementById('mp-loading').classList.remove('hidden');
        document.getElementById('mp-loading').textContent = json.error || t('failedJoin');
      }
    }

    function subscribeToRoom(code) {
      channel = supabase.channel(`room:${code}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `code=eq.${code}`,
        }, (payload) => {
          const newRoom = payload.new;
          const oldRoom = room;
          room = newRoom;

          if (newRoom.state === 'playing') {
            if (oldRoom?.state === 'finished') {
              lastShownResultRound = null;
              suppressRaceTracker = false;
              currentRenderedRound = null;
              roomClosed = false;
              pendingWinnerRoom = null;
              hideWinner();
              const btn = document.getElementById('btn-play-again');
              if (btn) { btn.disabled = false; btn.textContent = t('restartGame'); }
            }
            if (oldRoom?.state === 'lobby') {
              // Transition from waiting to game
              showGame();
            }
            renderRoom();
          }

          if (newRoom.state === 'finished') {
            const lr = newRoom.last_result;
            const resultRound = lr?.round || 0;
            if (lr && resultRound > lastShownResultRound) {
              pendingWinnerRoom = newRoom;
              showRoundResult(newRoom);
              suppressRaceTracker = true;
              return;
            }
            showWinner(newRoom);
            return;
          }

          if (newRoom.state === 'lobby') {
            if (oldRoom?.state === 'finished') {
              // Play again - back to waiting screen
              hideWinner();
              showWaiting();
              renderWaitingScreen();
              return;
            }
            // Waiting screen updates
            renderWaitingScreen();
            return;
          }

          // Skip re-rendering if only metadata changed
          if (oldRoom &&
              oldRoom.current_round === newRoom.current_round &&
              oldRoom.current_pair?.[0]?.id === newRoom.current_pair?.[0]?.id &&
              oldRoom.current_pair?.[1]?.id === newRoom.current_pair?.[1]?.id &&
              JSON.stringify(oldRoom.answered) === JSON.stringify(newRoom.answered) &&
              JSON.stringify(oldRoom.scores) === JSON.stringify(newRoom.scores)) {
            return;
          }

          renderRoom();

          if (newRoom.last_result) {
            showRoundResult(newRoom);
            suppressRaceTracker = true;
          }
        })
        .subscribe();

      if (disconnectCheckInterval) clearInterval(disconnectCheckInterval);
      disconnectCheckInterval = setInterval(checkHeartbeatOnce, 5000);
    }

    async function ensureTranslated(events) {
      const lang = getLang();
      if (lang === 'en') return;
      if (!translations[lang]) translations[lang] = {};
      const cache = translations[lang];
      const ids = events.filter((e) => e && !cache[e.id]).map((e) => e.id);
      if (ids.length === 0) return;

      try {
        const res = await fetch(`/api/translate?ids=${ids.join(',')}&lang=${lang}`);
        if (res.ok) {
          const data = await res.json();
          Object.entries(data).forEach(([id, t]) => {
            cache[Number(id)] = t;
          });
        }
      } catch (err) {
        console.error('Translation fetch failed', err);
      }
    }

    function getText(event) {
      const lang = getLang();
      const t = translations[lang]?.[event.id];
      return {
        short_name: t?.short_name || event.short_name || '???',
        description: t?.description || event.description || '',
        fun_fact: t?.fun_fact || '',
      };
    }

    function showLobby() {
      document.getElementById('mp-lobby').classList.remove('hidden');
      document.getElementById('mp-waiting').classList.add('hidden');
      document.getElementById('mp-game').classList.add('hidden');
      document.getElementById('mp-winner')?.classList.add('hidden');
      document.getElementById('mp-result-overlay')?.classList.add('hidden');
      document.getElementById('mp-disconnect')?.classList.add('hidden');
    }

    function showWaiting() {
      document.getElementById('mp-lobby').classList.add('hidden');
      document.getElementById('mp-waiting').classList.remove('hidden');
      document.getElementById('mp-game').classList.add('hidden');
      document.getElementById('mp-winner')?.classList.add('hidden');
      document.getElementById('mp-result-overlay')?.classList.add('hidden');
      document.getElementById('mp-disconnect')?.classList.add('hidden');
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(sendHeartbeat, 10000);
      }
    }

    function showGame() {
      document.getElementById('mp-lobby').classList.add('hidden');
      document.getElementById('mp-waiting').classList.add('hidden');
      document.getElementById('mp-winner')?.classList.add('hidden');
      document.getElementById('mp-disconnect')?.classList.add('hidden');
      document.getElementById('mp-game').classList.remove('hidden');
      if (!heartbeatInterval) {
        heartbeatInterval = setInterval(sendHeartbeat, 10000);
      }
    }

    function hideWinner() {
      document.getElementById('mp-winner')?.classList.add('hidden');
    }

    function showWinner(roomData) {
      if (!document.getElementById('mp-winner').classList.contains('hidden')) return;
      document.getElementById('mp-game').classList.add('hidden');
      document.getElementById('mp-winner').classList.remove('hidden');

      const standings = roomData.winner;
      const titleEl = document.getElementById('mp-winner-text');
      titleEl.textContent = t('finalStandings');

      renderFinalStandings(standings);
    }

    async function showRoundResult(roomData) {
      const lr = roomData.last_result;
      if (!lr || !lr.answered) return;

      const overlay = document.getElementById('mp-result-overlay');
      const myAns = lr.answered[playerId];

      if (!myAns) return;

      const resultRound = lr.round || 0;
      if (resultRound <= lastShownResultRound) return;
      if (!overlay.classList.contains('hidden')) return;

      lastShownResultRound = resultRound;

      const allEvents = [lr.earlier, lr.pair[0], lr.pair[1]].filter(Boolean);
      await ensureTranslated(allEvents);

      const earlierText = getText(lr.earlier);

      const myResultEl = document.getElementById('mp-my-result');
      const resultPairEl = document.getElementById('mp-result-pair');

      if (myAns.timedOut) {
        myResultEl.innerHTML = `<div style="color: #fbbf24; font-size: 1.5rem; font-weight: 800;">⏱️ ${t('timedOut')} <span style="color: #fbbf24;">0pts</span></div>
          <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}</div>`;
        myResultEl.style.borderColor = '#fbbf24';
        myResultEl.style.background = 'rgba(251,191,36,0.1)';
      } else if (myAns.isCorrect) {
        myResultEl.innerHTML = `<div style="color: #22c55e; font-size: 1.5rem; font-weight: 800;">✅ ${t('correct')} <span style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts</span></div>
          <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}</div>`;
        myResultEl.style.borderColor = '#22c55e';
        myResultEl.style.background = 'rgba(34,197,94,0.1)';
      } else {
        myResultEl.innerHTML = `<div style="color: #ef4444; font-size: 1.5rem; font-weight: 800;">❌ ${t('wrong')} <span style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts</span></div>
          <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}</div>`;
        myResultEl.style.borderColor = '#ef4444';
        myResultEl.style.background = 'rgba(239,68,68,0.1)';
      }

      const a = lr.pair[0];
      const b = lr.pair[1];
      const ta = getText(a);
      const tb = getText(b);
      resultPairEl.innerHTML = `<div style="display: flex; gap: 1rem; justify-content: center; align-items: center;">
        <div style="text-align: center;">
          <div style="font-size: 1.1rem; font-weight: 700;">${ta.short_name}</div>
          <div style="color: #94a3b8; font-size: 0.85rem;">${a.date || a.year}</div>
        </div>
        <div style="color: #94a3b8;">vs</div>
        <div style="text-align: center;">
          <div style="font-size: 1.1rem; font-weight: 700;">${tb.short_name}</div>
          <div style="color: #94a3b8; font-size: 0.85rem;">${b.date || b.year}</div>
        </div>
      </div>`;

      const funFactText = earlierText.fun_fact || lr.fun_fact || '';
      if (funFactText) {
        resultPairEl.innerHTML += `<div style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(99,102,241,0.08); border-radius: 10px; border: 1px solid rgba(99,102,241,0.2); text-align: center;">
          <div style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: #818cf8; letter-spacing: 0.05em; margin-bottom: 0.25rem;">${t('didYouKnow')}</div>
          <div style="font-size: 0.95rem; color: #c7d2fe; font-style: italic; line-height: 1.5;">${funFactText}</div>
        </div>`;
      }

      renderRoundLeaderboard(lr);

      overlay.classList.remove('hidden');

      const nextRoundAt = roomData.next_round_at ? new Date(roomData.next_round_at) : null;
      const now = new Date();
      const delay = nextRoundAt ? Math.max(3000, nextRoundAt.getTime() - now.getTime()) : 3500;

      setTimeout(() => {
        hideRoundResult();
      }, delay);
    }

    function hideRoundResult() {
      document.getElementById('mp-result-overlay').classList.add('hidden');
      suppressRaceTracker = false;
      if (pendingWinnerRoom) {
        const finalRoom = pendingWinnerRoom;
        pendingWinnerRoom = null;
        showWinner(finalRoom);
      }
    }

    async function renderRoom() {
      const pair = room.current_pair || [];
      if (pair.length < 2) {
        document.getElementById('mp-status').textContent = t('loadingEvents');
        return;
      }

      const isNonEnglish = getLang() !== 'en';
      const cardA = document.getElementById('mp-cardA');
      const cardB = document.getElementById('mp-cardB');

      if (isNonEnglish) {
        document.getElementById('mp-loadingA').style.display = 'block';
        document.getElementById('mp-loadingB').style.display = 'block';
        document.getElementById('mp-nameA').style.display = 'none';
        document.getElementById('mp-descA').style.display = 'none';
        document.getElementById('mp-nameB').style.display = 'none';
        document.getElementById('mp-descB').style.display = 'none';
        cardA.classList.add('disabled');
        cardB.classList.add('disabled');
        document.getElementById('mp-status').textContent = t('loading');
      }

      await ensureTranslated(pair);

      if (isNonEnglish) {
        document.getElementById('mp-loadingA').style.display = 'none';
        document.getElementById('mp-loadingB').style.display = 'none';
        document.getElementById('mp-nameA').style.display = '';
        document.getElementById('mp-descA').style.display = '';
        document.getElementById('mp-nameB').style.display = '';
        document.getElementById('mp-descB').style.display = '';
      }

      const a = pair[0];
      const b = pair[1];
      const ta = getText(a);
      const tb = getText(b);

      document.getElementById('mp-nameA').textContent = ta.short_name;
      document.getElementById('mp-descA').textContent = ta.description;
      document.getElementById('mp-nameB').textContent = tb.short_name;
      document.getElementById('mp-descB').textContent = tb.description;

      renderLeaderboard();

      const round = room.current_round || 1;
      const total = room.total_rounds || 10;
      document.getElementById('mp-round').textContent = `${t('round')} ${round} / ${total}`;

      const ans = room.answered || {};
      const myAns = ans[playerId];

      const pairIds = pair.map((e) => e?.id).join('-');
      const roundFp = `${room.current_round || 0}-${pairIds}-${myAns ? 'answered' : 'open'}`;
      const shouldResetTimers = roundFp !== currentRenderedRound;

      if (shouldResetTimers) {
        currentRenderedRound = roundFp;
        if (countdownInterval) {
          clearInterval(countdownInterval);
          countdownInterval = null;
        }
        if (turnTimeoutId) {
          clearTimeout(turnTimeoutId);
          turnTimeoutId = null;
        }

        if (myAns) {
          document.getElementById('mp-status').textContent = t('waitingOpp');
          document.getElementById('mp-cardA').classList.add('disabled');
          document.getElementById('mp-cardB').classList.add('disabled');
        } else {
          const deadline = Date.now() + 45000;
          const updateCountdown = () => {
            const remaining = Math.ceil((deadline - Date.now()) / 1000);
            if (remaining <= 0) {
              document.getElementById('mp-status').textContent = t('waitingOpp');
              document.getElementById('mp-cardA').classList.add('disabled');
              document.getElementById('mp-cardB').classList.add('disabled');
              clearInterval(countdownInterval);
              countdownInterval = null;
              return;
            }
            document.getElementById('mp-status').textContent = `${t('yourTurn')} (${remaining}s)`;
          };
          updateCountdown();
          countdownInterval = setInterval(updateCountdown, 1000);
          turnTimeoutId = setTimeout(() => {
            const currentAns = room?.answered || {};
            if (currentAns[playerId] === undefined) {
              guess('timeout');
            }
          }, 45000);
          document.getElementById('mp-cardA').classList.remove('disabled');
          document.getElementById('mp-cardB').classList.remove('disabled');
        }
      }
    }

    async function sendHeartbeat() {
      if (!room || !room.code) return;
      try {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat', roomCode: room.code, playerId }),
        });
      } catch (err) {
        console.error('Heartbeat failed', err);
      }
    }

    async function checkHeartbeatOnce() {
      if (!room || !room.code || roomClosed) return;
      try {
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-heartbeat', roomCode: room.code, playerId }),
        });
        if (!res.ok) {
          console.warn('[heartbeat check] non-ok response', res.status);
          return;
        }
        const data = await res.json();
        if (data.roomClosed) {
          roomClosed = true;
          showRoomClosedOverlay();
          return;
        }
      } catch (e) {
        console.error('Heartbeat check failed', e);
      }
    }

    function showRoomClosedOverlay() {
      if (channel) {
        supabase.removeChannel(channel);
        channel = null;
      }
      if (turnTimeoutId) { clearTimeout(turnTimeoutId); turnTimeoutId = null; }
      if (countdownInterval) { clearInterval(countdownInterval); countdownInterval = null; }
      if (heartbeatInterval) { clearInterval(heartbeatInterval); heartbeatInterval = null; }
      if (disconnectCheckInterval) { clearInterval(disconnectCheckInterval); disconnectCheckInterval = null; }

      document.getElementById('mp-lobby')?.classList.add('hidden');
      document.getElementById('mp-waiting')?.classList.add('hidden');
      document.getElementById('mp-game')?.classList.add('hidden');
      document.getElementById('mp-result-overlay')?.classList.add('hidden');
      document.getElementById('mp-winner')?.classList.add('hidden');
      document.getElementById('mp-disconnect')?.classList.remove('hidden');

      document.getElementById('mp-disconnect-title').textContent = t('roomClosedTitle');
      document.getElementById('mp-disconnect-subtitle').textContent = t('roomClosedMsg');
      document.getElementById('mp-disconnect-msg').textContent = t('roomClosedSub');
    }

    async function restartGame() {
      if (!room || !room.code) return;
      const btn = document.getElementById('btn-play-again');
      btn.disabled = true;
      btn.textContent = t('waitingOpp');
      try {
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'restart', roomCode: room.code, playerId }),
        });
        const data = await res.json();
        if (data.waiting) {
          return;
        }
        if (data.restarted) {
          // Realtime will push state: 'lobby'
        }
      } catch (err) {
        console.error('Restart failed', err);
        btn.disabled = false;
        btn.textContent = t('restartGame');
      }
    }

    async function guess(side) {
      if (!room || !room.id) return;
      const ans = room.answered || {};
      if (ans[playerId]) return;

      document.getElementById('mp-status').textContent = t('sending');
      document.getElementById('mp-cardA').classList.add('disabled');
      document.getElementById('mp-cardB').classList.add('disabled');

      try {
        const res = await fetch('/api/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: room.id, playerId, choice: side }),
        });
        if (!res.ok) {
          const err = await res.json();
          document.getElementById('mp-status').textContent = (err.error || 'Unknown');
          if (!ans[playerId]) {
            document.getElementById('mp-cardA').classList.remove('disabled');
            document.getElementById('mp-cardB').classList.remove('disabled');
          }
        }
      } catch (err) {
        document.getElementById('mp-status').textContent = t('networkError');
        document.getElementById('mp-cardA').classList.remove('disabled');
        document.getElementById('mp-cardB').classList.remove('disabled');
      }
    }

    // Event listeners
    document.getElementById('btn-create')?.addEventListener('click', createRoom);
    document.getElementById('btn-join')?.addEventListener('click', joinRoom);
    document.getElementById('mp-cardA')?.addEventListener('click', () => guess('A'));
    document.getElementById('mp-cardB')?.addEventListener('click', () => guess('B'));
    document.getElementById('btn-play-again')?.addEventListener('click', restartGame);
    document.getElementById('btn-new-game')?.addEventListener('click', () => window.location.href = '/multiplayer');
    document.getElementById('btn-back-lobby')?.addEventListener('click', () => window.location.reload());
    document.getElementById('mp-langSelect')?.addEventListener('change', () => {
      changeLang(document.getElementById('mp-langSelect').value);
    });
    document.getElementById('btn-save-profile')?.addEventListener('click', saveProfile);
    document.getElementById('btn-start-game')?.addEventListener('click', startGame);

    document.querySelectorAll('#mp-game .lang-btn').forEach((btn) => {
      btn.addEventListener('click', () => changeLang(btn.dataset.lang));
    });

    // Leave room on page unload
    window.addEventListener('beforeunload', leaveRoom);

    return () => {
      if (channel) supabase.removeChannel(channel);
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      if (disconnectCheckInterval) clearInterval(disconnectCheckInterval);
      if (turnTimeoutId) clearTimeout(turnTimeoutId);
      if (countdownInterval) clearInterval(countdownInterval);
      window.removeEventListener('beforeunload', leaveRoom);
    };
  }, []);

  return (
    <div className="container">
      <h1 id="mp-title">Multiplayer</h1>
      <p className="subtitle" id="mp-subtitle">Compete with up to 9 friends in real time</p>

      <div id="mp-loading">Loading...</div>

      <div id="mp-lobby">
        <div className="field">
          <label htmlFor="mp-langSelect" id="mp-lobby-lang-label">Language</label>
          <select id="mp-langSelect">
            <option value="en">English</option>
            <option value="cs">Čeština</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

        <h3 id="mp-lobby-create-title" style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>Create Game</h3>

        <div className="field-row">
          <div className="field">
            <label htmlFor="mp-startYear" id="mp-lobby-startYear-label">Start Year</label>
            <input type="number" id="mp-startYear" placeholder="e.g. 1500" />
          </div>
          <div className="field">
            <label htmlFor="mp-endYear" id="mp-lobby-endYear-label">End Year</label>
            <input type="number" id="mp-endYear" placeholder="e.g. 2000" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="mp-regionFilter" id="mp-lobby-region-label">Region</label>
          <select id="mp-regionFilter">
            <option value="">All regions</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="mp-countryFilter" id="mp-lobby-country-label">Country</label>
          <select id="mp-countryFilter">
            <option value="">All countries</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="roundsInput" id="mp-lobby-rounds-label">Number of Rounds (5–50)</label>
          <input type="number" id="roundsInput" defaultValue={10} min={5} max={50} />
        </div>

        <div id="mp-poolCounter" className="pool-counter">Checking pool…</div>

        <button className="btn-primary" id="btn-create">Create Room</button>
        
        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
        
        <h3 id="mp-lobby-join-title" style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>Join Game</h3>

        <div className="field">
          <label htmlFor="joinCode" id="mp-lobby-roomCode-label">Room Code</label>
          <input type="text" id="joinCode" placeholder="abc" maxLength={3} />
          <button className="btn-secondary" id="btn-join">Join Room</button>
        </div>
      </div>

      {/* WAITING SCREEN */}
      <div id="mp-waiting" className="hidden">
        <div id="mp-waiting-content" style={{ maxWidth: '480px', margin: '0 auto' }}>
          <h2 id="mp-waiting-title" style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Waiting Room</h2>
          <p id="mp-room-info" style={{ textAlign: 'center', color: '#94a3b8', marginBottom: '1.5rem' }}>Room code: —</p>
          
          <div id="mp-profile-editor" style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
            <div className="field" style={{ marginBottom: '0.5rem' }}>
              <label htmlFor="mp-nickname-input" id="mp-nickname-label">Nickname</label>
              <input type="text" id="mp-nickname-input" maxLength={15} placeholder="Your name" />
            </div>
            <div className="field" style={{ marginBottom: '0.5rem' }}>
              <label id="mp-color-label">Color</label>
              <div id="mp-color-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}></div>
            </div>
            <button className="btn-secondary" id="btn-save-profile" style={{ width: '100%' }}>Save</button>
          </div>

          <div id="mp-players-list" style={{ marginBottom: '1.5rem' }}></div>

          <div id="mp-host-controls" className="hidden">
            <button className="btn-primary" id="btn-start-game" style={{ width: '100%' }}>Start Game</button>
            <p id="mp-start-error" style={{ color: '#f87171', textAlign: 'center', fontSize: '0.85rem', marginTop: '0.5rem' }}></p>
          </div>

          <div id="mp-guest-message" className="hidden" style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
            Waiting for host to start the game...
          </div>
        </div>
      </div>

      {/* GAME SCREEN */}
      <div id="mp-game" className="hidden">
        <nav className="lang-nav">
          <button data-lang="en" className="lang-btn active">EN</button>
          <button data-lang="cs" className="lang-btn">CS</button>
          <button data-lang="it" className="lang-btn">IT</button>
        </nav>

        <div id="mp-leaderboard" style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '0.75rem', marginBottom: '1rem', maxHeight: '200px', overflowY: 'auto' }}>
          <div id="mp-leaderboard-title" style={{ fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: '800', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem', textAlign: 'center' }}>Leaderboard</div>
          <div id="mp-leaderboard-body"></div>
        </div>

        <div id="mp-round" style={{ textAlign: 'center', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }} />

        <div id="mp-status" style={{ marginBottom: '1rem', fontWeight: 700, textAlign: 'center' }} />

        <div className="cards">
          <div className="card" id="mp-cardA">
            <div id="mp-loadingA" style={{ display: 'none', marginBottom: '0.5rem' }}><div className="spinner" style={{ width: '28px', height: '28px', margin: '0.5rem auto' }} /></div>
            <h2 id="mp-nameA" />
            <p id="mp-descA" />
          </div>
          <div className="card" id="mp-cardB">
            <div id="mp-loadingB" style={{ display: 'none', marginBottom: '0.5rem' }}><div className="spinner" style={{ width: '28px', height: '28px', margin: '0.5rem auto' }} /></div>
            <h2 id="mp-nameB" />
            <p id="mp-descB" />
          </div>
        </div>
      </div>

      {/* RESULT OVERLAY */}
      <div id="mp-result-overlay" className="win-overlay hidden">
        <div className="win-content" style={{ maxWidth: '480px' }}>
          <div id="mp-result-pair" style={{ marginBottom: '1.5rem' }} />
          
          <div id="mp-my-result" style={{ 
            padding: '1rem', 
            borderRadius: '12px', 
            border: '2px solid', 
            marginBottom: '0.75rem',
            textAlign: 'center'
          }} />
          
          <div id="mp-round-leaderboard" style={{ marginBottom: '1rem' }}></div>
          
          <div id="mp-next-round" style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Next round starting soon...
          </div>
          <div className="spinner" style={{ margin: '1rem auto', width: '32px', height: '32px' }} />
        </div>
      </div>

      {/* DISCONNECT / ROOM CLOSED OVERLAY */}
      <div id="mp-disconnect" className="win-overlay hidden">
        <div className="win-content">
          <div id="mp-disconnect-icon" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🚪</div>
          <h2 className="win-title" id="mp-disconnect-title" />
          <p id="mp-disconnect-subtitle" style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: '0.5rem 0' }} />
          <p id="mp-disconnect-msg" style={{ fontSize: '1rem', color: '#94a3b8', margin: '1rem 0' }} />
          <button className="btn-primary" id="btn-back-lobby">Back to Lobby</button>
        </div>
      </div>

      {/* WINNER / FINAL STANDINGS */}
      <div id="mp-winner" className="win-overlay hidden">
        <div className="win-content" style={{ maxWidth: '520px' }}>
          <h2 className="win-title" id="mp-winner-text" style={{ marginBottom: '1rem' }}>Final Standings</h2>
          
          <div id="mp-standings" style={{ marginBottom: '1.5rem', width: '100%' }}></div>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
            <button className="btn-primary" id="btn-play-again">Restart game</button>
            <button className="btn-secondary" id="btn-new-game">Return to lobby</button>
          </div>
        </div>
      </div>
    </div>
  );
}
