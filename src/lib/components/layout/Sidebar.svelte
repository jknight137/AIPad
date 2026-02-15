<script lang="ts">
  import { activeView, sidebarExpanded } from '../../stores/navigation';
  import { vaultUnlocked } from '../../stores/vault';
  import { ollamaConnected } from '../../stores/ollama';
  import { pomodoro } from '../../stores/pomodoro';
  import type { ViewName } from '../../types';

  interface NavItem {
    id: ViewName;
    icon: string;
    label: string;
    shortcut: string;
  }

  const navItems: NavItem[] = [
    { id: 'dashboard', icon: '⚡', label: 'Dashboard', shortcut: 'Ctrl+H' },
    { id: 'notes', icon: '📝', label: 'Notes', shortcut: 'Ctrl+N' },
    { id: 'vault', icon: '🔒', label: 'Vault', shortcut: 'Ctrl+L' },
    { id: 'terminal', icon: '💻', label: 'Terminal', shortcut: 'Ctrl+J' },
    { id: 'todos', icon: '✅', label: 'Todos', shortcut: 'Ctrl+T' },
    { id: 'eisenhower', icon: '📊', label: 'Matrix', shortcut: '' },
    { id: 'calendar', icon: '📅', label: 'Calendar', shortcut: '' },
    { id: 'analytics', icon: '📈', label: 'Analytics', shortcut: '' },
    { id: 'cogdump', icon: '🧠', label: 'Brain Dump', shortcut: 'Ctrl+D' },
    { id: 'settings', icon: '⚙️', label: 'Settings', shortcut: 'Ctrl+,' },
  ];

  function navigate(view: ViewName) {
    activeView.set(view);
  }

  let expanded = false;
  sidebarExpanded.subscribe(v => expanded = v);
</script>

<aside class="sidebar" class:expanded>
  <button class="sidebar-logo" on:click={() => sidebarExpanded.update(v => !v)} aria-label="Toggle sidebar">
    <span class="logo-icon">⚡</span>
    {#if expanded}<span class="logo-text">AIPad</span>{/if}
  </button>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <button
        class="sidebar-item"
        class:active={$activeView === item.id}
        on:click={() => navigate(item.id)}
        title={expanded ? '' : `${item.label} ${item.shortcut ? `(${item.shortcut})` : ''}`}
      >
        <span class="sidebar-icon">{item.icon}</span>
        {#if expanded}<span class="sidebar-label">{item.label}</span>{/if}
        {#if item.id === 'vault' && $vaultUnlocked}
          <span class="status-dot green" title="Unlocked"></span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <div class="status-indicators">
      <span class="status-dot" class:green={$ollamaConnected} class:red={!$ollamaConnected}
            title={$ollamaConnected ? 'Ollama connected' : 'Ollama offline'}></span>
      {#if expanded}
        <span class="text-xs text-muted">{$ollamaConnected ? 'AI Online' : 'AI Offline'}</span>
      {/if}
    </div>
    {#if $pomodoro.isRunning}
      <div class="pomo-badge" class:work={$pomodoro.phase === 'work'}>
        🍅 {#if expanded}{$pomodoro.phase === 'work' ? 'Focus' : 'Break'}{/if}
      </div>
    {/if}
  </div>
</aside>

<style>
  .sidebar {
    width: var(--sidebar-width);
    height: 100%;
    background: var(--sidebar-bg);
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    transition: width var(--transition-normal);
    overflow: hidden;
    flex-shrink: 0;
    z-index: 10;
  }
  .sidebar.expanded { width: var(--sidebar-expanded); }

  .sidebar-logo {
    height: var(--topbar-height);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 14px;
    cursor: pointer;
    border-bottom: 1px solid var(--border-primary);
    flex-shrink: 0;
  }
  .logo-icon { font-size: 18px; }
  .logo-text {
    font-weight: 700;
    font-size: 16px;
    color: var(--accent-primary);
    white-space: nowrap;
  }

  .sidebar-nav {
    flex: 1;
    padding: 8px 6px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow-y: auto;
  }

  .sidebar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: var(--radius-sm);
    color: var(--sidebar-text);
    transition: all var(--transition-fast);
    position: relative;
    white-space: nowrap;
  }
  .sidebar-item:hover {
    background: var(--sidebar-hover);
    color: var(--text-primary);
  }
  .sidebar-item.active {
    background: var(--bg-active);
    color: var(--sidebar-active);
  }
  .sidebar-icon { font-size: 16px; width: 24px; text-align: center; flex-shrink: 0; }
  .sidebar-label { font-size: 13px; font-weight: 500; }

  .sidebar-footer {
    padding: 8px;
    border-top: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .status-indicators {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--text-muted);
    flex-shrink: 0;
  }
  .status-dot.green { background: var(--success); }
  .status-dot.red { background: var(--error); animation: pulse 2s infinite; }

  .pomo-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    background: var(--pomodoro-break);
    color: var(--text-inverse);
  }
  .pomo-badge.work { background: var(--pomodoro-work); }
</style>
