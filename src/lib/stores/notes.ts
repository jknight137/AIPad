// ── Notes Store ─────────────────────────────────────────────────────

import { writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { query, execute } from "../services/db";
import type { Note, Folder } from "../types";

export const notes = writable<Note[]>([]);
export const folders = writable<Folder[]>([]);
export const activeNoteId = writable<string | null>(null);
export const noteSearchQuery = writable("");

export const activeNote = derived(
  [notes, activeNoteId],
  ([$notes, $id]) => $notes.find((n) => n.id === $id) || null,
);

export const filteredNotes = derived(
  [notes, noteSearchQuery],
  ([$notes, $q]) => {
    if (!$q)
      return $notes.sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        );
      });
    const lower = $q.toLowerCase();
    return $notes.filter(
      (n) =>
        n.title.toLowerCase().includes(lower) ||
        n.content_text.toLowerCase().includes(lower),
    );
  },
);

export async function loadNotes() {
  const rows = await query<Note>(
    "SELECT * FROM notes ORDER BY pinned DESC, updated_at DESC",
  );
  notes.set(
    rows.map((r) => ({ ...r, pinned: !!r.pinned, encrypted: !!r.encrypted })),
  );
}

export async function loadFolders() {
  const rows = await query<Folder>("SELECT * FROM folders ORDER BY sort_order");
  folders.set(rows);
}

export async function createNote(
  folderId: string | null = null,
): Promise<string> {
  const id = uuid();
  await execute(
    `INSERT INTO notes (id, title, folder_id) VALUES ($1, $2, $3)`,
    [id, "Untitled", folderId],
  );
  await loadNotes();
  activeNoteId.set(id);
  return id;
}

export async function updateNote(id: string, updates: Partial<Note>) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (updates.title !== undefined) {
    sets.push(`title = $${idx++}`);
    params.push(updates.title);
  }
  if (updates.content_json !== undefined) {
    sets.push(`content_json = $${idx++}`);
    params.push(updates.content_json);
  }
  if (updates.content_text !== undefined) {
    sets.push(`content_text = $${idx++}`);
    params.push(updates.content_text);
  }
  if (updates.folder_id !== undefined) {
    sets.push(`folder_id = $${idx++}`);
    params.push(updates.folder_id);
  }
  if (updates.tags !== undefined) {
    sets.push(`tags = $${idx++}`);
    params.push(updates.tags);
  }
  if (updates.pinned !== undefined) {
    sets.push(`pinned = $${idx++}`);
    params.push(updates.pinned ? 1 : 0);
  }

  sets.push(`updated_at = datetime('now')`);
  params.push(id);

  await execute(
    `UPDATE notes SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
  await loadNotes();
}

export async function deleteNote(id: string) {
  await execute("DELETE FROM notes WHERE id = $1", [id]);
  notes.update((ns) => ns.filter((n) => n.id !== id));
  activeNoteId.update((curr) => (curr === id ? null : curr));
}

export async function createFolder(
  name: string,
  parentId: string | null = null,
): Promise<string> {
  const id = uuid();
  await execute(
    "INSERT INTO folders (id, name, parent_id) VALUES ($1, $2, $3)",
    [id, name, parentId],
  );
  await loadFolders();
  return id;
}

export async function addNote(
  title: string,
  content: string,
  folderId: string | null = null,
): Promise<string> {
  const id = uuid();
  await execute(
    `INSERT INTO notes (id, title, content_text, folder_id) VALUES ($1, $2, $3, $4)`,
    [id, title, content, folderId],
  );
  await loadNotes();
  return id;
}

// Convenience alias
export const notesStore = { subscribe: notes.subscribe };
