<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Terminal } from '@xterm/xterm';
  import { FitAddon } from '@xterm/addon-fit';
  import { WebLinksAddon } from '@xterm/addon-web-links';
  import '@xterm/xterm/css/xterm.css';
  import { invoke } from '@tauri-apps/api/core';
  import { listen } from '@tauri-apps/api/event';
  import { theme } from '../../stores/theme';
  import { ollamaConnected, selectedModel, chatHistory, addChatMessage, clearChatHistory } from '../../stores/ollama';
  import { chat, chatStream, AIPAD_TOOLS, SYSTEM_PROMPT } from '../../services/ollama';
  import type { ChatMessage, OllamaMessage } from '../../types';
  import { v4 as uuid } from 'uuid';

  let terminalEl: HTMLDivElement;
  let chatInput = '';
  let term: Terminal;
  let fitAddon: FitAddon;
  let shellId = '';
  let mode: 'terminal' | 'ai' = 'terminal';
  let chatContainer: HTMLDivElement;
  let isStreaming = false;
  let unlistenPty: (() => void) | null = null;

  const termThemes: Record<string, any> = {
    dark: { background: '#0d1117', foreground: '#e6edf3', cursor: '#58a6ff', selectionBackground: '#264f78' },
    neon: { background: '#000000', foreground: '#00ffff', cursor: '#ff00ff', selectionBackground: '#003333' },
    retro: { background: '#0a0a00', foreground: '#ffb000', cursor: '#ffb000', selectionBackground: '#332200' },
    arcade: { background: '#1a0533', foreground: '#4ecdc4', cursor: '#ffe66d', selectionBackground: '#3d1a6e' },
    cyberpunk: { background: '#0a0e27', foreground: '#05d9e8', cursor: '#ff2a6d', selectionBackground: '#1c2660' },
    matrix: { background: '#000000', foreground: '#00ff41', cursor: '#00ff41', selectionBackground: '#003300' },
    synthwave: { background: '#1a1025', foreground: '#36f9f6', cursor: '#ff6ac1', selectionBackground: '#3d2a56' },
  };

  onMount(async () => {
    term = new Terminal({
      cursorBlink: true,
      fontFamily: 'JetBrains Mono, Cascadia Code, Consolas, monospace',
      fontSize: 13,
      lineHeight: 1.3,
      theme: termThemes[$theme] || termThemes.dark,
    });

    fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());
    term.open(terminalEl);
    fitAddon.fit();

    // Listen for PTY output
    const unlisten = await listen<{ id: string; data: string }>('pty-output', (event) => {
      if (event.payload.id === shellId) {
        term.write(event.payload.data);
      }
    });
    unlistenPty = unlisten;

    // Spawn shell
    try {
      shellId = await invoke<string>('spawn_shell');
    } catch (e) {
      term.write(`\r\n[Error spawning shell: ${e}]\r\n`);
    }

    // Pipe terminal input to shell
    term.onData((data) => {
      if (shellId) {
        invoke('write_to_shell', { id: shellId, data });
      }
    });

    // Resize handling
    const resizeObserver = new ResizeObserver(() => fitAddon?.fit());
    resizeObserver.observe(terminalEl);

    return () => {
      resizeObserver.disconnect();
    };
  });

  onDestroy(() => {
    if (shellId) invoke('kill_shell', { id: shellId });
    term?.dispose();
    if (unlistenPty) unlistenPty();
  });

  // Sync theme to terminal
  $: if (term && $theme) {
    term.options.theme = termThemes[$theme] || termThemes.dark;
  }

  // AI Chat handling
  async function sendMessage() {
    if (!chatInput.trim() || isStreaming) return;
    const userMsg: ChatMessage = {
      id: uuid(),
      role: 'user',
      content: chatInput.trim(),
      timestamp: new Date().toISOString(),
    };
    addChatMessage(userMsg);
    chatInput = '';
    isStreaming = true;

    // Scroll chat to bottom
    setTimeout(() => chatContainer?.scrollTo(0, chatContainer.scrollHeight), 50);

    try {
      const messages: OllamaMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...$chatHistory.map(m => ({ role: m.role, content: m.content })),
      ];

      // Try tool calling first
      const response = await chat({
        model: $selectedModel,
        messages,
        tools: AIPAD_TOOLS,
      });

      if (response.tool_calls && response.tool_calls.length > 0) {
        // Handle tool calls
        for (const toolCall of response.tool_calls) {
          const { name, arguments: args } = toolCall.function;

          if (name === 'run_command') {
            const cmd = (args as any).command;
            // Show what we're running
            const toolMsg: ChatMessage = {
              id: uuid(),
              role: 'assistant',
              content: `Running: \`${cmd}\``,
              timestamp: new Date().toISOString(),
            };
            addChatMessage(toolMsg);

            // Execute in terminal
            if (shellId) {
              await invoke('write_to_shell', { id: shellId, data: cmd + '\r\n' });
              // Wait a moment for output
              await new Promise(r => setTimeout(r, 1500));
            }
          }
        }
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: uuid(),
        role: 'assistant',
        content: response.content || '(no response)',
        timestamp: new Date().toISOString(),
      };
      addChatMessage(assistantMsg);
    } catch (e: any) {
      addChatMessage({
        id: uuid(),
        role: 'assistant',
        content: `Error: ${e.message || 'Failed to reach Ollama. Is it running?'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      isStreaming = false;
      setTimeout(() => chatContainer?.scrollTo(0, chatContainer.scrollHeight), 50);
    }
  }
</script>

<div class="terminal-view">
  <!-- Mode tabs -->
  <div class="terminal-tabs">
    <button class="tab-btn" class:active={mode === 'terminal'} on:click={() => mode = 'terminal'}>
      💻 Terminal
    </button>
    <button class="tab-btn" class:active={mode === 'ai'} on:click={() => mode = 'ai'}>
      🤖 AI Chat
      {#if !$ollamaConnected}<span class="offline-badge">offline</span>{/if}
    </button>
    {#if mode === 'ai'}
      <button class="clear-btn" on:click={clearChatHistory}>Clear Chat</button>
    {/if}
  </div>

  <div class="terminal-content">
    <!-- Terminal -->
    <div class="term-container" class:hidden={mode === 'ai'}>
      <div class="xterm-wrapper" bind:this={terminalEl}></div>
    </div>

    <!-- AI Chat -->
    {#if mode === 'ai'}
      <div class="ai-chat">
        <div class="chat-messages" bind:this={chatContainer}>
          {#if $chatHistory.length === 0}
            <div class="chat-empty">
              <span class="big-icon">🤖</span>
              <h3>AI Terminal</h3>
              <p class="text-muted">Ask me to run commands, search notes, create todos, or help organize your work.</p>
              {#if !$ollamaConnected}
                <div class="warning-box">
                  ⚠️ Ollama is not connected. Start it with <code>ollama serve</code>
                </div>
              {:else}
                <p class="text-xs text-muted">Using model: {$selectedModel}</p>
              {/if}
            </div>
          {/if}

          {#each $chatHistory as msg (msg.id)}
            <div class="chat-msg {msg.role}">
              <div class="msg-avatar">
                {msg.role === 'user' ? '👤' : '🤖'}
              </div>
              <div class="msg-content">
                {msg.content}
              </div>
            </div>
          {/each}

          {#if isStreaming}
            <div class="chat-msg assistant streaming">
              <div class="msg-avatar">🤖</div>
              <div class="msg-content">
                <span class="typing-indicator">●●●</span>
              </div>
            </div>
          {/if}
        </div>

        <div class="chat-input-area">
          <input
            type="text"
            bind:value={chatInput}
            placeholder={$ollamaConnected ? 'Ask AI anything...' : 'Ollama offline — start with: ollama serve'}
            on:keydown={(e) => e.key === 'Enter' && sendMessage()}
            disabled={!$ollamaConnected || isStreaming}
            class="chat-input"
          />
          <button
            class="send-btn"
            on:click={sendMessage}
            disabled={!$ollamaConnected || isStreaming || !chatInput.trim()}
          >
            Send
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .terminal-view { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  .terminal-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
    padding: 0 8px;
    align-items: center;
  }
  .tab-btn {
    padding: 8px 16px;
    font-size: 13px;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
  }
  .tab-btn:hover { color: var(--text-primary); }
  .tab-btn.active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }
  .offline-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 8px;
    background: var(--error);
    color: white;
    margin-left: 4px;
    vertical-align: middle;
  }
  .clear-btn {
    margin-left: auto;
    font-size: 11px;
    padding: 4px 8px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-muted);
  }
  .clear-btn:hover { color: var(--text-primary); }

  .terminal-content { flex: 1; overflow: hidden; display: flex; }

  .term-container { flex: 1; padding: 4px; overflow: hidden; }
  .term-container.hidden { display: none; }
  .xterm-wrapper { height: 100%; width: 100%; }

  .ai-chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chat-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    text-align: center;
  }
  .big-icon { font-size: 48px; }
  .warning-box {
    padding: 8px 16px;
    background: var(--warning);
    color: var(--text-inverse);
    border-radius: var(--radius-sm);
    font-size: 12px;
    margin-top: 8px;
  }
  .warning-box code {
    background: rgba(0,0,0,0.2);
    padding: 1px 4px;
    border-radius: 3px;
  }

  .chat-msg {
    display: flex;
    gap: 10px;
    animation: fadeIn 0.2s ease;
  }
  .msg-avatar {
    width: 28px;
    height: 28px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .msg-content {
    flex: 1;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .chat-msg.user .msg-content {
    background: var(--accent-primary);
    color: var(--text-inverse);
  }
  .chat-msg.assistant .msg-content {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
  }
  .chat-msg.assistant .msg-content :global(code) {
    background: var(--bg-tertiary);
    padding: 1px 4px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 12px;
  }

  .typing-indicator {
    display: inline-block;
    animation: pulse 1s infinite;
    color: var(--text-muted);
  }

  .chat-input-area {
    display: flex;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }
  .chat-input {
    flex: 1;
    padding: 10px 12px;
    font-size: 13px;
  }
  .send-btn {
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    background: var(--accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    font-size: 13px;
    transition: opacity var(--transition-fast);
  }
  .send-btn:hover { opacity: 0.85; }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
