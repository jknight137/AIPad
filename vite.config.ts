import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [svelte()],
  clearScreen: false,
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          tiptap: [
            "@tiptap/core",
            "@tiptap/starter-kit",
            "@tiptap/extension-link",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-underline",
            "@tiptap/extension-task-list",
            "@tiptap/extension-task-item",
            "@tiptap/extension-code-block-lowlight",
          ],
          xterm: ["@xterm/xterm", "@xterm/addon-fit", "@xterm/addon-web-links"],
          charts: ["chart.js"],
          utils: ["date-fns", "uuid", "lowlight"],
        },
      },
    },
  },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
