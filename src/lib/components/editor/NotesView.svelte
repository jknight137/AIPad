<script lang="ts">
  import { onMount } from 'svelte';
  import {
    notes, filteredNotes, activeNote, activeNoteId, noteSearchQuery,
    loadNotes, createNote, updateNote, deleteNote
  } from '../../stores/notes';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import Placeholder from '@tiptap/extension-placeholder';
  import TaskList from '@tiptap/extension-task-list';
  import TaskItem from '@tiptap/extension-task-item';
  import Underline from '@tiptap/extension-underline';
  import Link from '@tiptap/extension-link';

  let editorElement: HTMLDivElement;
  let editor: Editor | null = null;
  let saveTimeout: ReturnType<typeof setTimeout>;

  onMount(async () => {
    await loadNotes();
  });

  function initEditor(node: HTMLDivElement) {
    editor = new Editor({
      element: node,
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder: 'Start writing...' }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Underline,
        Link.configure({ openOnClick: false }),
      ],
      content: '',
      onUpdate: ({ editor: e }) => {
        if ($activeNoteId) {
          clearTimeout(saveTimeout);
          saveTimeout = setTimeout(() => {
            updateNote($activeNoteId!, {
              content_json: JSON.stringify(e.getJSON()),
              content_text: e.getText(),
            });
          }, 500);
        }
      },
      editorProps: {
        attributes: {
          class: 'note-editor-content',
        },
      },
    });

    return {
      destroy() {
        editor?.destroy();
      },
    };
  }

  // Load note content into editor when active note changes
  $: if (editor && $activeNote) {
    try {
      const content = $activeNote.content_json ? JSON.parse($activeNote.content_json) : {};
      if (Object.keys(content).length > 0) {
        editor.commands.setContent(content);
      } else {
        editor.commands.setContent('');
      }
    } catch {
      editor.commands.setContent('');
    }
  }

  async function handleCreateNote() {
    await createNote();
  }

  function handleTitleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if ($activeNoteId) {
      updateNote($activeNoteId, { title: target.value });
    }
  }

  async function handleDeleteNote(id: string) {
    if (confirm('Delete this note?')) {
      await deleteNote(id);
    }
  }

  function togglePin(id: string, pinned: boolean) {
    updateNote(id, { pinned: !pinned });
  }

  function formatToolbar(action: string) {
    if (!editor) return;
    switch (action) {
      case 'bold': editor.chain().focus().toggleBold().run(); break;
      case 'italic': editor.chain().focus().toggleItalic().run(); break;
      case 'underline': editor.chain().focus().toggleUnderline().run(); break;
      case 'strike': editor.chain().focus().toggleStrike().run(); break;
      case 'h1': editor.chain().focus().toggleHeading({ level: 1 }).run(); break;
      case 'h2': editor.chain().focus().toggleHeading({ level: 2 }).run(); break;
      case 'h3': editor.chain().focus().toggleHeading({ level: 3 }).run(); break;
      case 'bullet': editor.chain().focus().toggleBulletList().run(); break;
      case 'ordered': editor.chain().focus().toggleOrderedList().run(); break;
      case 'task': editor.chain().focus().toggleTaskList().run(); break;
      case 'code': editor.chain().focus().toggleCodeBlock().run(); break;
      case 'quote': editor.chain().focus().toggleBlockquote().run(); break;
      case 'hr': editor.chain().focus().setHorizontalRule().run(); break;
    }
  }
</script>

