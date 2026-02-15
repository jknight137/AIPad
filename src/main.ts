import { mount } from "svelte";
import App from "./App.svelte";

// Import global styles
import "./styles/global.css";

// Import all themes
import "./styles/themes/dark.css";
import "./styles/themes/neon.css";
import "./styles/themes/retro.css";
import "./styles/themes/arcade.css";
import "./styles/themes/cyberpunk.css";
import "./styles/themes/matrix.css";
import "./styles/themes/synthwave.css";

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
