<script lang="ts">
  import { activeView } from '../../stores/navigation';
  import { ollamaConnected, selectedModel } from '../../stores/ollama';
  import { vaultUnlocked } from '../../stores/vault';
  import { pomodoroDisplay, pomodoro, pomodoroProgress } from '../../stores/pomodoro';
  import { theme } from '../../stores/theme';
  import { activeNote } from '../../stores/notes';

  const viewLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    notes: 'Notes',
    vault: 'Vault',
    terminal: 'AI Terminal',
    todos: 'Todos & GTD',
    eisenhower: 'Eisenhower Matrix',
    calendar: 'Calendar',
    analytics: 'Analytics',
    cogdump: 'Cognitive Dump',
    settings: 'Settings',
  };
</script>

<footer class="statusbar">
  <div class="statusbar-left">
    <span class="view-indicator">
      {viewLabels[$activeView] || $activeView}
      {#if $activeView === 'notes' && $activeNote}
         › {$activeNote.title}
      {/if}
    </span>
  </div>

  <div class="statusbar-center">
    {#if $pomodoro.isRunning || $pomodoro.phase !== 'idle'}
      <div class="pomo-mini">
        <div class="pomo-progress" style="width: {$pomodoroProgress}%"></div>
        <span class="pomo-time">{$pomodoroDisplay}</span>
        <span class="pomo-phase">{$pomodoro.phase === 'work' ? '🔴 Focus' : '🟢 Break'}</span>
      </div>
    {/if}
  </div>

  <div class="statusbar-right">
    {#if $ollamaConnected}
      <span class="status-chip connected" title="Ollama connected">
        🤖 {$selectedModel || 'No model'}
      </span>
    {:else}
      <span class="status-chip disconnected" title="Ollama not connected">
        🤖 Offline
      </span>
    {/if}

    <span class="status-chip" class:locked={!$vaultUnlocked}>
      {$vaultUnlocked ? '🔓' : '🔒'}
    </span>

    <span class="status-chip theme-chip">
      🎨 {$theme}
    </span>
  </div>
</footer>

<style>
  .statusbar {
    height: var(--statusbar-height);
    background: var(--statusbar-bg);
    border-top: 1px solid var(--border-primary);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 12px;
    font-size: 11px;
    color: var(--statusbar-text);
    flex-shrink: 0;
    z-index: 10;
  }

  .statusbar-left, .statusbar-right, .statusbar-center {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .statusbar-left { flex: 1; }
  .statusbar-right { flex: 1; justify-content: flex-end; }
  .statusbar-center { flex: 0 0 auto; }

  .view-indicator {
    font-weight: 500;
    color: var(--text-secondary);
  }

  .status-chip {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--bg-tertiary);
    white-space: nowrap;
  }
  .status-chip.connected { color: var(--success); }
  .status-chip.disconnected { color: var(--error); }
  .status-chip.locked { opacity: 0.6; }

  .pomo-mini {
    position: relative;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 1px 8px;
    border-radius: 3px;
    background: var(--bg-tertiary);
    overflow: hidden;
  }
  .pomo-progress {
    position: absolute;
    left: 0; top: 0; bottom: 0;
    background: var(--pomodoro-work);
    opacity: 0.15;
    transition: width 1s linear;
  }
  .pomo-time {
    font-family: var(--font-mono);
    font-weight: 600;
    z-index: 1;
  }
  .pomo-phase { z-index: 1; }
</style>
