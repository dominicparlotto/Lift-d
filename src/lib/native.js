// iPhone app (Capacitor) helpers. On the website every function here is a no-op or falls back to the web API,
// so components can call them without checking where they run.
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { PushNotifications } from "@capacitor/push-notifications";
import { Share } from "@capacitor/share";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export const isNative = Capacitor.isNativePlatform();

// The public web address of the app. Links people share (posts, gym invites, email links) must use it —
// inside the iPhone app the page itself lives at capacitor://localhost, which means nothing to anyone else.
const WEB_APP_URL = "https://joinliftd.com/app/";
export const appPageUrl = () => isNative ? WEB_APP_URL : `${window.location.origin}${window.location.pathname}`;
export const appLink = hash => `${isNative ? WEB_APP_URL : `${window.location.origin}/app/`}#${hash}`;

// Small taps of feedback: "light" (like, follow, send), "selection" (switching tabs), "success" (logged, posted).
export function haptic(kind = "light") {
  if (!isNative) return;
  const run = kind === "success" ? Haptics.notification({ type: NotificationType.Success })
    : kind === "selection" ? Haptics.selectionStart().then(() => Haptics.selectionChanged()).then(() => Haptics.selectionEnd())
    : Haptics.impact({ style: kind === "medium" ? ImpactStyle.Medium : ImpactStyle.Light });
  run.catch(() => {});
}

// Share a link. Returns true if a share sheet opened, false if this device can't share (caller copies the link).
// Throws {name:"AbortError"} if the person closed the sheet.
export async function shareLink({ title, text, url }) {
  if (isNative) {
    try { await Share.share({ title, text, url, dialogTitle: title }); return true; }
    catch (e) { if (/cancel/i.test(e?.message || "")) throw Object.assign(new Error("cancelled"), { name: "AbortError" }); throw e; }
  }
  if (navigator.share) { await navigator.share({ title, text, url }); return true; }
  return false;
}

// Share an image (the PR card) through the iPhone share sheet — which also has "Save Image".
export async function shareImage(blob, fileName, title) {
  const data = await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
  const { uri } = await Filesystem.writeFile({ path: fileName, data, directory: Directory.Cache });
  try { await Share.share({ title, files: [uri], dialogTitle: title }); }
  catch (e) { if (!/cancel/i.test(e?.message || "")) throw e; }
}

// Status bar text colour follows the app theme (light text on the dark theme, dark text on the light one).
export function setStatusBarTheme(theme) {
  if (isNative) StatusBar.setStyle({ style: theme === "light" ? Style.Light : Style.Dark }).catch(() => {});
}

export function hideSplash() {
  if (isNative) SplashScreen.hide({ fadeOutDuration: 250 }).catch(() => {});
}

// Links into the app — joinliftd.com/app/#post=… (universal links), liftd://…, and tapped push notifications —
// arrive here as the part after "#". Returns a function that stops listening.
export function onAppLink(handler) {
  if (!isNative) return () => {};
  const hashOf = url => { try { return new URL(url, WEB_APP_URL).hash.slice(1); } catch { return ""; } };
  const subs = [
    App.addListener("appUrlOpen", ({ url }) => { const h = hashOf(url); if (h) handler(h); }),
    PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
      const h = hashOf(notification?.data?.url || ""); if (h) handler(h);
    }),
  ];
  return () => subs.forEach(p => p.then(s => s.remove()).catch(() => {}));
}

// One-time setup when the iPhone app starts.
export function initNative(theme) {
  if (!isNative) return;
  document.documentElement.classList.add("native");
  setStatusBarTheme(theme);
  // Never leave the splash up if something goes wrong while loading.
  setTimeout(hideSplash, 6000);
  // Outside web pages (Terms, Privacy, photo credits…) open in an in-app Safari sheet instead of
  // replacing the app, so there's always a Done button back.
  document.addEventListener("click", e => {
    const a = e.target.closest?.("a[href]");
    if (!a || e.defaultPrevented) return;
    const href = a.href;
    if (/^https?:/i.test(href) && !href.startsWith(window.location.origin)) {
      e.preventDefault();
      Browser.open({ url: href, presentationStyle: "popover" }).catch(() => {});
    }
  }, true);
}
