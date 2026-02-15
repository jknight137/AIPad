<script lang="ts">
  import { theme, setTheme, THEMES } from '../../stores/theme';
  import { ollamaConnected, ollamaModels, selectedModel, checkOllamaConnection, setModel } from '../../stores/ollama';
  import { pomodoroStore, updatePomodoroSettings } from '../../stores/pomodoro';
  import type { ThemeName } from '../../types';

  let pomodoroWork = 25;
  let pomodoroShort = 5;
  let pomodoroLong = 15;
  let ollamaUrl = 'http://localhost:11434';
  let showAbout = false;

  // Load current pomodoro settings
  $: {
    pomodoroWork = $pomodoroStore.workDuration / 60;
    pomodoroShort = $pomodoroStore.shortBreakDuration / 60;
    pomodoroLong = $pomodoroStore.longBreakDuration / 60;
  }

  function applyTheme(name: ThemeName) {
    setTheme(name);
  }

  async function reconnectOllama() {
    await checkOllamaConnection();
  }

  function savePomodoroSettings() {
    updatePomodoroSettings({
      workDuration: pomodoroWork * 60,
      shortBreakDuration: pomodoroShort * 60,
      longBreakDuration: pomodoroLong * 60,
    });
  }

  const themePreviewColors: Record<string, string[]> = {
    dark: ['#0d1117', '#161b22', '#58a6ff', '#3fb950'],
    neon: ['#000000', '#0a0a0a', '#00ffff', '#ff00ff'],
    retro: ['#000000', '#1a1100', '#ffb000', '#ff8c00'],
    arcade: ['#1a0533', '#0d0221', '#ffcc00', '#ff6ec7'],
    cyberpunk: ['#0a0e27', '#141833', '#ff2a6d', '#05d9e8'],
    matrix: ['#000000', '#001100', '#00ff41', '#008f11'],
    synthwave: ['#1a1025', '#241734', '#ff6ac1', '#7b68ee'],
  };
</script>

