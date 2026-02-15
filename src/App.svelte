<script lang="ts">
  import { onMount } from 'svelte';
  import { activeView } from './lib/stores/navigation';
  import { initTheme } from './lib/stores/theme';
  import { checkOllamaConnection } from './lib/stores/ollama';
  import { getDb } from './lib/services/db';

  import Sidebar from './lib/components/layout/Sidebar.svelte';
  import StatusBar from './lib/components/layout/StatusBar.svelte';
  import DashboardView from './lib/components/dashboard/DashboardView.svelte';
  import NotesView from './lib/components/editor/NotesView.svelte';
  import VaultView from './lib/components/vault/VaultView.svelte';
  import TerminalView from './lib/components/terminal/TerminalView.svelte';
  import TodosView from './lib/components/productivity/TodosView.svelte';
  import EisenhowerView from './lib/components/productivity/EisenhowerView.svelte';
  import CalendarView from './lib/components/calendar/CalendarView.svelte';
  import AnalyticsView from './lib/components/dashboard/AnalyticsView.svelte';
  import CogDumpView from './lib/components/dump/CogDumpView.svelte';
  import SettingsView from './lib/components/settings/SettingsView.svelte';

  let ready = false;

  onMount(async () => {
    // Initialize theme first (sync)
    try {
      initTheme();
    } catch (e) {
      console.warn('Theme init failed:', e);
    }

    // Initialize database and connections
    try {
      await getDb();
    } catch (e) {
      console.warn('Database init deferred:', e);
    }

    // Check Ollama in background (don't block startup)
    checkOllamaConnection().catch((e) => {
      console.warn('Ollama check failed:', e);
    });

    ready = true;
  });

  // Global keyboard shortcuts
  function handleKeydown(e: KeyboardEvent) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case '1': e.preventDefault(); activeView.set('dashboard'); break;
        case '2': e.preventDefault(); activeView.set('notes'); break;
        case '3': e.preventDefault(); activeView.set('vault'); break;
        case '4': e.preventDefault(); activeView.set('terminal'); break;
        case '5': e.preventDefault(); activeView.set('todos'); break;
        case '6': e.preventDefault(); activeView.set('eisenhower'); break;
        case '7': e.preventDefault(); activeView.set('calendar'); break;
        case '8': e.preventDefault(); activeView.set('analytics'); break;
        case '9': e.preventDefault(); activeView.set('cogdump'); break;
        case ',': e.preventDefault(); activeView.set('settings'); break;
      }
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if ready}
  <div class="app-shell">
    <Sidebar />
    <div class="app-main">
      <div class="app-content">
        {#if $activeView === 'dashboard'}
          <DashboardView />
        {:else if $activeView === 'notes'}
          <NotesView />
        {:else if $activeView === 'vault'}
          <VaultView />
        {:else if $activeView === 'terminal'}
          <TerminalView />
        {:else if $activeView === 'todos'}
          <TodosView />
        {:else if $activeView === 'eisenhower'}
          <EisenhowerView />
        {:else if $activeView === 'calendar'}
          <CalendarView />
        {:else if $activeView === 'analytics'}
          <AnalyticsView />
        {:else if $activeView === 'cogdump'}
          <CogDumpView />
        {:else if $activeView === 'settings'}
          <SettingsView />
        {/if}
      </div>
      <StatusBar />
    </div>
  </div>
{:else}
  <div class="loading-screen">
    <div class="loading-icon">🧠</div>
    <div class="loading-text">AIPad</div>
    <div class="loading-bar"><div class="loading-fill"></div></div>
  </div>
{/if}

<style>
  :global(*) {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  :global(body) {
    font-family: var(--font-body, 'Inter', sans-serif);
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  .app-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .app-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    overflow: hidden;
  }

  .app-content {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .loading-screen {
    height: 100vh;
    width: 100vw;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: var(--bg-primary);
  }
  .loading-icon { font-size: 48px; animation: pulse 1.5s ease-in-out infinite; }
  .loading-text { font-size: 24px; font-weight: 700; letter-spacing: 2px; color: var(--text-primary); }
  .loading-bar { width: 120px; height: 3px; background: var(--border-color); border-radius: 2px; overflow: hidden; }
  .loading-fill { height: 100%; width: 40%; background: var(--accent); border-radius: 2px; animation: loadSlide 1s ease-in-out infinite; }

  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
  @keyframes loadSlide {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
</style>
