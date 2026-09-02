import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { baseUiText, makeT } from '../lib/i18n.js';
import { ensureTranslated as ensureTranslatedLib, getText as getTextLib } from '../lib/translate.js';
import Lobby from '../components/Lobby.js';
import WaitingRoom from '../components/WaitingRoom.js';
import GameScreen from '../components/GameScreen.js';
import ResultOverlay from '../components/ResultOverlay.js';
import FinalStandings from '../components/FinalStandings.js';
import DisconnectOverlay from '../components/DisconnectOverlay.js';

const MIN_EVENTS = 25;
const TURN_TIMEOUT_MS = 45000;
const TURN_TIMEOUT_GRACE_MS = 500;

const MP_UI = {
  en: {
    ...baseUiText.en,
    title: 'Multiplayer',
    subtitle: 'Compete with up to 9 friends in real time',
    createGame: 'Create Game',
    joinGame: 'Join Game',
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
    placeholderStartYear: 'e.g. 1500',
    placeholderEndYear: 'e.g. 2000',
    placeholderRoomCode: 'abc',
  },
  cs: {
    ...baseUiText.cs,
    title: 'Multiplayer',
    subtitle: 'Soutěž s až 9 přáteli v reálném čase',
    createGame: 'Vytvořit hru',
    joinGame: 'Připojit se ke hře',
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
    placeholderStartYear: 'např. 1500',
    placeholderEndYear: 'např. 2000',
    placeholderRoomCode: 'abc',
  },
  it: {
    ...baseUiText.it,
    title: 'Multiplayer',
    subtitle: 'Gareggia con fino a 9 amici in tempo reale',
    createGame: 'Crea partita',
    joinGame: 'Unisciti alla partita',
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
    placeholderStartYear: 'es. 1500',
    placeholderEndYear: 'es. 2000',
    placeholderRoomCode: 'abc',
  },
};

