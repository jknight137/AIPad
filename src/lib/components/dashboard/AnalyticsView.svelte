<script lang="ts">
  import { onMount } from 'svelte';
  import { todos, completedTodos, activeTodos } from '../../stores/todos';
  import { pomodoro } from '../../stores/pomodoro';
  import { timeBlocks } from '../../stores/calendar';
  import { notes } from '../../stores/notes';
  import { query } from '../../services/db';
  import type { PomodoroSession, TimeLog } from '../../types';

  let pomodoroSessions: PomodoroSession[] = [];
  let timeLogs: TimeLog[] = [];
  let todoCompletionRate = 0;
  let avgSessionMinutes = 0;
  let totalFocusHours = 0;
  let priorityBreakdown = { p1: 0, p2: 0, p3: 0, p4: 0 };
  let weeklyCompletions: number[] = [0, 0, 0, 0, 0, 0, 0];
  let categoryDistribution: { label: string; value: number; color: string }[] = [];

  onMount(async () => {
    try {
      pomodoroSessions = await query<PomodoroSession>('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC LIMIT 50');
      timeLogs = await query<TimeLog>('SELECT * FROM time_logs ORDER BY started_at DESC LIMIT 100');
    } catch { /* tables may not exist yet */ }
    computeStats();
  });

  function computeStats() {
    const allTodos = $todos;
    const completed = allTodos.filter(t => t.status === 'done').length;
    const total = allTodos.length || 1;
    todoCompletionRate = Math.round((completed / total) * 100);

    // Priority breakdown
    priorityBreakdown = { p1: 0, p2: 0, p3: 0, p4: 0 };
    allTodos.forEach(t => {
      if (t.priority in priorityBreakdown) priorityBreakdown[t.priority as keyof typeof priorityBreakdown]++;
    });

    // Pomodoro stats — compute duration from started_at/ended_at
    const completedSessions = pomodoroSessions.filter(s => s.completed && s.ended_at);
    const totalMin = completedSessions.reduce((acc, s) => {
      const dur = (new Date(s.ended_at!).getTime() - new Date(s.started_at).getTime()) / 60000;
      return acc + dur;
    }, 0);
    avgSessionMinutes = completedSessions.length ? Math.round(totalMin / completedSessions.length) : 0;
    totalFocusHours = Math.round((totalMin / 60) * 10) / 10;

    // Category distribution for time blocks
    const catMap = new Map<string, number>();
    $timeBlocks.forEach(b => {
      const dur = (new Date(b.end_dt).getTime() - new Date(b.start_dt).getTime()) / 3600000;
      catMap.set(b.category, (catMap.get(b.category) || 0) + dur);
    });
    const colors = ['#58a6ff', '#3fb950', '#d29922', '#f85149', '#bc8cff', '#79c0ff'];
    let ci = 0;
    categoryDistribution = Array.from(catMap.entries()).map(([label, value]) => ({
      label, value: Math.round(value * 10) / 10, color: colors[ci++ % colors.length]
    }));
  }

  // Pareto 80/20 analysis
  $: paretoItems = (() => {
    const sorted = [...$todos].sort((a, b) => {
      const pw: Record<string, number> = { p1: 4, p2: 3, p3: 2, p4: 1 };
      return (pw[b.priority] || 0) - (pw[a.priority] || 0);
    });
    const topCount = Math.ceil(sorted.length * 0.2);
    return { top20: sorted.slice(0, topCount), rest: sorted.slice(topCount) };
  })();
</script>

