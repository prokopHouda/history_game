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

    let room = null;
    let channel = null;
    let allEvents = [];
    const MIN_EVENTS = 25;
    let lastShownResultRound = null;
    let pendingRaceScores = null;
    let suppressRaceTracker = false;
    let turnTimeoutId = null;
    let countdownInterval = null;
    const translations = {}; // { [lang]: { [id]: { short_name, description } } }
    function getLang() { return sessionStorage.getItem('mp_lang') || 'en'; }

    const uiText = {
      en: {
        title: 'Multiplayer',
        subtitle: 'Compete with a friend in real time',
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
        waiting: 'Waiting...',
        waitingOpp: 'Waiting for opponent...',
        yourTurn: 'Your turn! Pick the earlier event.',
        loadingEvents: 'Loading events...',
        you: 'You',
        opponent: 'Opponent',
        raceTitle: '🏁 Race to History Glory',
        round: 'Round',
        correct: 'Correct!',
        wrong: 'Wrong!',
        timedOut: 'No answer',
        wasEarlier: 'was earlier',
        didYouKnow: 'Did you know?',
        oppLabel: 'Opponent:',
        nextRound: 'Next round starting soon...',
        youWon: '🏆 You Won!',
        youLost: '😅 You Lost!',
        tie: "🤝 It's a Tie!",
        playAgain: 'Play Again',
        winnerWin: [
          'History bows before your greatness!',
          'You are the true Chronomancer!',
          'Time itself cannot defeat you!',
          'The history books will remember this victory!',
          'Absolutely legendary performance!',
        ],
        winnerLose: [
          'Even Napoleon lost at Waterloo...',
          'History is written by the victors — study harder!',
          'Close, but no cigar! Try again?',
          'The timeline has spoken. Better luck next time!',
          'Don\'t worry, Einstein failed exams too!',
        ],
        winnerTie: [
          'Great minds think alike!',
          'A perfectly balanced duel of historians!',
          'Split decision — rematch time!',
          'You are equally matched in time!',
        ],
      },
      cs: {
        title: 'Multiplayer',
        subtitle: 'Soutěž se svým přítelem v reálném čase',
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
        waiting: 'Čekání...',
        waitingOpp: 'Čeká se na soupeře...',
        yourTurn: 'Jsi na tahu! Vyber dřívější událost.',
        loadingEvents: 'Načítání událostí...',
        you: 'Ty',
        opponent: 'Soupeř',
        raceTitle: '🏁 Závod ke slávě dějin',
        round: 'Kolo',
        correct: 'Správně!',
        wrong: 'Špatně!',
        timedOut: 'Bez odpovědi',
        wasEarlier: 'bylo dřív',
        didYouKnow: 'Věděl jsi?',
        oppLabel: 'Soupeř:',
        nextRound: 'Další kolo začíná za chvíli...',
        youWon: '🏆 Vyhrál jsi!',
        youLost: '😅 Prohrál jsi!',
        tie: '🤝 Remíza!',
        playAgain: 'Hrát znovu',
        winnerWin: [
          'Dějiny se klaní před tvou velikostí!',
          'Jsi pravý Chronomancer!',
          'Sám čas tě nemůže porazit!',
          'Dějepisné knihy si tuto výhru zapamatují!',
          'Absolutně legendární výkon!',
        ],
        winnerLose: [
          'I Napoleon prohrál u Waterloo...',
          'Dějiny píší vítězové — studuj více!',
          'Blízko, ale žádný doutník! Zkus to znovu?',
          'Časová osa rozhodla. Příště to vyjde!',
          'Neboj se, i Einstein propadával zkouškami!',
        ],
        winnerTie: [
          'Skvělé myšlenky se shodují!',
          'Dokonale vyrovnaný souboj historiků!',
          'Rozdílný verdikt — odveta!',
          'Jste vyrovnaní v čase!',
        ],
      },
      it: {
        title: 'Multiplayer',
        subtitle: 'Gareggia contro un amico in tempo reale',
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
        waiting: 'In attesa...',
        waitingOpp: 'In attesa dell\'avversario...',
        yourTurn: 'Tocca a te! Scegli l\'evento più antico.',
        loadingEvents: 'Caricamento eventi...',
        you: 'Tu',
        opponent: 'Avversario',
        raceTitle: '🏁 Corsa alla gloria storica',
        round: 'Round',
        correct: 'Corretto!',
        wrong: 'Sbagliato!',
        timedOut: 'Nessuna risposta',
        wasEarlier: 'era prima',
        didYouKnow: 'Lo sapevi?',
        oppLabel: 'Avversario:',
        nextRound: 'Il prossimo round inizierà a breve...',
        youWon: '🏆 Hai vinto!',
        youLost: '😅 Hai perso!',
        tie: '🤝 Pareggio!',
        playAgain: 'Gioca ancora',
        winnerWin: [
          'La storia si inchina davanti alla tua grandezza!',
          'Sei il vero Chronomancer!',
          'Il tempo stesso non può sconfiggerti!',
          'I libri di storia ricorderanno questa vittoria!',
          'Prestazione assolutamente leggendaria!',
        ],
        winnerLose: [
          'Anche Napoleone perse a Waterloo...',
          'La storia è scritta dai vincitori — studia di più!',
          'Ci sei andato vicino! Riprova?',
          'La linea temporale ha parlato. Buona fortuna la prossima volta!',
          'Non preoccuparti, anche Einstein bocciava gli esami!',
        ],
        winnerTie: [
          'Le grandi menti la pensano allo stesso modo!',
          'Un duello di storici perfettamente bilanciato!',
          'Decisione in parità — rivincita!',
          'Siete alla pari nel tempo!',
        ],
      },
    };

    function t(key) {
      const l = getLang();
      return uiText[l]?.[key] ?? uiText.en[key] ?? key;
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
      document.getElementById('mp-waiting-msg').textContent = t('waiting');
      document.getElementById('mp-game-you-label').textContent = t('you');
      document.getElementById('mp-game-opp-label').textContent = t('opponent');
      document.getElementById('mp-race-title').textContent = t('raceTitle');
      document.getElementById('mp-race-me-label').textContent = t('you');
      document.getElementById('mp-race-opp-label').textContent = t('opponent');
      document.getElementById('mp-next-round').textContent = t('nextRound');
      document.getElementById('btn-play-again').textContent = t('playAgain');
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
        counterEl.textContent = `Need at least ${MIN_EVENTS} events to play (${count}) ❌`;
        counterEl.style.color = '#f87171';
        startBtn.disabled = true;
        startBtn.style.opacity = '0.5';
        startBtn.style.cursor = 'not-allowed';
      }
    }

    function populateFilters(data) {
      const regions = [...new Set(data.map((e) => e.region).filter(Boolean))].sort();
      const regionSel = document.getElementById('mp-regionFilter');
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
      const countrySel = document.getElementById('mp-countryFilter');
      countrySel.innerHTML = '<option value="">All countries</option>';
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
      const rounds = parseInt(document.getElementById('roundsInput').value, 10) || 10;
      if (rounds < 5 || rounds > 50) {
        document.getElementById('mp-poolCounter').textContent = 'Rounds must be 5–50 ❌';
        document.getElementById('mp-poolCounter').style.color = '#f87171';
        return;
      }

      const { count, valid } = countMatchingEvents();
      if (!valid) {
        document.getElementById('mp-poolCounter').textContent = `Need at least ${MIN_EVENTS} events (${count}) ❌`;
        document.getElementById('mp-poolCounter').style.color = '#f87171';
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

      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', playerId, total_rounds: rounds, filters, lang: myLang }),
      });
      const json = await res.json();
      if (json.room) {
        room = json.room;
        showLobby(`Room code: ${room.code} — ${room.total_rounds} rounds`);
        subscribeToRoom(room.code);
      } else {
        document.getElementById('mp-loading').classList.remove('hidden');
        document.getElementById('mp-loading').textContent = json.error || 'Failed to create room';
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
        showGame();
        renderRoom();
        subscribeToRoom(room.code);
      } else {
        document.getElementById('mp-loading').classList.remove('hidden');
        document.getElementById('mp-loading').textContent = json.error || 'Failed to join room';
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
          room = newRoom;

          if (newRoom.state === 'playing') {
            showGame();
          }

          if (newRoom.state === 'finished') {
            showWinner(newRoom);
            return;
          }

          // Always render current game state first so new round cards are ready underneath
          renderRoom();

          // Show result overlay if there's a result for a round we haven't seen yet
          if (newRoom.last_result) {
            showRoundResult(newRoom);
            suppressRaceTracker = true;
          }
        })
        .subscribe();
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
      };
    }

    function showLobby(msg) {
      document.getElementById('mp-lobby').classList.add('hidden');
      document.getElementById('mp-waiting').classList.remove('hidden');
      document.getElementById('mp-waiting-msg').textContent = msg;
    }

    function showGame() {
      document.getElementById('mp-lobby').classList.add('hidden');
      document.getElementById('mp-waiting').classList.add('hidden');
      document.getElementById('mp-game').classList.remove('hidden');
    }

    function showWinner(roomData) {
      document.getElementById('mp-game').classList.add('hidden');
      document.getElementById('mp-winner').classList.remove('hidden');

      const w = roomData.winner;
      const isMe = w?.id === playerId;
      const myScore = (roomData.scores || {})[playerId] || 0;
      const oppId = roomData.host === playerId ? roomData.player_b : roomData.host;
      const oppScore = (roomData.scores || {})[oppId] || 0;

      const titleEl = document.getElementById('mp-winner-text');
      const msgEl = document.getElementById('mp-winner-msg');
      const scoreEl = document.getElementById('mp-winner-scores');

      const msgs = uiText[getLang()] || uiText.en;

      if (isMe) {
        titleEl.textContent = msgs.youWon;
        msgEl.textContent = msgs.winnerWin[Math.floor(Math.random() * msgs.winnerWin.length)];
      } else if (w?.id === null) {
        titleEl.textContent = msgs.tie;
        msgEl.textContent = msgs.winnerTie[Math.floor(Math.random() * msgs.winnerTie.length)];
      } else {
        titleEl.textContent = msgs.youLost;
        msgEl.textContent = msgs.winnerLose[Math.floor(Math.random() * msgs.winnerLose.length)];
      }

      scoreEl.textContent = `${myScore} — ${oppScore}`;
    }

    const winnerMessages = {
      win: [
        'History bows before your greatness!',
        'You are the true Chronomancer!',
        'Time itself cannot defeat you!',
        'The history books will remember this victory!',
        'Absolutely legendary performance!',
      ],
      lose: [
        'Even Napoleon lost at Waterloo...',
        'History is written by the victors — study harder!',
        'Close, but no cigar! Try again?',
        'The timeline has spoken. Better luck next time!',
        'Don\'t worry, Einstein failed exams too!',
      ],
      tie: [
        'Great minds think alike!',
        'A perfectly balanced duel of historians!',
        'Split decision — rematch time!',
        'You are equally matched in time!',
      ],
    };

    async function showRoundResult(roomData) {
      const lr = roomData.last_result;
      if (!lr || !lr.answered) return;

      const overlay = document.getElementById('mp-result-overlay');
      const myAns = lr.answered[playerId];
      const oppId = roomData.host === playerId ? roomData.player_b : roomData.host;
      const oppAns = lr.answered[oppId];

      if (!myAns || !oppAns) return;

      const resultRound = lr.round || 0;
      if (resultRound <= lastShownResultRound) return; // already showed this result
      if (!overlay.classList.contains('hidden')) return; // safety

      lastShownResultRound = resultRound;

      const allEvents = [lr.earlier, lr.pair[0], lr.pair[1]].filter(Boolean);
      await ensureTranslated(allEvents);

      const earlierText = getText(lr.earlier);

      const myResultEl = document.getElementById('mp-my-result');
      const oppResultEl = document.getElementById('mp-opp-result');
      const resultPairEl = document.getElementById('mp-result-pair');

      if (myAns.timedOut) {
        myResultEl.innerHTML = `\u003cdiv style="color: #fbbf24; font-size: 1.5rem; font-weight: 800;">⏱️ ${t('timedOut')} \u003cspan style="color: #fbbf24;">0pts\u003c/span>\u003c/div>
          \u003cdiv style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}\u003c/div>`;
        myResultEl.style.borderColor = '#fbbf24';
        myResultEl.style.background = 'rgba(251,191,36,0.1)';
      } else if (myAns.isCorrect) {
        myResultEl.innerHTML = `\u003cdiv style="color: #22c55e; font-size: 1.5rem; font-weight: 800;">✅ ${t('correct')} \u003cspan style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts\u003c/span>\u003c/div>
          \u003cdiv style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}\u003c/div>`;
        myResultEl.style.borderColor = '#22c55e';
        myResultEl.style.background = 'rgba(34,197,94,0.1)';
      } else {
        myResultEl.innerHTML = `\u003cdiv style="color: #ef4444; font-size: 1.5rem; font-weight: 800;">❌ ${t('wrong')} \u003cspan style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts\u003c/span>\u003c/div>
          \u003cdiv style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} ${t('wasEarlier')}\u003c/div>`;
        myResultEl.style.borderColor = '#ef4444';
        myResultEl.style.background = 'rgba(239,68,68,0.1)';
      }

      if (oppAns.timedOut) {
        oppResultEl.innerHTML = `<div style="color: #fbbf24; font-size: 1.2rem; font-weight: 700;">${t('oppLabel')} ⏱️ ${t('timedOut')} 0pts</div>`;
        oppResultEl.style.borderColor = '#fbbf24';
        oppResultEl.style.background = 'rgba(251,191,36,0.1)';
      } else if (oppAns.isCorrect) {
        oppResultEl.innerHTML = `<div style="color: #22c55e; font-size: 1.2rem; font-weight: 700;">${t('oppLabel')} ✅ +${oppAns.points}pts</div>`;
        oppResultEl.style.borderColor = '#22c55e';
        oppResultEl.style.background = 'rgba(34,197,94,0.1)';
      } else {
        oppResultEl.innerHTML = `<div style="color: #ef4444; font-size: 1.2rem; font-weight: 700;">${t('oppLabel')} ❌ ${oppAns.points}pts</div>`;
        oppResultEl.style.borderColor = '#ef4444';
        oppResultEl.style.background = 'rgba(239,68,68,0.1)';
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

      // Add Fun Fact section below the pair comparison
      const funFactText = lr.fun_fact || '';
      if (funFactText) {
        resultPairEl.innerHTML += `\u003cdiv style="margin-top: 1rem; padding: 0.75rem 1rem; background: rgba(99,102,241,0.08); border-radius: 10px; border: 1px solid rgba(99,102,241,0.2); text-align: center;">
          \u003cdiv style="font-size: 0.75rem; text-transform: uppercase; font-weight: 800; color: #818cf8; letter-spacing: 0.05em; margin-bottom: 0.25rem;">${t('didYouKnow')}\u003c/div>
          \u003cdiv style="font-size: 0.95rem; color: #c7d2fe; font-style: italic; line-height: 1.5;">${funFactText}\u003c/div>
        \u003c/div>`;
      }

      overlay.classList.remove('hidden');

      // Hide locally after 3.5s — do NOT call API, avoids race conditions between clients
      setTimeout(() => {
        hideRoundResult();
      }, 3500);
    }

    function hideRoundResult() {
      document.getElementById('mp-result-overlay').classList.add('hidden');
      if (pendingRaceScores) {
        updateRaceTracker(pendingRaceScores[0], pendingRaceScores[1]);
        pendingRaceScores = null;
      }
      suppressRaceTracker = false;
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

      const scores = room.scores || {};
      const oppId = room.host === playerId ? room.player_b : room.host;
      const myScore = scores[playerId] || 0;
      const oppScore = scores[oppId] || 0;

      document.getElementById('mp-my-score').textContent = myScore;
      document.getElementById('mp-opp-score').textContent = oppScore;

      if (suppressRaceTracker) {
        pendingRaceScores = [myScore, oppScore];
      } else {
        updateRaceTracker(myScore, oppScore);
      }

      const round = room.current_round || 1;
      const total = room.total_rounds || 10;
      document.getElementById('mp-round').textContent = `${t('round')} ${round} / ${total}`;

      const ans = room.answered || {};
      const myAns = ans[playerId];

      // Clear any existing countdown
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
          // Safety: only auto-submit if we still haven't answered
          const currentAns = room?.answered || {};
          if (currentAns[playerId] === undefined) {
            guess('timeout');
          }
        }, 45000);
        document.getElementById('mp-cardA').classList.remove('disabled');
        document.getElementById('mp-cardB').classList.remove('disabled');
      }
    }

    function updateRaceTracker(myScore, oppScore) {
      const myPct = Math.max(5, Math.min(95, ((myScore + 20) / 40) * 100));
      const oppPct = Math.max(5, Math.min(95, ((oppScore + 20) / 40) * 100));
      
      const track = document.getElementById('mp-race-track');
      const myBar = document.getElementById('mp-race-me');
      const oppBar = document.getElementById('mp-race-opp');
      
      if (track && myBar && oppBar) {
        myBar.style.width = myPct + '%';
        oppBar.style.width = oppPct + '%';
        
        if (myScore > oppScore) {
          myBar.style.background = 'linear-gradient(90deg, #22c55e, #34d399)';
          oppBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
        } else if (oppScore > myScore) {
          myBar.style.background = 'linear-gradient(90deg, #ef4444, #f87171)';
          oppBar.style.background = 'linear-gradient(90deg, #22c55e, #34d399)';
        } else {
          myBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
          oppBar.style.background = 'linear-gradient(90deg, #fbbf24, #f59e0b)';
        }
      }
    }

    async function guess(side) {
      if (!room || !room.id) return;
      const ans = room.answered || {};
      if (ans[playerId]) return;

      document.getElementById('mp-status').textContent = 'Sending...';
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
        document.getElementById('mp-status').textContent = 'Network error.';
        document.getElementById('mp-cardA').classList.remove('disabled');
        document.getElementById('mp-cardB').classList.remove('disabled');
      }
    }

    document.getElementById('btn-create')?.addEventListener('click', createRoom);
    document.getElementById('btn-join')?.addEventListener('click', joinRoom);
    document.getElementById('mp-cardA')?.addEventListener('click', () => guess('A'));
    document.getElementById('mp-cardB')?.addEventListener('click', () => guess('B'));
    document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());
    document.getElementById('mp-langSelect')?.addEventListener('change', () => {
      sessionStorage.setItem('mp_lang', document.getElementById('mp-langSelect').value);
      updateUIText();
    });

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container">
      <h1 id="mp-title">Multiplayer</h1>
      <p className="subtitle" id="mp-subtitle">Compete with a friend in real time</p>

      <div id="mp-loading">Loading...</div>

      <div id="mp-lobby">
        {/* Language picker visible to everyone before joining */}
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

      <div id="mp-waiting" className="hidden">
        <div className="spinner" style={{ margin: '2rem auto' }} />
        <p id="mp-waiting-msg">Waiting...</p>
      </div>

      <div id="mp-game" className="hidden">
        <div className="hud">
          <div className="badge">
            <span className="label" id="mp-game-you-label">You</span> <span id="mp-my-score">0</span>
          </div>
          <div className="badge">
            <span className="label" id="mp-game-opp-label">Opponent</span> <span id="mp-opp-score">0</span>
          </div>
        </div>

        <div id="mp-race-track" style={{ 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '12px', 
          padding: '0.75rem', 
          marginBottom: '1rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div id="mp-race-title" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏁 Race to History Glory
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span id="mp-race-me-label" style={{ fontSize: '0.85rem', minWidth: '3rem', color: '#6366f1' }}>You</span>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div id="mp-race-me" style={{ width: '50%', height: '100%', borderRadius: '999px', transition: 'all 0.6s ease', background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span id="mp-race-opp-label" style={{ fontSize: '0.85rem', minWidth: '3rem', color: '#ef4444' }}>Opp</span>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div id="mp-race-opp" style={{ width: '50%', height: '100%', borderRadius: '999px', transition: 'all 0.6s ease', background: 'linear-gradient(90deg, #ef4444, #f87171)' }} />
              </div>
            </div>
          </div>
        </div>

        <div id="mp-round" style={{ textAlign: 'center', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem' }} />

        <div id="mp-status" style={{ marginBottom: '1rem', fontWeight: 700, textAlign: 'center' }} />

        <div className="cards">
          <div className="card" id="mp-cardA">
            <div id="mp-loadingA" style={{ display: 'none', marginBottom: '0.5rem' }} ><div className="spinner" style={{ width: '28px', height: '28px', margin: '0.5rem auto' }} /></div>
            <h2 id="mp-nameA" />
            <p id="mp-descA" />
          </div>
          <div className="card" id="mp-cardB">
            <div id="mp-loadingB" style={{ display: 'none', marginBottom: '0.5rem' }} ><div className="spinner" style={{ width: '28px', height: '28px', margin: '0.5rem auto' }} /></div>
            <h2 id="mp-nameB" />
            <p id="mp-descB" />
          </div>
        </div>
      </div>

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
          
          <div id="mp-opp-result" style={{ 
            padding: '0.75rem', 
            borderRadius: '12px', 
            border: '2px solid',
            textAlign: 'center'
          }} />
          
          <div id="mp-next-round" style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
            Next round starting soon...
          </div>
          <div className="spinner" style={{ margin: '1rem auto', width: '32px', height: '32px' }} />
        </div>
      </div>

      <div id="mp-winner" className="win-overlay hidden">
        <div className="win-content">
          <div className="win-trophy">🏆</div>
          <h2 className="win-title" id="mp-winner-text" />
          <p id="mp-winner-msg" style={{ fontSize: '1.1rem', color: '#e2e8f0', margin: '1rem 0' }} />
          <div id="mp-winner-scores" style={{ fontSize: '2rem', fontWeight: 800, color: '#fbbf24', marginBottom: '1rem' }} />
          
          <button className="btn-primary" id="btn-play-again">Play Again</button>
        </div>
      </div>
    </div>
  );
}