export default function Multiplayer() {
  const [lang, setLang] = useState(() => (typeof window !== 'undefined' ? sessionStorage.getItem('mp_lang') || 'en' : 'en'));
  const [screen, setScreen] = useState('loading');
  const [allEvents, setAllEvents] = useState([]);
  const [room, setRoom] = useState(null);
  const [initError, setInitError] = useState('');
  const [lobbyError, setLobbyError] = useState('');
  const [startError, setStartError] = useState('');
  const [creating, setCreating] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [cardAState, setCardAState] = useState('');
  const [cardBState, setCardBState] = useState('');
  const [translating, setTranslating] = useState(false);
  const [roundResult, setRoundResult] = useState(null);
  const [showResultOverlay, setShowResultOverlay] = useState(false);
  const [showFinalStandings, setShowFinalStandings] = useState(false);
  const [nickname, setNickname] = useState('');
  const [pendingColor, setPendingColor] = useState(null);
  const [nicknameDirty, setNicknameDirty] = useState(false);

  const playerIdRef = useRef('');
  const channelRef = useRef(null);
  const supabaseRef = useRef(null);
  const translationsRef = useRef({});
  const lastShownResultRoundRef = useRef(null);
  const currentRenderedRoundRef = useRef(null);
  const pendingWinnerRoomRef = useRef(null);
  const turnTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const disconnectCheckIntervalRef = useRef(null);
  const roomClosedRef = useRef(false);
  const roomRef = useRef(null);
  const resultHideTimeoutRef = useRef(null);

  const { t, tf } = makeT(MP_UI, () => lang);

  // Initialize playerId
  if (!playerIdRef.current && typeof window !== 'undefined') {
    let pid = sessionStorage.getItem('mp_player_id');
    if (!pid) {
      pid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('mp_player_id', pid);
    }
    playerIdRef.current = pid;
  }

  // Keep roomRef in sync for use in callbacks
  useEffect(() => { roomRef.current = room; }, [room]);

  // Helper: get translated text for an event
  const getText = useCallback((event) => {
    return getTextLib(event, translationsRef.current, lang);
  }, [lang]);

  // Helper: ensure translated
  const ensureTranslated = useCallback(async (events) => {
    return ensureTranslatedLib(events, translationsRef.current, lang);
  }, [lang]);

  // Init: load events
  useEffect(() => {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_KEY;
    if (!SUPABASE_URL || !SUPABASE_KEY) return;

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseRef.current = supabase;

    (async () => {
      const { data } = await supabase.from('events').select('id, short_name, date, year, description, countries, region');
      if (data) {
        setAllEvents(data);
        setScreen('lobby');
      }
    })();
  }, []);

  // Heartbeat interval — runs while in waiting or game screen
  useEffect(() => {
    if (screen !== 'waiting' && screen !== 'game') {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      return;
    }
    if (heartbeatIntervalRef.current) return;

    const sendHeartbeat = async () => {
      const r = roomRef.current;
      if (!r || !r.code) return;
      try {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'heartbeat', roomCode: r.code, playerId: playerIdRef.current }),
        });
      } catch (err) {
        console.error('Heartbeat failed', err);
      }
    };
    sendHeartbeat();
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, 10000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
  }, [screen]);

  // Disconnect check interval — runs while subscribed to a room
  useEffect(() => {
    if (screen !== 'waiting' && screen !== 'game') {
      if (disconnectCheckIntervalRef.current) {
        clearInterval(disconnectCheckIntervalRef.current);
        disconnectCheckIntervalRef.current = null;
      }
      return;
    }

    const checkHeartbeat = async () => {
      const r = roomRef.current;
      if (!r || !r.code || roomClosedRef.current) return;
      try {
        const res = await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'check-heartbeat', roomCode: r.code, playerId: playerIdRef.current }),
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data.roomClosed) {
          roomClosedRef.current = true;
          showDisconnect();
        }
      } catch (e) {
        console.error('Heartbeat check failed', e);
      }
    };
    disconnectCheckIntervalRef.current = setInterval(checkHeartbeat, 5000);

    return () => {
      if (disconnectCheckIntervalRef.current) {
        clearInterval(disconnectCheckIntervalRef.current);
        disconnectCheckIntervalRef.current = null;
      }
    };
  }, [screen]);

  // Turn timer — resets when round/pair changes
  useEffect(() => {
    if (screen !== 'game' || !room) return;
    const pair = room.current_pair || [];
    if (pair.length < 2) return;

    const ans = room.answered || {};
    const myAns = ans[playerIdRef.current];

    const pairIds = pair.map((e) => e?.id).join('-');
    const roundFp = `${room.current_round || 0}-${pairIds}-${myAns ? 'answered' : 'open'}`;

    if (roundFp === currentRenderedRoundRef.current) return;
    currentRenderedRoundRef.current = roundFp;

    // Clear previous timers
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (turnTimeoutRef.current) { clearTimeout(turnTimeoutRef.current); turnTimeoutRef.current = null; }

    // Reset card states
    setCardAState('');
    setCardBState('');

    if (myAns) {
      setStatusText(t('waitingOpp'));
      const chosenSide = myAns.choice;
      if (chosenSide === 'A') {
        setCardAState('picked');
        setCardBState('unpicked');
      } else if (chosenSide === 'B') {
        setCardBState('picked');
        setCardAState('unpicked');
      } else {
        setCardAState('unpicked');
        setCardBState('unpicked');
      }
    } else {
      const roundStartedMs = room.round_started_at ? new Date(room.round_started_at).getTime() : Date.now();
      const deadline = roundStartedMs + TURN_TIMEOUT_MS;
      const msLeft = Math.max(0, deadline + TURN_TIMEOUT_GRACE_MS - Date.now());
      const updateCountdown = () => {
        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        if (remaining <= 0) {
          setStatusText(t('waitingOpp'));
          setCardAState('unpicked');
          setCardBState('unpicked');
          if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
          return;
        }
        setCountdown(remaining);
        setStatusText(`${t('yourTurn')} (${remaining}s)`);
      };
      updateCountdown();
      countdownIntervalRef.current = setInterval(updateCountdown, 1000);
      turnTimeoutRef.current = setTimeout(() => {
        const currentAns = roomRef.current?.answered || {};
        if (currentAns[playerIdRef.current] === undefined) {
          guess('timeout');
        }
      }, msLeft);
    }
  }, [room, screen, t]);

  // Translate current pair when language changes
  useEffect(() => {
    if (!room || !room.current_pair || room.current_pair.length < 2) return;
    if (lang === 'en') return;
    (async () => {
      setTranslating(true);
      await ensureTranslated(room.current_pair);
      setTranslating(false);
    })();
  }, [lang, room, ensureTranslated]);

  // Result overlay auto-hide — reads roundResult (the snapshot captured
  // when the overlay was triggered) so a racing realtime update that
  // nulls last_result can't prevent the timeout from being scheduled.
  useEffect(() => {
    if (!showResultOverlay) return;
    const r = roundResult;
    if (!r) return;
    const lr = r.last_result;
    if (!lr) return;
    const funFact = lr.fun_fact || getTextLib(lr.earlier, translationsRef.current, lang).fun_fact || '';
    const delay = funFact ? 10000 : 3500;
    const nextRoundAt = r.next_round_at ? new Date(r.next_round_at) : null;
    const now = new Date();
    // Cap actualDelay so a far-future next_round_at (clock skew or bad
    // data) can't stall the overlay indefinitely.
    const actualDelay = nextRoundAt
      ? Math.min(15000, Math.max(3000, nextRoundAt.getTime() - now.getTime()))
      : delay;

    resultHideTimeoutRef.current = setTimeout(() => {
      setShowResultOverlay(false);
      setRoundResult(null);
      if (pendingWinnerRoomRef.current) {
        setShowFinalStandings(true);
        pendingWinnerRoomRef.current = null;
      }
    }, actualDelay);

    return () => {
      if (resultHideTimeoutRef.current) {
        clearTimeout(resultHideTimeoutRef.current);
        resultHideTimeoutRef.current = null;
      }
    };
  }, [showResultOverlay, lang, roundResult]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (channelRef.current) supabaseRef.current?.removeChannel(channelRef.current);
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      if (disconnectCheckIntervalRef.current) clearInterval(disconnectCheckIntervalRef.current);
      if (turnTimeoutRef.current) clearTimeout(turnTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (resultHideTimeoutRef.current) clearTimeout(resultHideTimeoutRef.current);
    };
  }, []);

  // Leave room on page unload
  useEffect(() => {
    const leaveRoom = async () => {
      const r = roomRef.current;
      if (!r || !r.code) return;
      try {
        await fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'leave', roomCode: r.code, playerId: playerIdRef.current }),
        });
      } catch (err) {
        console.error('Leave failed', err);
      }
    };
    window.addEventListener('beforeunload', leaveRoom);
    return () => window.removeEventListener('beforeunload', leaveRoom);
  }, []);

  function showDisconnect() {
    if (channelRef.current) {
      supabaseRef.current?.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    if (turnTimeoutRef.current) { clearTimeout(turnTimeoutRef.current); turnTimeoutRef.current = null; }
    if (countdownIntervalRef.current) { clearInterval(countdownIntervalRef.current); countdownIntervalRef.current = null; }
    if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null; }
    if (disconnectCheckIntervalRef.current) { clearInterval(disconnectCheckIntervalRef.current); disconnectCheckIntervalRef.current = null; }
    setScreen('disconnect');
  }

  function subscribeToRoom(code) {
    const supabase = supabaseRef.current;
    if (!supabase) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    channelRef.current = supabase.channel(`room:${code}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `code=eq.${code}`,
      }, (payload) => {
        const newRoom = payload.new;
        const oldRoom = roomRef.current;
        setRoom(newRoom);

        if (newRoom.state === 'playing') {
          if (oldRoom?.state === 'finished') {
            lastShownResultRoundRef.current = null;
            currentRenderedRoundRef.current = null;
            roomClosedRef.current = false;
            pendingWinnerRoomRef.current = null;
            setShowFinalStandings(false);
            setShowResultOverlay(false);
            setRoundResult(null);
          }
          if (oldRoom?.state === 'lobby') {
            setScreen('game');
          }
          // Show round-result overlay for non-final rounds
          const lr = newRoom.last_result;
          const resultRound = lr?.round || 0;
          if (lr && resultRound > (lastShownResultRoundRef.current || 0)) {
            lastShownResultRoundRef.current = resultRound;
            (async () => {
              const allEv = [lr.earlier, lr.pair[0], lr.pair[1]].filter(Boolean);
              await ensureTranslatedLib(allEv, translationsRef.current, lang);
              setRoundResult(newRoom);
              setShowResultOverlay(true);
            })();
          }
        }

        if (newRoom.state === 'finished') {
          const lr = newRoom.last_result;
          const resultRound = lr?.round || 0;
          if (lr && resultRound > (lastShownResultRoundRef.current || 0)) {
            pendingWinnerRoomRef.current = newRoom;
            lastShownResultRoundRef.current = resultRound;
            (async () => {
              const allEv = [lr.earlier, lr.pair[0], lr.pair[1]].filter(Boolean);
              await ensureTranslatedLib(allEv, translationsRef.current, lang);
              setRoundResult(newRoom);
              setShowResultOverlay(true);
            })();
            return;
          }
          pendingWinnerRoomRef.current = newRoom;
          if (!showResultOverlay) {
            setShowFinalStandings(true);
          }
          return;
        }

        if (newRoom.state === 'lobby') {
          if (oldRoom?.state === 'finished') {
            setShowFinalStandings(false);
            setShowResultOverlay(false);
            setRoundResult(null);
            setScreen('waiting');
            return;
          }
          return;
        }
      })
      .subscribe();
  }

  async function createRoom(filters, rounds, selectedLang) {
    setCreating(true);
    setLobbyError('');
    sessionStorage.setItem('mp_lang', selectedLang);
    setLang(selectedLang);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', playerId: playerIdRef.current, total_rounds: rounds, filters, lang: selectedLang }),
      });
      const json = await res.json();
      if (json.room) {
        setRoom(json.room);
        setScreen('waiting');
        subscribeToRoom(json.room.code);
      } else {
        setLobbyError(json.error || t('failedCreate'));
      }
    } catch (err) {
      setLobbyError(t('networkError'));
    }
    setCreating(false);
  }

  async function joinRoom(code, selectedLang) {
    setLobbyError('');
    sessionStorage.setItem('mp_lang', selectedLang);
    setLang(selectedLang);

    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomCode: code, playerId: playerIdRef.current, lang: selectedLang }),
      });
      const json = await res.json();
      if (json.room) {
        setRoom(json.room);
        setScreen('waiting');
        subscribeToRoom(json.room.code);
      } else {
        setLobbyError(json.error || t('failedJoin'));
      }
    } catch (err) {
      setLobbyError(t('networkError'));
    }
  }

  async function saveProfile() {
    const r = roomRef.current;
    if (!r || !r.code) return;
    const trimmedNickname = nickname.trim().slice(0, 15);
    const color = pendingColor || r.players?.find((p) => p.id === playerIdRef.current)?.color;
    setPendingColor(null);
    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update-profile', roomCode: r.code, playerId: playerIdRef.current, nickname: trimmedNickname, color }),
      });
    } catch (err) {
      console.error('Profile update failed', err);
    }
  }

  async function startGame() {
    const r = roomRef.current;
    if (!r || !r.code) return;
    setStartError('');
    try {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', roomCode: r.code, playerId: playerIdRef.current }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStartError(data.error || t('networkError'));
      }
    } catch (err) {
      setStartError(t('networkError'));
    }
  }

  async function guess(side) {
    const r = roomRef.current;
    if (!r || !r.id) return;
    const ans = r.answered || {};
    if (ans[playerIdRef.current]) return;

    if (side !== 'timeout') {
      setCardAState(side === 'A' ? 'picked' : 'unpicked');
      setCardBState(side === 'B' ? 'picked' : 'unpicked');
    } else {
      setCardAState('unpicked');
      setCardBState('unpicked');
    }
    setStatusText(t('waitingOpp'));

    try {
      const res = await fetch('/api/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: r.id, playerId: playerIdRef.current, choice: side }),
      });
      if (!res.ok) {
        const err = await res.json();
        setStatusText(err.error || 'Unknown');
        if (!ans[playerIdRef.current]) {
          setCardAState('');
          setCardBState('');
        }
      }
    } catch (err) {
      setStatusText(t('networkError'));
      setCardAState('');
      setCardBState('');
    }
  }

  async function restartGame() {
    const r = roomRef.current;
    if (!r || !r.code) return;
    try {
      await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restart', roomCode: r.code, playerId: playerIdRef.current }),
      });
    } catch (err) {
      console.error('Restart failed', err);
    }
  }

  function backToLobby() {
    window.location.reload();
  }

  function changeLang(l) {
    if (l === lang) return;
    sessionStorage.setItem('mp_lang', l);
    setLang(l);
  }

  function handleNicknameChange(value) {
    setNickname(value);
    setNicknameDirty(true);
  }

  // Sync nickname from room data when not dirty
  useEffect(() => {
    if (!room || nicknameDirty) return;
    const me = room.players?.find((p) => p.id === playerIdRef.current);
    if (me?.nickname) {
      setNickname(me.nickname);
    }
  }, [room, nicknameDirty]);

  const isHost = room?.players?.find((p) => p.id === playerIdRef.current)?.isHost || false;

  // Compute result overlay data
  let resultOverlayData = null;
  if (showResultOverlay && roundResult?.last_result) {
    const lr = roundResult.last_result;
    const earlierText = getTextLib(lr.earlier, translationsRef.current, lang);
    const a = lr.pair[0];
    const b = lr.pair[1];
    const ta = getTextLib(a, translationsRef.current, lang);
    const tb = getTextLib(b, translationsRef.current, lang);
    const funFactText = earlierText.fun_fact || lr.fun_fact || '';
    resultOverlayData = {
      result: lr,
      earlierText,
      pairTextA: { short_name: ta.short_name, date: a.date || a.year, countries: a.countries },
      pairTextB: { short_name: tb.short_name, date: b.date || b.year, countries: b.countries },
      funFactText,
    };
  }

  return (
    <div className="container">
      <h1>{t('title')}</h1>
      <p className="subtitle">{t('subtitle')}</p>

      <Link
        href="/"
        className="subtitle"
        style={{ display: 'block', marginBottom: '1rem', background: 'rgba(99,102,241,0.2)', padding: '0.5rem 1rem', borderRadius: '8px', textDecoration: 'none' }}
      >
        ← Single Player
      </Link>

      {screen === 'loading' && (
        <div>{initError || t('loading')}</div>
      )}

      {screen === 'lobby' && (
        <Lobby
          allEvents={allEvents}
          lang={lang}
          t={t}
          tf={tf}
          MIN_EVENTS={MIN_EVENTS}
          onCreate={createRoom}
          onJoin={joinRoom}
          creating={creating}
          error={lobbyError}
        />
      )}

      {screen === 'waiting' && room && (
        <WaitingRoom
          room={room}
          playerId={playerIdRef.current}
          t={t}
          tf={tf}
          isHost={isHost}
          nickname={nickname}
          pendingColor={pendingColor}
          nicknameDirty={nicknameDirty}
          startError={startError}
          onSaveProfile={saveProfile}
          onStart={startGame}
          onNicknameChange={handleNicknameChange}
          onColorSelect={setPendingColor}
        />
      )}

      {screen === 'game' && room && (
        <GameScreen
          room={room}
          playerId={playerIdRef.current}
          lang={lang}
          t={t}
          statusText={statusText}
          cardAState={cardAState}
          cardBState={cardBState}
          translating={translating}
          onGuess={guess}
          onLangChange={changeLang}
          getText={getText}
        />
      )}

      {showResultOverlay && resultOverlayData && (
        <ResultOverlay
          result={resultOverlayData.result}
          room={roundResult}
          playerId={playerIdRef.current}
          t={t}
          earlierText={resultOverlayData.earlierText}
          pairTextA={resultOverlayData.pairTextA}
          pairTextB={resultOverlayData.pairTextB}
          funFactText={resultOverlayData.funFactText}
          lang={lang}
        />
      )}

      {showFinalStandings && room?.winner && (
        <FinalStandings
          standings={room.winner}
          playerId={playerIdRef.current}
          t={t}
          onRestart={restartGame}
          onReturnToLobby={() => window.location.href = '/multiplayer'}
        />
      )}

      {screen === 'disconnect' && (
        <DisconnectOverlay
          t={t}
          onBackToLobby={backToLobby}
        />
      )}
    </div>
  );
}