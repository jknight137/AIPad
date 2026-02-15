<script lang="ts">
  import { onMount } from 'svelte';
  import { todos, inboxTodos, activeTodos, loadTodos } from '../../stores/todos';
  import { notes, loadNotes } from '../../stores/notes';
  import { ollamaConnected } from '../../stores/ollama';
  import { vaultUnlocked } from '../../stores/vault';
  import { pomodoro, pomodoroDisplay, startPomodoro } from '../../stores/pomodoro';
  import { activeView } from '../../stores/navigation';
  import { events, loadEvents } from '../../stores/calendar';
  import { format, isToday, isTomorrow, parseISO } from 'date-fns';

  let todayEvents: typeof $events = [];
  let upcomingTodos: typeof $activeTodos = [];

  $: {
    todayEvents = $events.filter(e => isToday(parseISO(e.start_dt)));
    upcomingTodos = $activeTodos
      .filter(t => t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
      .slice(0, 5);
  }

  onMount(async () => {
    await Promise.all([loadNotes(), loadTodos(), loadEvents()]);
  });
</script>

<div class="dashboard">
  <header class="dash-header">
    <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'} 👋</h1>
    <p class="text-muted">{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
  </header>

  <div class="dash-grid">
    <!-- Quick Stats -->
    <div class="dash-card stats-card">
      <h3>📊 Overview</h3>
      <div class="stat-grid">
        <button class="stat" on:click={() => activeView.set('notes')}>
          <span class="stat-value">{$notes.length}</span>
          <span class="stat-label">Notes</span>
        </button>
        <button class="stat" on:click={() => activeView.set('todos')}>
          <span class="stat-value">{$activeTodos.length}</span>
          <span class="stat-label">Active Todos</span>
        </button>
        <button class="stat" on:click={() => activeView.set('todos')}>
          <span class="stat-value">{$inboxTodos.length}</span>
          <span class="stat-label">Inbox</span>
        </button>
        <button class="stat" on:click={() => activeView.set('calendar')}>
          <span class="stat-value">{todayEvents.length}</span>
          <span class="stat-label">Today's Events</span>
        </button>
      </div>
    </div>

    <!-- Inbox / Quick Capture -->
    <div class="dash-card">
      <h3>📥 Inbox ({$inboxTodos.length})</h3>
      {#if $inboxTodos.length === 0}
        <p class="empty-msg">Inbox zero! 🎉</p>
      {:else}
        <ul class="mini-list">
          {#each $inboxTodos.slice(0, 5) as todo}
            <li>{todo.content}</li>
          {/each}
          {#if $inboxTodos.length > 5}
            <li class="text-muted">+{$inboxTodos.length - 5} more...</li>
          {/if}
        </ul>
      {/if}
      <button class="dash-btn" on:click={() => activeView.set('todos')}>
        Go to Inbox →
      </button>
    </div>

    <!-- Pomodoro Quick Start -->
    <div class="dash-card">
      <h3>🍅 Pomodoro</h3>
      {#if $pomodoro.phase === 'idle'}
        <p class="empty-msg">No active session</p>
        <button class="dash-btn accent" on:click={() => startPomodoro()}>
          Start Focus Session
        </button>
      {:else}
        <div class="pomo-display">
          <span class="pomo-big-time">{$pomodoroDisplay}</span>
          <span class="pomo-phase-label">
            {$pomodoro.phase === 'work' ? '🔴 Focusing' : '🟢 Break time'}
          </span>
        </div>
      {/if}
    </div>

    <!-- Upcoming Todos -->
    <div class="dash-card">
      <h3>📋 Upcoming</h3>
      {#if upcomingTodos.length === 0}
        <p class="empty-msg">No upcoming deadlines</p>
      {:else}
        <ul class="mini-list">
          {#each upcomingTodos as todo}
            <li>
              <span class="priority-dot {todo.priority}"></span>
              {todo.content}
              <span class="text-xs text-muted">
                {todo.due_date ? format(parseISO(todo.due_date), 'MMM d') : ''}
              </span>
            </li>
          {/each}
        </ul>
      {/if}
      <button class="dash-btn" on:click={() => activeView.set('eisenhower')}>
        Eisenhower Matrix →
      </button>
    </div>

    <!-- Quick Actions -->
    <div class="dash-card actions-card">
      <h3>⚡ Quick Actions</h3>
      <div class="action-grid">
        <button class="action-btn" on:click={() => activeView.set('notes')}>📝 New Note</button>
        <button class="action-btn" on:click={() => activeView.set('cogdump')}>🧠 Brain Dump</button>
        <button class="action-btn" on:click={() => activeView.set('terminal')}>💻 AI Terminal</button>
        <button class="action-btn" on:click={() => activeView.set('calendar')}>📅 Calendar</button>
      </div>
    </div>

    <!-- System Status -->
    <div class="dash-card">
      <h3>🔧 Status</h3>
      <div class="status-list">
        <div class="status-row">
          <span>AI Engine</span>
          <span class:connected={$ollamaConnected} class:disconnected={!$ollamaConnected}>
            {$ollamaConnected ? '● Connected' : '● Offline'}
          </span>
        </div>
        <div class="status-row">
          <span>Vault</span>
          <span>{$vaultUnlocked ? '🔓 Unlocked' : '🔒 Locked'}</span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .dashboard {
    flex: 1;
    padding: 24px;
    overflow-y: auto;
  }

  .dash-header {
    margin-bottom: 24px;
  }
  .dash-header h1 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .dash-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 16px;
  }

  .dash-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    padding: 16px;
    animation: slideUp 0.3s ease;
  }
  .dash-card h3 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 12px;
    color: var(--text-primary);
  }

  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .stat {
    text-align: center;
    padding: 12px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }
  .stat:hover { background: var(--bg-hover); }
  .stat-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: var(--accent-primary);
  }
  .stat-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .mini-list {
    list-style: none;
    margin-bottom: 12px;
  }
  .mini-list li {
    padding: 6px 0;
    border-bottom: 1px solid var(--border-secondary);
    font-size: 13px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .mini-list li:last-child { border-bottom: none; }

  .empty-msg {
    color: var(--text-muted);
    font-size: 13px;
    margin-bottom: 12px;
    text-align: center;
    padding: 12px;
  }

  .dash-btn {
    width: 100%;
    padding: 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    font-weight: 500;
    transition: all var(--transition-fast);
  }
  .dash-btn:hover { background: var(--bg-hover); color: var(--text-primary); }
  .dash-btn.accent { background: var(--accent-primary); color: var(--text-inverse); }
  .dash-btn.accent:hover { opacity: 0.9; }

  .action-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .action-btn {
    padding: 12px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 12px;
    transition: all var(--transition-fast);
  }
  .action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  .pomo-display { text-align: center; padding: 16px; }
  .pomo-big-time {
    display: block;
    font-family: var(--font-mono);
    font-size: 36px;
    font-weight: 700;
    color: var(--accent-primary);
  }
  .pomo-phase-label { font-size: 13px; color: var(--text-secondary); }

  .status-list { display: flex; flex-direction: column; gap: 8px; }
  .status-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    padding: 4px 0;
  }
  .connected { color: var(--success); }
  .disconnected { color: var(--error); }

  .priority-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .priority-dot.p1 { background: var(--error); }
  .priority-dot.p2 { background: var(--warning); }
  .priority-dot.p3 { background: var(--info); }
  .priority-dot.p4 { background: var(--text-muted); }
</style>
