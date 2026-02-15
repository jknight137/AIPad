<script lang="ts">
  import { ollamaStore, checkOllamaConnection, chatWithOllama, ollamaConnected } from '../../stores/ollama';
  import { createTodo } from '../../stores/todos';
  import { addNote } from '../../stores/notes';
  import { addEvent } from '../../stores/calendar';
  import type { DumpResult } from '../../types';

  let dumpText = '';
  let isProcessing = false;
  let results: DumpResult | null = null;
  let error = '';
  let accepted: Set<string> = new Set();

  const DUMP_PROMPT = `You are a productivity assistant. The user has done a "cognitive dump" — they've written out everything on their mind in unstructured text. Your job is to extract and organize this into actionable items.

Analyze the text and return a JSON object with these arrays:
{
  "todos": [{ "content": "task description", "priority": "p1|p2|p3|p4", "eisenhower": "do|schedule|delegate|eliminate" }],
  "events": [{ "title": "event name", "date": "YYYY-MM-DD", "time": "HH:MM" }],
  "notes": [{ "title": "note title", "content": "note content" }],
  "insights": ["insight 1", "insight 2"]
}

Rules:
- Extract ALL actionable items as todos with appropriate priority
- Identify any dates/times mentioned as events
- Group related ideas into notes
- Provide 2-3 key insights about what the person is focused on
- Be thorough but concise
- Return ONLY valid JSON, no markdown or extra text`;

  async function processDump() {
    if (!dumpText.trim()) return;
    if (!$ollamaConnected) {
      error = 'Ollama is not connected. Please start Ollama and check Settings.';
      return;
    }
    error = '';
    isProcessing = true;
    results = null;
    accepted = new Set();

    try {
      const response = await chatWithOllama([
        { role: 'system', content: DUMP_PROMPT },
        { role: 'user', content: dumpText }
      ]);

      // Parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Could not parse structured output from LLM');
      results = JSON.parse(jsonMatch[0]) as DumpResult;
    } catch (e: any) {
      error = e.message || 'Failed to process dump';
    } finally {
      isProcessing = false;
    }
  }

  async function acceptTodo(todo: { content: string; priority: string; eisenhower: string }, idx: number) {
    const key = `todo-${idx}`;
    if (accepted.has(key)) return;
    await createTodo(todo.content, {
      priority: todo.priority as any,
      eisenhower: todo.eisenhower as any,
      status: todo.eisenhower === 'do' ? 'next' : 'inbox',
    });
    accepted = new Set([...accepted, key]);
  }

  async function acceptNote(note: { title: string; content: string }, idx: number) {
    const key = `note-${idx}`;
    if (accepted.has(key)) return;
    await addNote(note.title, note.content);
    accepted = new Set([...accepted, key]);
  }

  async function acceptEvent(event: { title: string; date: string; time?: string }, idx: number) {
    const key = `event-${idx}`;
    if (accepted.has(key)) return;
    const startTime = event.time ? `${event.date}T${event.time}` : `${event.date}T09:00`;
    await addEvent({ title: event.title, start_dt: startTime, end_dt: null, all_day: !event.time, color: '#58a6ff', description: '', recurrence: null, external_id: null });
    accepted = new Set([...accepted, key]);
  }

  async function acceptAll() {
    if (!results) return;
    for (let i = 0; i < (results.todos?.length || 0); i++) await acceptTodo(results.todos[i], i);
    for (let i = 0; i < (results.notes?.length || 0); i++) await acceptNote(results.notes[i], i);
    for (let i = 0; i < (results.events?.length || 0); i++) await acceptEvent(results.events[i], i);
  }

  function clearDump() {
    dumpText = '';
    results = null;
    error = '';
    accepted = new Set();
  }

  const placeholderText = `Just start typing everything on your mind...

Examples:
- I need to finish the quarterly report by Friday
- Call dentist to reschedule appointment
- Maybe I should learn Rust this month
- Team standup moved to 10am on Tuesdays
- Feeling overwhelmed with the project deadline
- Buy groceries: milk, eggs, bread
- Research vacation spots for August
- The API redesign is blocking three other tasks...`;
</script>

