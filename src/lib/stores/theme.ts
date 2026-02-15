// ── Theme Store ─────────────────────────────────────────────────────

import { writable } from "svelte/store";
import type { ThemeName, ThemeInfo } from "../types";

export const THEMES: ThemeInfo[] = [
  {
    id: "dark",
    name: "dark",
    label: "Dark",
    icon: "🌙",
    description: "Clean, GitHub-dark inspired",
    accent: "#58a6ff",
    bg: "#0d1117",
    preview: ["#0d1117", "#161b22", "#58a6ff", "#3fb950"],
  },
  {
    id: "neon",
    name: "neon",
    label: "Neon",
    icon: "💡",
    description: "Electric glow, black canvas",
    accent: "#00ffff",
    bg: "#000000",
    preview: ["#000000", "#0a0a0a", "#00ffff", "#ff00ff"],
  },
  {
    id: "retro",
    name: "retro",
    label: "Retro",
    icon: "📺",
    description: "Amber phosphor CRT terminal",
    accent: "#ffb000",
    bg: "#0a0a00",
    preview: ["#0a0a00", "#111100", "#ffb000", "#33ff33"],
  },
  {
    id: "arcade",
    name: "arcade",
    label: "Arcade",
    icon: "🕹️",
    description: "80s arcade cabinet vibes",
    accent: "#ffe66d",
    bg: "#1a0533",
    preview: ["#1a0533", "#220944", "#ffe66d", "#ff6b9d"],
  },
  {
    id: "cyberpunk",
    name: "cyberpunk",
    label: "Cyberpunk",
    icon: "🤖",
    description: "Dark navy, neon pink edge",
    accent: "#ff2a6d",
    bg: "#0a0e27",
    preview: ["#0a0e27", "#0f1538", "#ff2a6d", "#05d9e8"],
  },
  {
    id: "matrix",
    name: "matrix",
    label: "Matrix",
    icon: "🐈‍⬛",
    description: "Follow the green code",
    accent: "#00ff41",
    bg: "#000000",
    preview: ["#000000", "#001100", "#00ff41", "#33ff77"],
  },
  {
    id: "synthwave",
    name: "synthwave",
    label: "Synthwave",
    icon: "🌅",
    description: "Sunset purple gradients",
    accent: "#ff6ac1",
    bg: "#1a1025",
    preview: ["#1a1025", "#241734", "#ff6ac1", "#ffcc00"],
  },
];

function createThemeStore() {
  const stored =
    (typeof localStorage !== "undefined" &&
      localStorage.getItem("aipad_theme")) ||
    "dark";
  const { subscribe, set } = writable<ThemeName>(stored as ThemeName);

  return {
    subscribe,
    set: (theme: ThemeName) => {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("aipad_theme", theme);
      set(theme);
    },
    init: () => {
      const saved = localStorage.getItem("aipad_theme") || "dark";
      document.documentElement.setAttribute("data-theme", saved);
      set(saved as ThemeName);
    },
  };
}

export const theme = createThemeStore();

// Convenience aliases
export const themeStore = theme;
export const setTheme = (t: ThemeName) => theme.set(t);
export const initTheme = () => theme.init();
