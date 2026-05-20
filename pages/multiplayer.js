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

    let playerId = localStorage.getItem('mp_player_id');
    if (!playerId) {
      playerId = Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem('mp_player_id', playerId);
    }

    let room = null;
    let channel = null;
    let allEvents = [];

    async function fetchEvents() {
      const { data } = await supabase.from('events').select('id, short_name, date, year, description, countries, region');
      if (data) allEvents = data;
    }
    fetchEvents();

    async function createRoom() {
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create', playerId }),
      });
      const json = await res.json();
      if (json.room) {
        room = json.room;
        showLobby(`Room code: ${room.code}`);
        subscribeToRoom(room.code);
      } else {
        document.getElementById('mp-loading').textContent = 'Failed to create room';
      }
    }

    async function joinRoom() {
      const code = document.getElementById('joinCode').value.trim().toLowerCase();
      if (!code) return;
      const res = await fetch('/api/room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join', roomCode: code, playerId }),
      });
      const json = await res.json();
      if (json.room) {
        room = json.room;
        showGame();
        subscribeToRoom(room.code);
      } else {
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
            renderRoom();
          }

          if (newRoom.state === 'finished') {
            showWinner(newRoom);
          }

          if (newRoom.current_pair?.length === 2) {
            renderRoom();
          }
        })
        .subscribe();
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
      document.getElementById('mp-winner-text').textContent = isMe ? 'You won! 🎉' : 'Opponent won!';
    }

    function renderRoom() {
      const pair = room.current_pair || [];
      if (pair.length < 2) return;

      const a = pair[0];
      const b = pair[1];

      document.getElementById('mp-nameA').textContent = a.short_name;
      document.getElementById('mp-descA').textContent = a.description;

      document.getElementById('mp-nameB').textContent = b.short_name;
      document.getElementById('mp-descB').textContent = b.description;

      const scores = room.scores || {};
      const streaks = room.streaks || {};
      document.getElementById('mp-my-score').textContent = scores[playerId] || 0;
      document.getElementById('mp-my-streak').textContent = streaks[playerId] || 0;

      const ans = room.answered || {};
      const myAns = ans[playerId];

      document.getElementById('mp-status').textContent =
        myAns ? 'Waiting for opponent...' : 'Your turn! Pick the earlier event.';

      document.getElementById('mp-cardA').classList.toggle('disabled', !!myAns);
      document.getElementById('mp-cardB').classList.toggle('disabled', !!myAns);
    }

    async function guess(side) {
      if (!room || !room.id) return;
      const ans = room.answered || {};
      if (ans[playerId]) return;

      document.getElementById('mp-status').textContent = 'Waiting for opponent...';
      document.getElementById('mp-cardA').classList.add('disabled');
      document.getElementById('mp-cardB').classList.add('disabled');

      await fetch('/api/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.id, playerId, choice: side }),
      });
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
        <button className="btn-primary" id="btn-create">Create Room</button>
        <div className="field" style={{ marginTop: '1rem' }}>
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
            <span className="label">Score</span> <span id="mp-my-score">0</span>
          </div>
          <div className="badge">
            <span className="label">Streak</span> <span id="mp-my-streak">0</span>
          </div>
        </div>

        <div id="mp-status" style={{ marginBottom: '1rem', fontWeight: 700 }} />

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

      <div id="mp-winner" className="win-overlay hidden">
        <div className="win-content">
          <div className="win-trophy">🏆</div>
          <h2 className="win-title" id="mp-winner-text" />
          <button className="btn-primary" id="btn-play-again">Play Again</button>
        </div>
      </div>
    </div>
  );
}
