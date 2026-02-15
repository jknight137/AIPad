# ⚡ AIPad

**Lightweight, offline-first desktop productivity cockpit powered by local LLMs — notes, encrypted vault, terminal, todos, calendar & analytics in one app.**

AIPad is a single-binary desktop app that replaces scattered tools with one fast, offline-first workspace — rich notes, encrypted secrets vault, built-in terminal with AI assistant, GTD todos, Eisenhower matrix, calendar, time-blocking, analytics, and a "cognitive dump" mode that turns free-text brain dumps into structured action items via a local LLM.

Built with [Tauri 2](https://tauri.app) + [Svelte 5](https://svelte.dev) + [Rust](https://www.rust-lang.org). All AI features run through a local [Ollama](https://ollama.com) instance — **no data leaves your machine**.

---

## Features

| Feature                         | Description                                                               |
| ------------------------------- | ------------------------------------------------------------------------- |
| 📝 **Rich Notes**               | TipTap editor with code blocks, task lists, links, auto-save to SQLite    |
| 🔒 **Encrypted Vault**          | AES-256-GCM secrets manager with PBKDF2 key derivation and auto-lock      |
| 💻 **Built-in Terminal**        | PTY-backed shell with xterm.js and an AI chat panel for inline assistance |
| ✅ **Todos / GTD**              | Quick capture inbox, priority levels, project grouping, status workflow   |
| 📊 **Eisenhower Matrix**        | Drag-and-drop 2×2 quadrant grid for urgent/important prioritization       |
| 📅 **Calendar & Time-blocking** | Month view, day detail, event and time block CRUD                         |
| 📈 **Analytics**                | Pareto analysis, priority breakdown, pomodoro session history             |
| 🧠 **Cognitive Dump**           | Free-text → LLM → structured todos, events, and notes in one click        |
| ⚙️ **Settings**                 | 7 themes, Ollama endpoint config, runtime model picker, pomodoro tuning   |
| 🎨 **7 Themes**                 | Dark, Neon, Retro, Arcade, Cyberpunk, Matrix, Synthwave                   |

## Quick Start

### Prerequisites

- **Node.js** 20+ and **npm** 10+
- **Rust** 1.77.2+ (install via [rustup](https://rustup.rs))
- _(Optional)_ [Ollama](https://ollama.com) for AI features

### Install & Run

```bash
git clone https://github.com/YOUR_USERNAME/AIPad.git
cd AIPad
npm install
npx tauri dev
```

### Build for Production

```bash
npx tauri build
```

Output: portable `.exe`, `.msi` installer, and NSIS installer in `src-tauri/target/release/bundle/`.

## Keyboard Shortcuts

| Shortcut | Action            |
| -------- | ----------------- |
| `Ctrl+1` | Dashboard         |
| `Ctrl+2` | Notes             |
| `Ctrl+3` | Vault             |
| `Ctrl+4` | Terminal          |
| `Ctrl+5` | Todos             |
| `Ctrl+6` | Eisenhower Matrix |
| `Ctrl+7` | Calendar          |
| `Ctrl+8` | Analytics         |
| `Ctrl+9` | Cognitive Dump    |
| `Ctrl+,` | Settings          |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   Tauri Shell                    │
│  ┌──────────┐  ┌──────────────────────────────┐ │
│  │ Sidebar  │  │         Active View           │ │
│  │ (nav)    │  │  Dashboard · Notes · Vault    │ │
│  │          │  │  Terminal · Todos · Matrix    │ │
│  │          │  │  Calendar · Analytics · Dump  │ │
│  │          │  │  Settings                     │ │
│  └──────────┘  └──────────────────────────────┘ │
│  └──────────── Status Bar ─────────────────────┘ │
└─────────────────────────────────────────────────┘
         │                        │
    Svelte Stores            Tauri Commands
    (theme, notes,           (PTY spawn/write,
     todos, calendar,         system info)
     vault, ollama,                │
     pomodoro)                     │
         │                   Rust Backend
    Services                 (portable-pty,
    (SQLite, Ollama API,      tokio, Tauri
     Web Crypto)              plugins)
```

**Frontend:** Svelte 5 · TypeScript · Vite 7 · TipTap 3 · xterm.js 6 · Chart.js 4

**Backend:** Tauri 2 · Rust · portable-pty · SQLite (via plugin) · tokio

**Styling:** CSS custom properties · 7 full themes · Google Fonts (Inter + JetBrains Mono)

## Project Structure

```
AIPad/
├── src/                        # Svelte frontend
│   ├── lib/
│   │   ├── components/         # Feature views
│   │   │   ├── calendar/       #   CalendarView
│   │   │   ├── dashboard/      #   DashboardView, AnalyticsView
│   │   │   ├── dump/           #   CogDumpView
│   │   │   ├── editor/         #   NotesView (TipTap)
│   │   │   ├── layout/         #   Sidebar, StatusBar
│   │   │   ├── productivity/   #   TodosView, EisenhowerView
│   │   │   ├── settings/       #   SettingsView
│   │   │   ├── terminal/       #   TerminalView (xterm + AI)
│   │   │   └── vault/          #   VaultView
│   │   ├── services/           # db, ollama, encryption
│   │   ├── stores/             # Svelte stores (8 modules)
│   │   └── types/              # TypeScript interfaces
│   ├── styles/                 # global.css + themes/
│   ├── App.svelte
│   └── main.ts
├── src-tauri/                  # Rust backend
│   ├── src/lib.rs              # PTY commands, plugin registration
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── capabilities/           # Permission scoping
├── public/                     # Static assets
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE                     # MIT
└── package.json
```

## Themes

AIPad ships with 7 full themes, each defining 40+ CSS custom properties:

| Theme        | Palette                        |
| ------------ | ------------------------------ |
| 🌙 Dark      | GitHub-dark inspired (default) |
| 💡 Neon      | Electric cyan/magenta on black |
| 📺 Retro     | Amber phosphor CRT             |
| 🕹️ Arcade    | 80s cabinet pinks and yellows  |
| 🤖 Cyberpunk | Navy + neon pink               |
| 🐈‍⬛ Matrix    | Green code rain                |
| 🌅 Synthwave | Sunset purple gradients        |

To add a theme, create a CSS file in `src/styles/themes/`, define variables on `:root[data-theme="yourname"]`, and register it in the `THEMES` array in `src/lib/stores/theme.ts`.

## Ollama / AI Setup

AIPad connects to a local Ollama instance at `http://localhost:11434` (configurable in Settings).

```bash
# Install Ollama (https://ollama.com)
ollama pull llama3.2        # or any model you prefer
ollama serve                # start the server
```

The app auto-detects available models at startup and lets you switch at runtime. AI features include:

- **Terminal AI panel** — ask questions, get shell commands, with streaming responses
- **Cognitive Dump** — free-text → LLM extracts todos, events, notes, and insights
- **Tool calling** — the LLM can create todos, add calendar events, and save notes

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, project structure, code style, and PR guidelines.

## License

[MIT](LICENSE) — free for personal and commercial use.
