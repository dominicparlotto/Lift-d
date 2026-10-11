import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  // Relative asset paths so the build works from any URL path (e.g. GitHub Pages at /<repo-name>/).
  base: "./",
  build: {
    rollupOptions: {
      // index.html = public homepage (what Google indexes); app/index.html = the React app.
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        app: resolve(import.meta.dirname, "app/index.html"),
      },
    },
  },
});
