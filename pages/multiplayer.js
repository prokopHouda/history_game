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
    const translations = {}; // { [lang]: { [id]: { short_name, description } } }
    function getLang() { return sessionStorage.getItem('mp_lang') || 'en'; }

    async function initLobby() {
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

          if (newRoom.last_result) {
            showRoundResult(newRoom);
          } else {
            hideRoundResult();
            renderRoom();
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

      if (isMe) {
        titleEl.textContent = '🏆 You Won!';
        msgEl.textContent = winnerMessages.win[Math.floor(Math.random() * winnerMessages.win.length)];
      } else if (w?.id === null) {
        titleEl.textContent = '🤝 It\'s a Tie!';
        msgEl.textContent = winnerMessages.tie[Math.floor(Math.random() * winnerMessages.tie.length)];
      } else {
        titleEl.textContent = '😅 You Lost!';
        msgEl.textContent = winnerMessages.lose[Math.floor(Math.random() * winnerMessages.lose.length)];
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
      if (!overlay.classList.contains('hidden')) return;

      const allEvents = [lr.earlier, lr.pair[0], lr.pair[1]].filter(Boolean);
      await ensureTranslated(allEvents);

      const earlierText = getText(lr.earlier);

      const myResultEl = document.getElementById('mp-my-result');
      const oppResultEl = document.getElementById('mp-opp-result');
      const resultPairEl = document.getElementById('mp-result-pair');

      if (myAns.isCorrect) {
        myResultEl.innerHTML = `<div style="color: #22c55e; font-size: 1.5rem; font-weight: 800;">✅ Correct! <span style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts</span></div>
          <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} was earlier</div>`;
        myResultEl.style.borderColor = '#22c55e';
        myResultEl.style.background = 'rgba(34,197,94,0.1)';
      } else {
        myResultEl.innerHTML = `<div style="color: #ef4444; font-size: 1.5rem; font-weight: 800;">❌ Wrong! <span style="color: #fbbf24;">${myAns.points > 0 ? '+' : ''}${myAns.points}pts</span></div>
          <div style="color: #94a3b8; font-size: 0.9rem; margin-top: 0.25rem;">${earlierText.short_name} was earlier</div>`;
        myResultEl.style.borderColor = '#ef4444';
        myResultEl.style.background = 'rgba(239,68,68,0.1)';
      }

      if (oppAns.isCorrect) {
        oppResultEl.innerHTML = `<div style="color: #22c55e; font-size: 1.2rem; font-weight: 700;">Opponent: ✅ +${oppAns.points}pts</div>`;
        oppResultEl.style.borderColor = '#22c55e';
        oppResultEl.style.background = 'rgba(34,197,94,0.1)';
      } else {
        oppResultEl.innerHTML = `<div style="color: #ef4444; font-size: 1.2rem; font-weight: 700;">Opponent: ❌ ${oppAns.points}pts</div>`;
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

      overlay.classList.remove('hidden');

      setTimeout(() => {
        fetch('/api/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'clear-result', roomCode: roomData.code }),
        });
      }, 3500);
    }

    function hideRoundResult() {
      document.getElementById('mp-result-overlay').classList.add('hidden');
    }

    async function renderRoom() {
      const pair = room.current_pair || [];
      if (pair.length < 2) {
        document.getElementById('mp-status').textContent = 'Loading events...';
        return;
      }

      await ensureTranslated(pair);

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

      updateRaceTracker(myScore, oppScore);

      const round = room.current_round || 1;
      const total = room.total_rounds || 10;
      document.getElementById('mp-round').textContent = `Round ${round} / ${total}`;

      const ans = room.answered || {};
      const myAns = ans[playerId];

      if (myAns) {
        document.getElementById('mp-status').textContent = 'Waiting for opponent...';
        document.getElementById('mp-cardA').classList.add('disabled');
        document.getElementById('mp-cardB').classList.add('disabled');
      } else {
        document.getElementById('mp-status').textContent = 'Your turn! Pick the earlier event.';
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

      document.getElementById('mp-status').textContent = 'Submitting...';
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
          document.getElementById('mp-status').textContent = 'Error: ' + (err.error || 'Unknown');
          if (!ans[playerId]) {
            document.getElementById('mp-cardA').classList.remove('disabled');
            document.getElementById('mp-cardB').classList.remove('disabled');
          }
        }
      } catch (err) {
        document.getElementById('mp-status').textContent = 'Network error. Try again.';
        document.getElementById('mp-cardA').classList.remove('disabled');
        document.getElementById('mp-cardB').classList.remove('disabled');
      }
    }

    document.getElementById('btn-create')?.addEventListener('click', createRoom);
    document.getElementById('btn-join')?.addEventListener('click', joinRoom);
    document.getElementById('mp-cardA')?.addEventListener('click', () => guess('A'));
    document.getElementById('mp-cardB')?.addEventListener('click', () => guess('B'));
    document.getElementById('btn-play-again')?.addEventListener('click', () => window.location.reload());

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="container">
      <h1>Multiplayer</h1>
      <p className="subtitle">Compete with a friend in real time</p>

      <div id="mp-loading">Loading...</div>

      <div id="mp-lobby">
        {/* Language picker visible to everyone before joining */}
        <div className="field">
          <label htmlFor="mp-langSelect">Language</label>
          <select id="mp-langSelect">
            <option value="en">English</option>
            <option value="cs">Čeština</option>
            <option value="it">Italiano</option>
          </select>
        </div>

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />

        <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>Create Game</h3>

        <div className="field-row">
          <div className="field">
            <label htmlFor="mp-startYear">Start Year</label>
            <input type="number" id="mp-startYear" placeholder="e.g. 1500" />
          </div>
          <div className="field">
            <label htmlFor="mp-endYear">End Year</label>
            <input type="number" id="mp-endYear" placeholder="e.g. 2000" />
          </div>
        </div>

        <div className="field">
          <label htmlFor="mp-regionFilter">Region</label>
          <select id="mp-regionFilter">
            <option value="">All regions</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="mp-countryFilter">Country</label>
          <select id="mp-countryFilter">
            <option value="">All countries</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="roundsInput">Number of Rounds (5–50)</label>
          <input type="number" id="roundsInput" defaultValue={10} min={5} max={50} />
        </div>

        <div id="mp-poolCounter" className="pool-counter">Checking pool…</div>

        <button className="btn-primary" id="btn-create">Create Room</button>
        
        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '1.5rem 0' }} />
        
        <h3 style={{ color: '#94a3b8', fontSize: '1rem', marginBottom: '1rem' }}>Join Game</h3>

        <div className="field">
          <label htmlFor="joinCode">Room Code</label>
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
            <span className="label">You</span> <span id="mp-my-score">0</span>
          </div>
          <div className="badge">
            <span className="label">Opponent</span> <span id="mp-opp-score">0</span>
          </div>
        </div>

        <div id="mp-race-track" style={{ 
          background: 'rgba(0,0,0,0.3)', 
          borderRadius: '12px', 
          padding: '0.75rem', 
          marginBottom: '1rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🏁 Race to History Glory
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', minWidth: '3rem', color: '#6366f1' }}>You</span>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '999px', height: '12px', overflow: 'hidden' }}>
                <div id="mp-race-me" style={{ width: '50%', height: '100%', borderRadius: '999px', transition: 'all 0.6s ease', background: 'linear-gradient(90deg, #6366f1, #818cf8)' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', minWidth: '3rem', color: '#ef4444' }}>Opp</span>
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
            <h2 id="mp-nameA" />
            <p id="mp-descA" />
          </div>
          <div className="card" id="mp-cardB">
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
          
          <div style={{ marginTop: '1.5rem', color: '#94a3b8', fontSize: '0.9rem' }}>
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
