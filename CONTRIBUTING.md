# Contributing to AIPad

Thank you for considering contributing to AIPad! This guide will help you get started.

## Getting Started

### Prerequisites

| Tool    | Minimum Version | Check             |
| ------- | --------------- | ----------------- |
| Node.js | 20+             | `node --version`  |
| npm     | 10+             | `npm --version`   |
| Rust    | 1.77.2+         | `rustc --version` |
| Cargo   | latest          | `cargo --version` |

Optional (for AI features):

- [Ollama](https://ollama.com) running on `localhost:11434`

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/AIPad.git
cd AIPad

# Install frontend dependencies
npm install

# Run in development mode (starts Vite + Cargo simultaneously)
npx tauri dev
```

### Build for Production

```bash
npx tauri build
```

Artifacts are written to `src-tauri/target/release/bundle/`.

## Project Structure

```
AIPad/
├── src/                      # Svelte frontend
│   ├── lib/
│   │   ├── components/       # UI views (dashboard, editor, vault, terminal, …)
│   │   ├── services/         # db.ts, ollama.ts, encryption.ts
│   │   ├── stores/           # Svelte stores (theme, notes, todos, calendar, …)
│   │   └── types/            # TypeScript interfaces and type unions
│   ├── styles/               # global.css + 7 theme CSS files
│   ├── App.svelte            # Root shell (sidebar, router, status bar)
│   └── main.ts               # Svelte 5 mount entry point
├── src-tauri/                # Rust backend
│   ├── src/lib.rs            # PTY management, Tauri commands, plugin setup
│   ├── Cargo.toml
│   └── tauri.conf.json       # Window, plugin, and bundle config
├── public/                   # Static assets (app icon)
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## How to Contribute

### Reporting Bugs

Open a [GitHub Issue](../../issues) with:

- Steps to reproduce
- Expected vs actual behavior
- OS, Node, Rust versions
- Console / terminal output

### Suggesting Features

Open an issue with the **enhancement** label. Describe the use case and any design ideas.

### Pull Requests

1. Fork the repo and create a feature branch from `main`.
2. Make your changes — keep commits focused and well-described.
3. Ensure the build passes: `npm run build && npx tauri build`.
4. Run `npm run check` to verify TypeScript types.
5. Open a PR against `main` with a clear description.

### Code Style

- **TypeScript / Svelte**: 2-space indent, no semicolons optional (project uses semicolons).
- **Rust**: 4-space indent, standard `rustfmt` formatting (`cargo fmt`).
- **CSS**: Use CSS custom properties (from theme files) instead of hardcoded colors.
- Follow the existing `.editorconfig`.

### Commit Messages

Use clear, imperative-mood messages:

```
fix: resolve vault auto-lock race condition
feat: add pomodoro notification sound setting
docs: update README with Linux build instructions
```

## Architecture Notes

- **Frontend**: Svelte 5 (runes-compatible but currently using stores), Vite 7, TypeScript.
- **Backend**: Tauri 2, Rust. PTY via `portable-pty`. Plugins for SQL, filesystem, HTTP, etc.
- **State**: Svelte writable/derived stores in `src/lib/stores/`.
- **Theming**: CSS custom properties on `:root[data-theme="<name>"]`. Add new themes by creating a CSS file in `src/styles/themes/` and registering it in the `THEMES` array in `src/lib/stores/theme.ts`.
- **AI**: All LLM calls go through `src/lib/services/ollama.ts`. The app communicates with a local Ollama instance — no data leaves the machine.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
