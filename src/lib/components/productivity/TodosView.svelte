<script lang="ts">
  import { onMount } from 'svelte';
  import {
    todos, inboxTodos, activeTodos, completedTodos, projects,
    loadTodos, loadProjects, createTodo, updateTodo, completeTodo, deleteTodo
  } from '../../stores/todos';
  import type { TodoStatus, Priority } from '../../types';

  let newTodoText = '';
  let activeTab: 'inbox' | 'active' | 'done' = 'inbox';
  let editingId: string | null = null;
  let editText = '';

  onMount(async () => {
    await Promise.all([loadTodos(), loadProjects()]);
  });

  async function handleAddTodo() {
    if (!newTodoText.trim()) return;
    await createTodo(newTodoText.trim());
    newTodoText = '';
  }

  async function handleComplete(id: string) {
    await completeTodo(id);
  }

  async function handleDelete(id: string) {
    await deleteTodo(id);
  }

  function startEdit(id: string, content: string) {
    editingId = id;
    editText = content;
  }

  async function saveEdit(id: string) {
    await updateTodo(id, { content: editText });
    editingId = null;
  }

  async function setStatus(id: string, status: TodoStatus) {
    await updateTodo(id, { status });
  }

  async function setPriority(id: string, priority: Priority) {
    await updateTodo(id, { priority });
  }

  const priorityLabels: Record<string, string> = { p1: '🔴 P1', p2: '🟠 P2', p3: '🔵 P3', p4: '⚪ P4' };
  const statusLabels: Record<string, string> = { inbox: '📥', next: '▶️', waiting: '⏳', someday: '💭', done: '✅' };

  $: displayTodos = activeTab === 'inbox' ? $inboxTodos :
                     activeTab === 'active' ? $activeTodos.filter(t => t.status !== 'inbox') :
                     $completedTodos;
</script>

<div class="todos-view">
  <!-- Quick Add -->
  <div class="todo-add">
    <input
      type="text"
      bind:value={newTodoText}
      placeholder="Quick capture — what's on your mind?"
      on:keydown={(e) => e.key === 'Enter' && handleAddTodo()}
      class="todo-input"
    />
    <button class="add-btn" on:click={handleAddTodo}>+ Add</button>
  </div>

  <!-- Tabs -->
  <div class="todo-tabs">
    <button class="tab" class:active={activeTab === 'inbox'} on:click={() => activeTab = 'inbox'}>
      📥 Inbox ({$inboxTodos.length})
    </button>
    <button class="tab" class:active={activeTab === 'active'} on:click={() => activeTab = 'active'}>
      ▶️ Active ({$activeTodos.filter(t => t.status !== 'inbox').length})
    </button>
    <button class="tab" class:active={activeTab === 'done'} on:click={() => activeTab = 'done'}>
      ✅ Done ({$completedTodos.length})
    </button>
  </div>

  <!-- Todo List -->
  <div class="todo-list">
    {#each displayTodos as todo (todo.id)}
      <div class="todo-item" class:completed={todo.status === 'done'}>
        <button class="check-btn" on:click={() => todo.status === 'done' ? setStatus(todo.id, 'inbox') : handleComplete(todo.id)}>
          {todo.status === 'done' ? '✅' : '⬜'}
        </button>

        <div class="todo-content">
          {#if editingId === todo.id}
            <input
              type="text"
              bind:value={editText}
              on:keydown={(e) => e.key === 'Enter' && saveEdit(todo.id)}
              on:blur={() => saveEdit(todo.id)}
              class="edit-input"
            />
          {:else}
            <span class="todo-text" role="textbox" tabindex="0" on:dblclick={() => startEdit(todo.id, todo.content)} on:keydown={(e) => e.key === 'Enter' && startEdit(todo.id, todo.content)}>
              {todo.content}
            </span>
          {/if}

          {#if todo.due_date}
            <span class="due-date text-xs">📅 {todo.due_date}</span>
          {/if}
        </div>

        <div class="todo-meta">
          <select
            value={todo.priority}
            on:change={(e) => setPriority(todo.id, e.currentTarget.value)}
            class="priority-select"
          >
            <option value="p1">🔴 P1</option>
            <option value="p2">🟠 P2</option>
            <option value="p3">🔵 P3</option>
            <option value="p4">⚪ P4</option>
          </select>

          {#if todo.status !== 'done'}
            <select
              value={todo.status}
              on:change={(e) => setStatus(todo.id, e.currentTarget.value)}
              class="status-select"
            >
              <option value="inbox">📥 Inbox</option>
              <option value="next">▶️ Next</option>
              <option value="waiting">⏳ Waiting</option>
              <option value="someday">💭 Someday</option>
            </select>
          {/if}

          <button class="delete-todo-btn" on:click={() => handleDelete(todo.id)} title="Delete">
            🗑
          </button>
        </div>
      </div>
    {/each}

    {#if displayTodos.length === 0}
      <div class="empty-todos">
        {#if activeTab === 'inbox'}
          <p>📥 Inbox empty — nice work!</p>
          <p class="text-xs text-muted">Type above to capture new items</p>
        {:else if activeTab === 'active'}
          <p>No active todos</p>
        {:else}
          <p>No completed todos yet</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .todos-view {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .todo-add {
    display: flex;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-primary);
    background: var(--bg-secondary);
  }
  .todo-input {
    flex: 1;
    padding: 10px 14px;
    font-size: 14px;
  }
  .add-btn {
    padding: 10px 20px;
    border-radius: var(--radius-sm);
    background: var(--accent-primary);
    color: var(--text-inverse);
    font-weight: 600;
    transition: opacity var(--transition-fast);
  }
  .add-btn:hover { opacity: 0.85; }

  .todo-tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--border-primary);
    padding: 0 20px;
  }
  .tab {
    padding: 10px 16px;
    font-size: 13px;
    color: var(--text-secondary);
    border-bottom: 2px solid transparent;
    transition: all var(--transition-fast);
  }
  .tab:hover { color: var(--text-primary); }
  .tab.active {
    color: var(--accent-primary);
    border-bottom-color: var(--accent-primary);
  }

  .todo-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px 20px;
  }

  .todo-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border-secondary);
    transition: background var(--transition-fast);
    animation: fadeIn 0.2s ease;
  }
  .todo-item:hover { background: var(--bg-hover); }
  .todo-item.completed { opacity: 0.5; }
  .todo-item.completed .todo-text { text-decoration: line-through; }

  .check-btn {
    font-size: 16px;
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .todo-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }
  .todo-text {
    font-size: 14px;
    cursor: text;
  }
  .due-date {
    color: var(--text-muted);
  }
  .edit-input {
    font-size: 14px;
    padding: 4px 8px;
    width: 100%;
  }

  .todo-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .priority-select, .status-select {
    font-size: 11px;
    padding: 2px 4px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    border: 1px solid var(--border-secondary);
    cursor: pointer;
  }
  .delete-todo-btn {
    font-size: 14px;
    opacity: 0.4;
    transition: opacity var(--transition-fast);
    padding: 4px;
  }
  .delete-todo-btn:hover { opacity: 1; }

  .empty-todos {
    text-align: center;
    padding: 48px 16px;
    color: var(--text-muted);
  }
</style>