<div class="analytics-view">
  <h2>📈 Analytics & Insights</h2>
  <p class="text-muted subtitle">Pareto 80/20 analysis and productivity metrics</p>

  <!-- Stats row -->
  <div class="stats-grid">
    <div class="stat-card">
      <span class="stat-value">{todoCompletionRate}%</span>
      <span class="stat-label">Completion Rate</span>
      <div class="progress-bar">
        <div class="progress-fill" style="width: {todoCompletionRate}%"></div>
      </div>
    </div>
    <div class="stat-card">
      <span class="stat-value">{totalFocusHours}h</span>
      <span class="stat-label">Focus Time</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{pomodoroSessions.filter(s => s.completed).length}</span>
      <span class="stat-label">Pomodoros</span>
    </div>
    <div class="stat-card">
      <span class="stat-value">{avgSessionMinutes}m</span>
      <span class="stat-label">Avg Session</span>
    </div>
  </div>

  <div class="analytics-body">
    <!-- Pareto section -->
    <div class="panel">
      <h3>🎯 Pareto Analysis (80/20)</h3>
      <p class="text-xs text-muted">Top 20% of tasks that drive 80% of results</p>
      <div class="pareto-visual">
        <div class="pareto-bar">
          <div class="pareto-top" style="width: 20%">
            <span>20%</span>
          </div>
          <div class="pareto-rest" style="width: 80%">
            <span>80%</span>
          </div>
        </div>
        <div class="pareto-labels">
          <span class="text-xs">High-Impact Tasks ({paretoItems.top20.length})</span>
          <span class="text-xs text-muted">Other Tasks ({paretoItems.rest.length})</span>
        </div>
      </div>
      {#if paretoItems.top20.length > 0}
        <div class="top-tasks">
          {#each paretoItems.top20.slice(0, 5) as todo}
            <div class="task-row">
              <span class="priority-dot" class:p1={todo.priority === 'p1'} class:p2={todo.priority === 'p2'}></span>
              <span class="task-text">{todo.content}</span>
              <span class="task-status text-xs" class:done={todo.status === 'done'}>{todo.status}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <!-- Priority breakdown -->
    <div class="panel">
      <h3>🏷️ Priority Breakdown</h3>
      <div class="priority-bars">
        {#each Object.entries(priorityBreakdown) as [key, count]}
          <div class="pbar-row">
            <span class="pbar-label text-xs">{key.toUpperCase()}</span>
            <div class="pbar-track">
              <div class="pbar-fill pbar-{key}" style="width: {Math.max(count / Math.max($todos.length, 1) * 100, 2)}%"></div>
            </div>
            <span class="pbar-count text-xs">{count}</span>
          </div>
        {/each}
      </div>
    </div>

    <!-- Category time distribution -->
    <div class="panel">
      <h3>⏰ Time Distribution</h3>
      {#if categoryDistribution.length > 0}
        <div class="cat-list">
          {#each categoryDistribution as cat}
            <div class="cat-row">
              <div class="cat-dot" style="background: {cat.color}"></div>
              <span class="cat-label">{cat.label.replace('_', ' ')}</span>
              <span class="cat-value text-xs">{cat.value}h</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-muted text-xs">No time blocks recorded yet.</p>
      {/if}
    </div>

    <!-- Recent pomodoro sessions -->
    <div class="panel">
      <h3>🍅 Recent Sessions</h3>
      {#if pomodoroSessions.length > 0}
        <div class="session-list">
          {#each pomodoroSessions.slice(0, 8) as sess}
            <div class="session-row">
              <span class="sess-type" class:work={sess.completed}>
                {sess.completed ? '🎯' : '⏸️'}
              </span>
              <span class="sess-dur text-xs">{sess.ended_at ? Math.round((new Date(sess.ended_at).getTime() - new Date(sess.started_at).getTime()) / 60000) : '?'}m</span>
              <span class="sess-date text-xs text-muted">{new Date(sess.started_at).toLocaleDateString()}</span>
            </div>
          {/each}
        </div>
      {:else}
        <p class="text-muted text-xs">No sessions yet. Start a Pomodoro!</p>
      {/if}
    </div>
  </div>
</div>

<style>
  .analytics-view { flex: 1; padding: 20px; overflow-y: auto; }
  .subtitle { margin-bottom: 16px; }

  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .stat-card { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-md); padding: 16px; text-align: center; }
  .stat-value { font-size: 28px; font-weight: 700; color: var(--accent); display: block; }
  .stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
  .progress-bar { height: 4px; background: var(--border-color); border-radius: 2px; margin-top: 8px; overflow: hidden; }
  .progress-fill { height: 100%; background: var(--accent); border-radius: 2px; transition: width 0.3s; }

  .analytics-body { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .panel { background: var(--card-bg); border: 1px solid var(--card-border); border-radius: var(--radius-md); padding: 16px; }
  .panel h3 { font-size: 14px; font-weight: 600; margin-bottom: 8px; }

  /* Pareto */
  .pareto-visual { margin: 12px 0; }
  .pareto-bar { display: flex; height: 28px; border-radius: var(--radius-sm); overflow: hidden; }
  .pareto-top { background: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--bg-primary); }
  .pareto-rest { background: var(--border-color); display: flex; align-items: center; justify-content: center; font-size: 11px; color: var(--text-muted); }
  .pareto-labels { display: flex; justify-content: space-between; margin-top: 4px; }

  .top-tasks { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
  .task-row { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--panel-bg); border-radius: var(--radius-sm); }
  .priority-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-muted); flex-shrink: 0; }
  .priority-dot.p1 { background: var(--error); }
  .priority-dot.p2 { background: var(--warning); }
  .task-text { flex: 1; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .task-status { padding: 1px 6px; border-radius: 4px; background: var(--border-color); }
  .task-status.done { background: var(--success); color: var(--bg-primary); }

  /* Priority bars */
  .priority-bars { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .pbar-row { display: flex; align-items: center; gap: 8px; }
  .pbar-label { width: 24px; font-weight: 600; }
  .pbar-track { flex: 1; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden; }
  .pbar-fill { height: 100%; border-radius: 4px; transition: width 0.3s; }
  .pbar-p1 { background: var(--error); }
  .pbar-p2 { background: var(--warning); }
  .pbar-p3 { background: var(--info); }
  .pbar-p4 { background: var(--text-muted); }
  .pbar-count { width: 20px; text-align: right; }

  /* Category */
  .cat-list { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
  .cat-row { display: flex; align-items: center; gap: 8px; }
  .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
  .cat-label { flex: 1; font-size: 13px; text-transform: capitalize; }
  .cat-value { color: var(--text-secondary); }

  /* Sessions */
  .session-list { display: flex; flex-direction: column; gap: 4px; margin-top: 8px; }
  .session-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .sess-dur { font-weight: 600; }
</style>
