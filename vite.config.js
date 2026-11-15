import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

// `vite build` = the website (homepage + web app). `vite build --mode native` = just the app, for the
// iPhone app (Capacitor); scripts/native-index.mjs then moves its page to the root of dist-native/.
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Relative asset paths so the build works from any URL path (e.g. GitHub Pages at /<repo-name>/).
  base: "./",
  build: mode === "native"
    ? { outDir: "dist-native", rollupOptions: { input: { app: resolve(import.meta.dirname, "app/index.html") } } }
    : {
        rollupOptions: {
          // index.html = public homepage (what Google indexes); app/index.html = the React app.
          input: {
            main: resolve(import.meta.dirname, "index.html"),
            app: resolve(import.meta.dirname, "app/index.html"),
          },
        },
      },
}));