<div class="settings-view">
  <h2>⚙️ Settings</h2>

  <!-- Theme picker -->
  <section class="settings-section">
    <h3>🎨 Theme</h3>
    <div class="theme-grid">
      {#each THEMES as t}
        <button
          class="theme-card"
          class:active={$theme === t.id}
          on:click={() => applyTheme(t.id)}
        >
          <div class="theme-preview">
            {#each themePreviewColors[t.id] || ['#333','#444','#58a6ff','#3fb950'] as color, i}
              <div class="preview-swatch" style="background: {color}"
                class:swatch-bg={i < 2}
                class:swatch-accent={i >= 2}
              ></div>
            {/each}
          </div>
          <span class="theme-icon">{t.icon}</span>
          <span class="theme-name">{t.label}</span>
          {#if $theme === t.id}<span class="active-check">✓</span>{/if}
        </button>
      {/each}
    </div>
  </section>

  <!-- Ollama settings -->
  <section class="settings-section">
    <h3>🤖 Ollama (Local LLM)</h3>
    <div class="setting-row">
      <label>
        <span>Endpoint URL</span>
        <input type="text" bind:value={ollamaUrl} placeholder="http://localhost:11434" />
      </label>
    </div>
    <div class="setting-row">
      <div class="setting-status">
        <span>Status</span>
        <span class="status-badge" class:connected={$ollamaConnected}>
          {$ollamaConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>
      <button class="btn-sm" on:click={reconnectOllama}>Reconnect</button>
    </div>
    {#if $ollamaConnected && $ollamaModels.length > 0}
      <div class="setting-row">
        <label>
          <span>Model</span>
          <select value={$selectedModel} on:change={(e) => setModel(e.currentTarget.value)}>
            {#each $ollamaModels as model}
              <option value={model.name}>{model.name} ({Math.round(model.size / 1e9 * 10) / 10}GB)</option>
            {/each}
          </select>
        </label>
      </div>
    {/if}
    <p class="setting-hint text-xs text-muted">
      AIPad connects to a locally running Ollama instance. All data stays on your machine.
      <a href="https://ollama.ai" target="_blank" rel="noopener" class="link">Install Ollama →</a>
    </p>
  </section>

  <!-- Pomodoro settings -->
  <section class="settings-section">
    <h3>🍅 Pomodoro Timer</h3>
    <div class="pomo-settings">
      <label>
        <span>Work (min)</span>
        <input type="number" bind:value={pomodoroWork} min="1" max="90" on:change={savePomodoroSettings} />
      </label>
      <label>
        <span>Short Break (min)</span>
        <input type="number" bind:value={pomodoroShort} min="1" max="30" on:change={savePomodoroSettings} />
      </label>
      <label>
        <span>Long Break (min)</span>
        <input type="number" bind:value={pomodoroLong} min="1" max="60" on:change={savePomodoroSettings} />
      </label>
    </div>
  </section>

  <!-- About -->
  <section class="settings-section about-section">
    <h3>ℹ️ About AIPad</h3>
    <div class="about-content">
      <div class="about-logo">🧠</div>
      <div>
        <strong>AIPad</strong> <span class="text-muted">v1.0.0</span>
        <p class="text-xs text-muted" style="margin-top: 4px;">
          A lightweight, privacy-first desktop productivity app with local AI.
          Built with Tauri + Svelte.
        </p>
      </div>
    </div>
    <div class="about-features text-xs text-muted">
      <span>📝 Notes</span>
      <span>🔐 Vault</span>
      <span>💻 Terminal + AI</span>
      <span>📋 GTD Todos</span>
      <span>📊 Eisenhower Matrix</span>
      <span>📅 Calendar</span>
      <span>🍅 Pomodoro</span>
      <span>🧠 Cognitive Dump</span>
    </div>
  </section>
</div>

<style>
  .settings-view { flex: 1; padding: 20px; overflow-y: auto; max-width: 760px; }
  .settings-view h2 { font-size: 20px; font-weight: 700; margin-bottom: 20px; }

  .settings-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    padding: 20px;
    margin-bottom: 16px;
  }
  .settings-section h3 { font-size: 15px; font-weight: 600; margin-bottom: 14px; }

  /* Theme grid */
  .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px; }
  .theme-card {
    display: flex; flex-direction: column; align-items: center; gap: 6px;
    padding: 12px 8px; border: 2px solid var(--border-color); border-radius: var(--radius-md);
    background: var(--panel-bg); cursor: pointer; transition: all var(--transition-fast); position: relative;
  }
  .theme-card:hover { border-color: var(--text-muted); }
  .theme-card.active { border-color: var(--accent); box-shadow: 0 0 0 1px var(--accent); }

  .theme-preview { display: flex; gap: 3px; margin-bottom: 4px; }
  .preview-swatch { width: 16px; height: 16px; border-radius: 3px; }
  .swatch-accent { border-radius: 50%; width: 12px; height: 12px; }

  .theme-icon { font-size: 20px; }
  .theme-name { font-size: 11px; font-weight: 600; }
  .active-check { position: absolute; top: 4px; right: 6px; font-size: 12px; color: var(--accent); }

  /* Setting rows */
  .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
  .setting-row label { display: flex; flex-direction: column; gap: 4px; flex: 1; font-size: 13px; }
  .setting-row label span:first-child { font-size: 12px; color: var(--text-secondary); font-weight: 500; }
  .setting-row input, .setting-row select {
    padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm);
    background: var(--input-bg); color: var(--text-primary); font-size: 13px;
  }
  .setting-hint { margin-top: 8px; line-height: 1.5; }
  .link { color: var(--accent); text-decoration: none; }
  .link:hover { text-decoration: underline; }

  .status-badge { font-size: 13px; font-weight: 500; }

  .btn-sm { padding: 6px 14px; background: var(--accent); color: var(--bg-primary); border: none; border-radius: var(--radius-sm); cursor: pointer; font-size: 12px; font-weight: 600; flex-shrink: 0; }

  /* Pomo settings */
  .pomo-settings { display: flex; gap: 16px; }
  .pomo-settings label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--text-secondary); }
  .pomo-settings input { width: 80px; padding: 8px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); background: var(--input-bg); color: var(--text-primary); font-size: 14px; text-align: center; }

  /* About */
  .about-content { display: flex; gap: 14px; align-items: center; margin-bottom: 12px; }
  .about-logo { font-size: 36px; }
  .about-features { display: flex; flex-wrap: wrap; gap: 10px; padding-top: 10px; border-top: 1px solid var(--border-color); }
</style>
