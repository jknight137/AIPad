// ── Todos Store ─────────────────────────────────────────────────────

import { writable, derived } from "svelte/store";
import { v4 as uuid } from "uuid";
import { query, execute } from "../services/db";
import type {
  Todo,
  Project,
  EisenhowerQuadrant,
  TodoStatus,
  Priority,
} from "../types";

export const todos = writable<Todo[]>([]);
export const projects = writable<Project[]>([]);
export const todosFilter = writable<{
  status?: TodoStatus;
  quadrant?: EisenhowerQuadrant;
  project_id?: string;
}>({});

export const inboxTodos = derived(todos, ($t) =>
  $t.filter((t) => t.status === "inbox"),
);
export const activeTodos = derived(todos, ($t) =>
  $t.filter((t) => t.status !== "done"),
);
export const completedTodos = derived(todos, ($t) =>
  $t.filter((t) => t.status === "done"),
);

export const todosByQuadrant = derived(todos, ($t) => {
  const active = $t.filter((t) => t.status !== "done");
  return {
    do: active.filter((t) => t.eisenhower === "do"),
    schedule: active.filter((t) => t.eisenhower === "schedule"),
    delegate: active.filter((t) => t.eisenhower === "delegate"),
    eliminate: active.filter((t) => t.eisenhower === "eliminate"),
  };
});

export async function loadTodos() {
  const rows = await query<Todo>(
    "SELECT * FROM todos ORDER BY created_at DESC",
  );
  todos.set(rows);
}

export async function loadProjects() {
  const rows = await query<Project>(
    "SELECT * FROM projects ORDER BY sort_order",
  );
  projects.set(rows);
}

export async function createTodo(
  content: string,
  options: Partial<Todo> = {},
): Promise<string> {
  const id = uuid();
  await execute(
    `INSERT INTO todos (id, content, priority, eisenhower, status, due_date, project_id, description)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      id,
      content,
      options.priority || "p3",
      options.eisenhower || "schedule",
      options.status || "inbox",
      options.due_date || null,
      options.project_id || null,
      options.description || "",
    ],
  );
  await loadTodos();
  return id;
}

export async function updateTodo(id: string, updates: Partial<Todo>) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  const fields: (keyof Todo)[] = [
    "content",
    "description",
    "priority",
    "eisenhower",
    "status",
    "due_date",
    "project_id",
    "context_tags",
    "estimated_minutes",
    "actual_minutes",
    "completed_at",
  ];
  for (const field of fields) {
    if (updates[field] !== undefined) {
      sets.push(`${field} = $${idx++}`);
      params.push(updates[field]);
    }
  }
  if (sets.length === 0) return;
  params.push(id);
  await execute(
    `UPDATE todos SET ${sets.join(", ")} WHERE id = $${idx}`,
    params,
  );
  await loadTodos();
}

export async function completeTodo(id: string) {
  await execute(
    `UPDATE todos SET status = 'done', completed_at = datetime('now') WHERE id = $1`,
    [id],
  );
  await loadTodos();
}

export async function deleteTodo(id: string) {
  await execute("DELETE FROM todos WHERE id = $1", [id]);
  todos.update((ts) => ts.filter((t) => t.id !== id));
}

export async function createProject(
  name: string,
  description = "",
  color = "#58a6ff",
): Promise<string> {
  const id = uuid();
  await execute(
    "INSERT INTO projects (id, name, description, color) VALUES ($1, $2, $3, $4)",
    [id, name, description, color],
  );
  await loadProjects();
  return id;
}

export async function moveTodoQuadrant(
  todoId: string,
  quadrant: EisenhowerQuadrant,
) {
  await updateTodo(todoId, { eisenhower: quadrant });
}

// Convenience aliases
export const todoStore = derived(todos, ($t) => ({ todos: $t }));
export const addTodo = async (opts: Partial<Todo> & { content: string }) =>
  createTodo(opts.content, opts);