<div class="dump-view">
  {#if !results}
    <!-- Input mode -->
    <div class="dump-header">
      <h2>🧠 Cognitive Dump</h2>
      <p class="text-muted">Brain dump everything on your mind. AI will organize it into actions, events, and notes.</p>
    </div>

    <div class="dump-input-area">
      <textarea
        class="dump-textarea"
        bind:value={dumpText}
        placeholder={placeholderText}
        spellcheck="false"
      ></textarea>

      <div class="dump-footer">
        <span class="char-count text-xs text-muted">{dumpText.length} characters</span>
        <div class="dump-actions">
          {#if dumpText.trim()}
            <button class="btn-ghost" on:click={clearDump}>Clear</button>
          {/if}
          <button
            class="btn-process"
            on:click={processDump}
            disabled={!dumpText.trim() || isProcessing || !$ollamaConnected}
          >
            {#if isProcessing}
              <span class="spinner"></span> Processing...
            {:else}
              🪄 Process with AI
            {/if}
          </button>
        </div>
      </div>

      {#if !$ollamaConnected}
        <div class="warning-banner">
          ⚠️ Ollama is not connected. Start Ollama to use Cognitive Dump.
        </div>
      {/if}
    </div>

  {:else}
    <!-- Results mode -->
    <div class="results-header">
      <div>
        <h2>🧠 Dump Results</h2>
        <p class="text-muted text-xs">Review and accept items to add to your workspace</p>
      </div>
      <div class="results-actions">
        <button class="btn-ghost" on:click={clearDump}>← New Dump</button>
        <button class="btn-process" on:click={acceptAll}>✅ Accept All</button>
      </div>
    </div>

    <div class="results-grid">
      <!-- Todos -->
      {#if results.todos && results.todos.length > 0}
        <div class="result-section">
          <h3>📋 Tasks ({results.todos.length})</h3>
          {#each results.todos as todo, i}
            <div class="result-item" class:accepted={accepted.has(`todo-${i}`)}>
              <div class="item-content">
                <span class="priority-badge {todo.priority}">{todo.priority}</span>
                <span class="item-text">{todo.content}</span>
                <span class="eisenhower-badge text-xs">{todo.eisenhower}</span>
              </div>
              <button class="btn-accept" on:click={() => acceptTodo(todo, i)} disabled={accepted.has(`todo-${i}`)}>
                {accepted.has(`todo-${i}`) ? '✅' : '+ Add'}
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Events -->
      {#if results.events && results.events.length > 0}
        <div class="result-section">
          <h3>📅 Events ({results.events.length})</h3>
          {#each results.events as event, i}
            <div class="result-item" class:accepted={accepted.has(`event-${i}`)}>
              <div class="item-content">
                <span class="item-text">{event.title}</span>
                <span class="text-xs text-muted">{event.date} {event.time || ''}</span>
              </div>
              <button class="btn-accept" on:click={() => acceptEvent(event, i)} disabled={accepted.has(`event-${i}`)}>
                {accepted.has(`event-${i}`) ? '✅' : '+ Add'}
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Notes -->
      {#if results.notes && results.notes.length > 0}
        <div class="result-section">
          <h3>📝 Notes ({results.notes.length})</h3>
          {#each results.notes as note, i}
            <div class="result-item" class:accepted={accepted.has(`note-${i}`)}>
              <div class="item-content">
                <strong class="item-text">{note.title}</strong>
                <p class="note-preview text-xs text-muted">{note.content}</p>
              </div>
              <button class="btn-accept" on:click={() => acceptNote(note, i)} disabled={accepted.has(`note-${i}`)}>
                {accepted.has(`note-${i}`) ? '✅' : '+ Add'}
              </button>
            </div>
          {/each}
        </div>
      {/if}

      <!-- Insights -->
      {#if results.insights && results.insights.length > 0}
        <div class="result-section insights-section">
          <h3>💡 Insights</h3>
          {#each results.insights as insight}
            <div class="insight-item">
              <span>💡</span>
              <span>{insight}</span>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}

  {#if error}
    <div class="error-banner">❌ {error}</div>
  {/if}
</div>

<style>
  .dump-view { flex: 1; padding: 20px; display: flex; flex-direction: column; overflow: hidden; }

  .dump-header { margin-bottom: 16px; }
  .dump-header h2 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }

  .dump-input-area { flex: 1; display: flex; flex-direction: column; min-height: 0; }

  .dump-textarea {
    flex: 1;
    width: 100%;
    padding: 20px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-md);
    background: var(--input-bg);
    color: var(--text-primary);
    font-size: 15px;
    line-height: 1.7;
    font-family: var(--font-body);
    resize: none;
    outline: none;
    transition: border-color var(--transition-fast);
  }
  .dump-textarea:focus { border-color: var(--accent); }
  .dump-textarea::placeholder { color: var(--text-muted); opacity: 0.6; }

  .dump-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
  }
  .dump-actions { display: flex; gap: 8px; align-items: center; }

  .btn-process {
    padding: 8px 20px;
    background: var(--accent);
    color: var(--bg-primary);
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: opacity var(--transition-fast);
  }
  .btn-process:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-ghost { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px 12px; font-size: 13px; }

  .spinner { width: 14px; height: 14px; border: 2px solid transparent; border-top-color: currentColor; border-radius: 50%; animation: spin 0.6s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }

  .warning-banner { margin-top: 12px; padding: 10px 14px; background: var(--warning-bg, rgba(210,153,34,0.1)); border: 1px solid var(--warning); border-radius: var(--radius-sm); font-size: 13px; color: var(--warning); }
  .error-banner { margin-top: 12px; padding: 10px 14px; background: rgba(248,81,73,0.1); border: 1px solid var(--error); border-radius: var(--radius-sm); font-size: 13px; color: var(--error); }

  /* Results */
  .results-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .results-header h2 { font-size: 20px; font-weight: 700; }
  .results-actions { display: flex; gap: 8px; }

  .results-grid { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 16px; }

  .result-section {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-md);
    padding: 16px;
  }
  .result-section h3 { font-size: 14px; font-weight: 600; margin-bottom: 10px; }

  .result-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    margin-bottom: 4px;
    transition: background var(--transition-fast);
  }
  .result-item:hover { background: var(--hover-bg); }
  .result-item.accepted { opacity: 0.6; }

  .item-content { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .item-text { font-size: 13px; }
  .note-preview { margin-top: 2px; line-clamp: 2; -webkit-line-clamp: 2; display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }

  .priority-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 6px;
    border-radius: 4px;
    text-transform: uppercase;
    width: fit-content;
  }
  .priority-badge.p1 { background: var(--error); color: white; }
  .priority-badge.p2 { background: var(--warning); color: white; }
  .priority-badge.p3 { background: var(--info); color: white; }
  .priority-badge.p4 { background: var(--text-muted); color: white; }

  .eisenhower-badge { color: var(--text-muted); text-transform: capitalize; }

  .btn-accept {
    padding: 4px 10px;
    border: 1px solid var(--border-color);
    border-radius: var(--radius-sm);
    background: none;
    color: var(--text-primary);
    cursor: pointer;
    font-size: 12px;
    flex-shrink: 0;
    transition: all var(--transition-fast);
  }
  .btn-accept:hover:not(:disabled) { background: var(--accent); color: var(--bg-primary); border-color: var(--accent); }
  .btn-accept:disabled { cursor: default; border-color: var(--success); color: var(--success); }

  .insights-section { background: linear-gradient(135deg, var(--card-bg), var(--panel-bg)); }
  .insight-item { display: flex; gap: 8px; padding: 8px 0; font-size: 13px; line-height: 1.5; border-bottom: 1px solid var(--border-color); }
  .insight-item:last-child { border-bottom: none; }
</style>