<div class="notes-view">
  <!-- Note List Sidebar -->
  <div class="note-list-panel">
    <div class="note-list-header">
      <input
        type="text"
        placeholder="Search notes..."
        bind:value={$noteSearchQuery}
        class="note-search"
      />
      <button class="new-note-btn" on:click={handleCreateNote} title="New Note">+</button>
    </div>
    <div class="note-list">
      {#each $filteredNotes as note (note.id)}
        <button
          class="note-item"
          class:active={$activeNoteId === note.id}
          on:click={() => activeNoteId.set(note.id)}
        >
          <div class="note-item-header">
            <span class="note-title">{note.title || 'Untitled'}</span>
            {#if note.pinned}<span class="pin-icon">📌</span>{/if}
            {#if note.encrypted}<span>🔒</span>{/if}
          </div>
          <div class="note-preview text-xs text-muted">
            {note.content_text?.substring(0, 80) || 'Empty note'}
          </div>
        </button>
      {/each}
      {#if $filteredNotes.length === 0}
        <div class="empty-notes">
          <p>No notes yet</p>
          <button class="dash-btn" on:click={handleCreateNote}>Create your first note</button>
        </div>
      {/if}
    </div>
  </div>

  <!-- Editor Area -->
  <div class="editor-panel">
    {#if $activeNote}
      <!-- Title -->
      <input
        type="text"
        class="note-title-input"
        value={$activeNote.title}
        on:input={handleTitleChange}
        placeholder="Note title..."
      />

      <!-- Toolbar -->
      <div class="editor-toolbar">
        <button on:click={() => formatToolbar('bold')} title="Bold (Ctrl+B)"><b>B</b></button>
        <button on:click={() => formatToolbar('italic')} title="Italic (Ctrl+I)"><i>I</i></button>
        <button on:click={() => formatToolbar('underline')} title="Underline (Ctrl+U)"><u>U</u></button>
        <button on:click={() => formatToolbar('strike')} title="Strikethrough"><s>S</s></button>
        <span class="toolbar-divider"></span>
        <button on:click={() => formatToolbar('h1')} title="Heading 1">H1</button>
        <button on:click={() => formatToolbar('h2')} title="Heading 2">H2</button>
        <button on:click={() => formatToolbar('h3')} title="Heading 3">H3</button>
        <span class="toolbar-divider"></span>
        <button on:click={() => formatToolbar('bullet')} title="Bullet List">•</button>
        <button on:click={() => formatToolbar('ordered')} title="Numbered List">1.</button>
        <button on:click={() => formatToolbar('task')} title="Task List">☑</button>
        <span class="toolbar-divider"></span>
        <button on:click={() => formatToolbar('code')} title="Code Block">⟨/⟩</button>
        <button on:click={() => formatToolbar('quote')} title="Blockquote">❝</button>
        <button on:click={() => formatToolbar('hr')} title="Horizontal Rule">─</button>
        <span class="toolbar-spacer"></span>
        <button on:click={() => togglePin($activeNote.id, $activeNote.pinned)} title="Pin">
          {$activeNote.pinned ? '📌' : '📍'}
        </button>
        <button on:click={() => handleDeleteNote($activeNote.id)} title="Delete" class="delete-btn">
          🗑
        </button>
      </div>

      <!-- Editor -->
      <div class="editor-container" use:initEditor bind:this={editorElement}></div>
    {:else}
      <div class="no-note-selected">
        <span class="big-icon">📝</span>
        <p>Select a note or create a new one</p>
        <button class="dash-btn accent" on:click={handleCreateNote}>New Note</button>
      </div>
    {/if}
  </div>
</div>

<style>
  .notes-view {
    flex: 1;
    display: flex;
    overflow: hidden;
  }

  .note-list-panel {
    width: 260px;
    border-right: 1px solid var(--border-primary);
    display: flex;
    flex-direction: column;
    background: var(--bg-secondary);
    flex-shrink: 0;
  }

  .note-list-header {
    padding: 8px;
    display: flex;
    gap: 6px;
    border-bottom: 1px solid var(--border-primary);
  }
  .note-search {
    flex: 1;
    font-size: 12px;
    padding: 6px 8px;
  }
  .new-note-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--accent-primary);
    color: var(--text-inverse);
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity var(--transition-fast);
  }
  .new-note-btn:hover { opacity: 0.85; }

  .note-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px;
  }

  .note-item {
    width: 100%;
    text-align: left;
    padding: 10px 8px;
    border-radius: var(--radius-sm);
    margin-bottom: 2px;
    transition: background var(--transition-fast);
  }
  .note-item:hover { background: var(--bg-hover); }
  .note-item.active { background: var(--bg-active); }

  .note-item-header {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 2px;
  }
  .note-title {
    font-size: 13px;
    font-weight: 500;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pin-icon { font-size: 10px; }

  .note-preview {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .empty-notes {
    padding: 24px 16px;
    text-align: center;
    color: var(--text-muted);
  }
  .empty-notes p { margin-bottom: 12px; }

  .editor-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--editor-bg);
  }

  .note-title-input {
    border: none;
    border-bottom: 1px solid var(--border-secondary);
    border-radius: 0;
    padding: 12px 20px;
    font-size: 20px;
    font-weight: 700;
    background: transparent;
    color: var(--text-primary);
  }
  .note-title-input:focus { border-color: var(--accent-primary); }

  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 6px 12px;
    border-bottom: 1px solid var(--border-secondary);
    flex-wrap: wrap;
  }
  .editor-toolbar button {
    width: 30px;
    height: 28px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    transition: all var(--transition-fast);
  }
  .editor-toolbar button:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  .toolbar-divider {
    width: 1px;
    height: 20px;
    background: var(--border-primary);
    margin: 0 4px;
  }
  .toolbar-spacer { flex: 1; }
  .delete-btn:hover { color: var(--error) !important; }

  .editor-container {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  }

  :global(.note-editor-content) {
    min-height: 100%;
    outline: none;
    font-size: 14px;
    line-height: 1.7;
    color: var(--text-primary);
  }

  :global(.note-editor-content p.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: var(--text-muted);
    pointer-events: none;
    height: 0;
  }

  :global(.note-editor-content h1) { font-size: 28px; font-weight: 700; margin: 16px 0 8px; }
  :global(.note-editor-content h2) { font-size: 22px; font-weight: 600; margin: 14px 0 6px; }
  :global(.note-editor-content h3) { font-size: 18px; font-weight: 600; margin: 12px 0 4px; }
  :global(.note-editor-content p) { margin-bottom: 8px; }
  :global(.note-editor-content ul, .note-editor-content ol) { padding-left: 24px; margin-bottom: 8px; }
  :global(.note-editor-content blockquote) {
    border-left: 3px solid var(--accent-primary);
    padding-left: 12px;
    margin: 8px 0;
    color: var(--text-secondary);
  }
  :global(.note-editor-content pre) {
    background: var(--bg-tertiary);
    border-radius: var(--radius-sm);
    padding: 12px;
    font-family: var(--font-mono);
    font-size: 13px;
    overflow-x: auto;
    margin: 8px 0;
  }
  :global(.note-editor-content code) {
    background: var(--bg-tertiary);
    padding: 2px 4px;
    border-radius: 3px;
    font-family: var(--font-mono);
    font-size: 13px;
  }
  :global(.note-editor-content hr) {
    border: none;
    border-top: 1px solid var(--border-primary);
    margin: 16px 0;
  }
  :global(.note-editor-content ul[data-type="taskList"]) {
    list-style: none;
    padding-left: 0;
  }
  :global(.note-editor-content ul[data-type="taskList"] li) {
    display: flex;
    align-items: flex-start;
    gap: 6px;
  }

  .no-note-selected {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: var(--text-muted);
  }
  .big-icon { font-size: 48px; }

  .dash-btn {
    padding: 8px 16px;
    border-radius: var(--radius-sm);
    background: var(--bg-tertiary);
    color: var(--text-secondary);
    font-size: 13px;
    transition: all var(--transition-fast);
  }
  .dash-btn.accent { background: var(--accent-primary); color: var(--text-inverse); }
</style>
