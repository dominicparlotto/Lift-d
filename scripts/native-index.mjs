// The iPhone app loads index.html from the root of dist-native/. Vite writes the app page to
// dist-native/app/index.html (pointing at ../assets/…), so move it up a level and fix the paths.
// Web-only files (homepage images, service worker, legal pages, sitemap) aren't needed in the app.
import { readFileSync, writeFileSync, rmSync } from "node:fs";

const dir = new URL("../dist-native/", import.meta.url);
const html = readFileSync(new URL("app/index.html", dir), "utf8").replaceAll('"../', '"./');
writeFileSync(new URL("index.html", dir), html);
for (const f of ["app", "sw.js", "terms", "privacy", "legal.css", "sitemap.xml", "robots.txt", "og-image.jpg", "learn-clip.jpg", "manifest.webmanifest", ".well-known"])
  rmSync(new URL(f, dir), { recursive: true, force: true });
console.log("dist-native/index.html ready");
