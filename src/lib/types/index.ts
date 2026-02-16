// ── AIPad Type Definitions ───────────────────────────────────────────

// ── Notes ────────────────────────────────────────────────────────────

export interface Note {
  id: string;
  title: string;
  content_json: string;
  content_text: string;
  folder_id: string | null;
  tags: string;
  pinned: boolean;
  encrypted: boolean;
  created_at: string;
  updated_at: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string;
  sort_order: number;
}

// ── Vault ────────────────────────────────────────────────────────────

export interface VaultSecret {
  id: string;
  name: string;
  category: "api_key" | "password" | "ssh_key" | "note" | "custom";
  value: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ── Productivity ─────────────────────────────────────────────────────

export type EisenhowerQuadrant = "do" | "schedule" | "delegate" | "eliminate";
export type TodoStatus = "inbox" | "next" | "waiting" | "someday" | "done";
export type Priority = "p1" | "p2" | "p3" | "p4";

export interface Todo {
  id: string;
  content: string;
  description: string;
  priority: Priority;
  eisenhower: EisenhowerQuadrant;
  status: TodoStatus;
  due_date: string | null;
  project_id: string | null;
  context_tags: string;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  created_at: string;
  completed_at: string | null;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "active" | "completed" | "archived";
  color: string;
  sort_order: number;
}

export interface TimeBlock {
  id: string;
  title: string;
  start_dt: string;
  end_dt: string;
  todo_id: string | null;
  category: string;
  color: string;
}

export interface PomodoroSession {
  id: string;
  todo_id: string | null;
  started_at: string;
  ended_at: string | null;
  completed: boolean;
  interruptions: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start_dt: string;
  end_dt: string | null;
  recurrence: string | null;
  all_day: boolean;
  color: string;
  external_id: string | null;
}

export interface TimeLog {
  id: string;
  todo_id: string | null;
  project_id: string | null;
  started_at: string;
  ended_at: string | null;
  notes: string;
}

// ── Ollama ───────────────────────────────────────────────────────────

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families?: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export interface OllamaMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: OllamaToolCall[];
}

export interface OllamaToolCall {
  function: {
    name: string;
    arguments: Record<string, unknown>;
  };
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: string;
  tool_calls?: OllamaToolCall[];
  loading?: boolean;
}

// ── Themes ───────────────────────────────────────────────────────────

export type ThemeName =
  | "dark"
  | "neon"
  | "retro"
  | "arcade"
  | "cyberpunk"
  | "matrix"
  | "synthwave";

export interface ThemeInfo {
  id: ThemeName;
  name: string;
  label: string;
  icon: string;
  description: string;
  accent: string;
  bg: string;
  preview: string[];
}

// ── Views ────────────────────────────────────────────────────────────

export type ViewName =
  | "dashboard"
  | "notes"
  | "vault"
  | "terminal"
  | "todos"
  | "eisenhower"
  | "calendar"
  | "analytics"
  | "cogdump"
  | "settings";

// ── Cognitive Dump ───────────────────────────────────────────────────

export interface DumpResult {
  todos: Array<{
    content: string;
    priority: string;
    eisenhower: string;
    due_date?: string;
  }>;
  events: Array<{ title: string; date: string; time?: string }>;
  notes: Array<{ title: string; content: string }>;
  insights: string[];
}
