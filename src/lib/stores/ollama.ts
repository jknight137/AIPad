// ── Ollama Store ────────────────────────────────────────────────────

import { writable } from "svelte/store";
import type { OllamaModel, ChatMessage, OllamaMessage } from "../types";
import { ollamaHealthCheck, listModels, chat } from "../services/ollama";

export const ollamaConnected = writable(false);
export const ollamaModels = writable<OllamaModel[]>([]);
export const selectedModel = writable<string>("");
export const chatHistory = writable<ChatMessage[]>([]);

export async function checkOllamaConnection() {
  const connected = await ollamaHealthCheck();
  ollamaConnected.set(connected);
  if (connected) {
    const models = await listModels();
    ollamaModels.set(models);
    // Auto-select best model if none selected
    const toolFamilies = ["llama", "qwen2", "mistral"];
    const stored = localStorage.getItem("aipad_ollama_model");
    const storedModel = stored ? models.find((m) => m.name === stored) : null;
    const storedSupportsTools =
      storedModel?.details?.families?.some((f: string) =>
        toolFamilies.includes(f),
      ) ?? false;

    if (storedModel && storedSupportsTools) {
      selectedModel.set(stored!);
    } else if (models.length > 0) {
      // Prefer models from families that support tool calling
      const toolCapable = models.filter((m) =>
        m.details?.families?.some((f: string) => toolFamilies.includes(f)),
      );
      const pool = toolCapable.length > 0 ? toolCapable : models;
      const best = pool.sort((a, b) => b.size - a.size)[0];
      selectedModel.set(best.name);
      localStorage.setItem("aipad_ollama_model", best.name);
    }
  }
  return connected;
}

export function setModel(model: string) {
  selectedModel.set(model);
  localStorage.setItem("aipad_ollama_model", model);
}

export function addChatMessage(msg: ChatMessage) {
  chatHistory.update((h) => [...h, msg]);
}

export function clearChatHistory() {
  chatHistory.set([]);
}

// Convenience aliases
export const selectModel = setModel;
export const fetchModels = async () => {
  const models = await listModels();
  ollamaModels.set(models);
  return models;
};

// Combined store for reactive access
import { derived } from "svelte/store";
export const ollamaStore = derived(
  [ollamaConnected, ollamaModels, selectedModel],
  ([$connected, $models, $selected]) => ({
    connected: $connected,
    models: $models,
    selectedModel: $selected,
  }),
);

// Chat helper using the selected model
export async function chatWithOllama(
  messages: OllamaMessage[],
): Promise<string> {
  let model = "";
  selectedModel.subscribe((m) => (model = m))();
  if (!model) throw new Error("No model selected");

  const result = await chat({
    model,
    messages,
    stream: false,
  });

  return result.content || "";
}
