<script lang="ts">
  import { onMount } from 'svelte';
  import { todosByQuadrant, loadTodos, moveTodoQuadrant, updateTodo } from '../../stores/todos';
  import type { EisenhowerQuadrant } from '../../types';
  import { dndzone } from 'svelte-dnd-action';

  onMount(async () => { await loadTodos(); });

  const quadrantConfig = {
    do: { label: '🔥 Do', subtitle: 'Urgent & Important', class: 'q-do' },
    schedule: { label: '📅 Schedule', subtitle: 'Important, Not Urgent', class: 'q-schedule' },
    delegate: { label: '👥 Delegate', subtitle: 'Urgent, Not Important', class: 'q-delegate' },
    eliminate: { label: '🗑️ Eliminate', subtitle: 'Neither', class: 'q-eliminate' },
  };

  // DnD state — create reactive copies
  let doItems: any[] = [];
  let scheduleItems: any[] = [];
  let delegateItems: any[] = [];
  let eliminateItems: any[] = [];

  $: {
    doItems = $todosByQuadrant.do.map(t => ({ ...t }));
    scheduleItems = $todosByQuadrant.schedule.map(t => ({ ...t }));
    delegateItems = $todosByQuadrant.delegate.map(t => ({ ...t }));
    eliminateItems = $todosByQuadrant.eliminate.map(t => ({ ...t }));
  }

  function handleDndConsider(quadrant: EisenhowerQuadrant, e: CustomEvent) {
    const items = e.detail.items;
    switch (quadrant) {
      case 'do': doItems = items; break;
      case 'schedule': scheduleItems = items; break;
      case 'delegate': delegateItems = items; break;
      case 'eliminate': eliminateItems = items; break;
    }
  }

  async function handleDndFinalize(quadrant: EisenhowerQuadrant, e: CustomEvent) {
    const items = e.detail.items;
    switch (quadrant) {
      case 'do': doItems = items; break;
      case 'schedule': scheduleItems = items; break;
      case 'delegate': delegateItems = items; break;
      case 'eliminate': eliminateItems = items; break;
    }
    // Update any items that moved to this quadrant
    for (const item of items) {
      if (item.eisenhower !== quadrant) {
        await moveTodoQuadrant(item.id, quadrant);
      }
    }
  }

  function getItems(quadrant: EisenhowerQuadrant) {
    switch (quadrant) {
      case 'do': return doItems;
      case 'schedule': return scheduleItems;
      case 'delegate': return delegateItems;
      case 'eliminate': return eliminateItems;
    }
  }

  const priorityColors: Record<string, string> = {
    p1: 'var(--error)', p2: 'var(--warning)', p3: 'var(--info)', p4: 'var(--text-muted)'
  };
</script>

<div class="eisenhower-view">
  <h2 class="matrix-title">📊 Eisenhower Matrix</h2>
  <p class="matrix-subtitle text-muted">Drag tasks between quadrants to prioritize</p>

  <div class="matrix-grid">
    {#each (['do', 'schedule', 'delegate', 'eliminate'] as EisenhowerQuadrant[]) as quadrant}
      <div class="quadrant {quadrantConfig[quadrant].class}">
        <div class="quadrant-header">
          <span class="quadrant-label">{quadrantConfig[quadrant].label}</span>
          <span class="quadrant-count">{getItems(quadrant).length}</span>
        </div>
        <p class="quadrant-subtitle text-xs text-muted">{quadrantConfig[quadrant].subtitle}</p>

        <div
          class="quadrant-items"
          use:dndzone={{ items: getItems(quadrant), dropTargetStyle: {} }}
          on:consider={(e) => handleDndConsider(quadrant, e)}
          on:finalize={(e) => handleDndFinalize(quadrant, e)}
        >
          {#each getItems(quadrant) as todo (todo.id)}
            <div class="matrix-card">
              <div class="card-priority" style="background: {priorityColors[todo.priority]}"></div>
              <span class="card-content">{todo.content}</span>
              {#if todo.due_date}
                <span class="card-due text-xs">📅 {todo.due_date}</span>
              {/if}
            </div>
          {/each}
        </div>
      </div>
    {/each}
  </div>
</div>

<style>
  .eisenhower-view {
    flex: 1;
    padding: 20px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .matrix-title { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
  .matrix-subtitle { margin-bottom: 16px; }

  .matrix-grid {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: 1fr 1fr;
    gap: 12px;
    min-height: 0;
  }

  .quadrant {
    border-radius: var(--radius-md);
    padding: 12px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .q-do { background: var(--quadrant-do); border: 1px solid var(--quadrant-do-border); }
  .q-schedule { background: var(--quadrant-schedule); border: 1px solid var(--quadrant-schedule-border); }
  .q-delegate { background: var(--quadrant-delegate); border: 1px solid var(--quadrant-delegate-border); }
  .q-eliminate { background: var(--quadrant-eliminate); border: 1px solid var(--quadrant-eliminate-border); }

  .quadrant-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2px;
  }
  .quadrant-label { font-weight: 600; font-size: 14px; }
  .quadrant-count {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 8px;
    background: var(--badge-bg);
    color: var(--badge-text);
  }
  .quadrant-subtitle { margin-bottom: 8px; }

  .quadrant-items {
    flex: 1;
    min-height: 60px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .matrix-card {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-sm);
    cursor: grab;
    transition: transform var(--transition-fast), box-shadow var(--transition-fast);
  }
  .matrix-card:hover {
    transform: translateY(-1px);
    box-shadow: var(--shadow-sm);
  }

  .card-priority {
    width: 4px;
    height: 100%;
    min-height: 20px;
    border-radius: 2px;
    flex-shrink: 0;
  }
  .card-content {
    flex: 1;
    font-size: 13px;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .card-due { flex-shrink: 0; color: var(--text-muted); }
</style>
