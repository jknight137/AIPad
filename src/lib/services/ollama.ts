// ── Ollama Service ──────────────────────────────────────────────────
// HTTP client for local Ollama API

import { fetch } from "@tauri-apps/plugin-http";
import type { OllamaModel, OllamaMessage } from "../types";

const DEFAULT_BASE = "http://localhost:11434";

let baseUrl = DEFAULT_BASE;

export function setOllamaBaseUrl(url: string) {
  baseUrl = url;
}

export async function ollamaHealthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<OllamaModel[]> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { method: "GET" });
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

export interface OllamaChatOptions {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  tools?: OllamaTool[];
}

export interface OllamaTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<
        string,
        { type: string; description: string; enum?: string[] }
      >;
      required: string[];
    };
  };
}

// Non-streaming chat
export async function chat(options: OllamaChatOptions): Promise<OllamaMessage> {
  const payload: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    stream: false,
  };
  if (options.tools?.length) {
    payload.tools = options.tools;
  }

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    // If the model doesn't support tools, retry without them
    if (options.tools?.length && errorText.includes("does not support tools")) {
      return chat({ ...options, tools: undefined });
    }
    throw new Error(`Ollama error: ${res.status} ${errorText}`);
  }
  const data = await res.json();
  return data.message;
}

// Streaming chat — returns an async generator of text chunks
export async function* chatStream(
  options: OllamaChatOptions,
): AsyncGenerator<string> {
  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      stream: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status}`);
  }

  const reader = res.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        if (parsed.message?.content) {
          yield parsed.message.content;
        }
      } catch {
        // skip malformed lines
      }
    }
  }
}

// Pre-defined tools that the LLM can use
export const AIPAD_TOOLS: OllamaTool[] = [
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Execute a shell command in the terminal and return its output. Use this for file operations, git commands, system queries, etc.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to execute",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_todo",
      description: "Create a new todo item in the productivity system",
      parameters: {
        type: "object",
        properties: {
          content: { type: "string", description: "The todo item text" },
          priority: {
            type: "string",
            description: "Priority level",
            enum: ["p1", "p2", "p3", "p4"],
          },
          quadrant: {
            type: "string",
            description: "Eisenhower quadrant",
            enum: ["do", "schedule", "delegate", "eliminate"],
          },
          due_date: {
            type: "string",
            description: "Due date in ISO format (optional)",
          },
        },
        required: ["content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_notes",
      description: "Search through user notes by text content",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query text" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_note",
      description: "Create a new note with the given title and content",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Note title" },
          content: {
            type: "string",
            description: "Note content in plain text",
          },
        },
        required: ["title", "content"],
      },
    },
  },
];

export const SYSTEM_PROMPT = `You are AIPad's AI assistant — a helpful, efficient productivity partner embedded in a lightweight desktop app. You can:
- Execute terminal/shell commands using the run_command tool
- Create and search notes
- Create todo items with priorities and Eisenhower quadrant classification

Guidelines:
- Be concise and action-oriented
- Always explain what you're about to do before executing commands
- For destructive operations (delete, overwrite), ask for confirmation first
- Format responses with markdown when helpful
- If unsure about a command, suggest it and ask before running
- You're running on Windows (PowerShell)`;
