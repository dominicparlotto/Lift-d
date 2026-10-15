import * as api from "./api";

// Web Push for this device/browser. The server function (send-push) does the actual sending.
// iPhone/iPad only allow web push when Lift'd is opened from the Home Screen (iOS 16.4+).

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

// "ok" | "unsupported" | "needs-install" (iPhone browser tab) | "denied" (blocked in browser settings)
export function pushSupport() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  if (isIOS() && !isStandalone()) return "needs-install";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

const keyBytes = b64 => {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, c => c.charCodeAt(0));
};

async function registration() {
  return (await navigator.serviceWorker.getRegistration("/")) || navigator.serviceWorker.register("/sw.js");
}

// Is push on for this device? (subscribed in the browser AND saved for this account)
export async function isPushOn() {
  if (pushSupport() !== "ok") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return !!sub && await api.hasPushSubscription(sub.endpoint).catch(() => false);
}

export async function enablePush() {
  const support = pushSupport();
  if (support !== "ok") throw new Error(support);
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error(permission === "denied" ? "denied" : "dismissed");
  const reg = await registration();
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(await api.getPushPublicKey()) });
  await api.savePushSubscription(sub);
}

export async function disablePush() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api.deletePushSubscription(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}
