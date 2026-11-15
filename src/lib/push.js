import * as api from "./api";
import { isNative } from "./native";
import { PushNotifications } from "@capacitor/push-notifications";

// Push notifications for this device. The server function (send-push) does the actual sending:
//  - website: Web Push (iPhone/iPad only allow it when Lift'd is opened from the Home Screen, iOS 16.4+)
//  - iPhone app: Apple Push Notification service — the device token is saved in native_push_tokens.

const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true;

const TOKEN_KEY = "liftd.apnsToken"; // the token this device saved for the signed-in account
const savedToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
const rememberToken = t => { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* storage unavailable */ } };
let nativePermission = "prompt"; // updated by isPushOn / enablePush

// "ok" | "unsupported" | "needs-install" (iPhone browser tab) | "denied" (blocked in browser / iPhone settings)
export function pushSupport() {
  if (isNative) return nativePermission === "denied" ? "denied" : "ok";
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

// Ask Apple for this device's push token.
function nativeToken() {
  return new Promise((resolve, reject) => {
    const subs = [];
    const done = fn => v => { clearTimeout(timer); subs.forEach(p => p.then(s => s.remove())); fn(v); };
    const timer = setTimeout(done(reject), 20000, new Error("timeout"));
    subs.push(PushNotifications.addListener("registration", done(t => resolve(t.value))));
    subs.push(PushNotifications.addListener("registrationError", done(e => reject(new Error(e?.error || "registration failed")))));
    PushNotifications.register().catch(done(reject));
  });
}

// Is push on for this device? (permission granted AND saved for this account)
export async function isPushOn() {
  if (isNative) {
    nativePermission = (await PushNotifications.checkPermissions()).receive;
    const token = savedToken();
    return nativePermission === "granted" && !!token && await api.hasNativePushToken(token).catch(() => false);
  }
  if (pushSupport() !== "ok") return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  return !!sub && await api.hasPushSubscription(sub.endpoint).catch(() => false);
}

export async function enablePush() {
  if (isNative) {
    nativePermission = (await PushNotifications.requestPermissions()).receive;
    if (nativePermission !== "granted") throw new Error(nativePermission === "denied" ? "denied" : "dismissed");
    const token = await nativeToken();
    await api.saveNativePushToken(token);
    rememberToken(token);
    return;
  }
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
  if (isNative) {
    const token = savedToken();
    if (token) await api.deleteNativePushToken(token).catch(() => {});
    rememberToken(null);
    return;
  }
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await api.deletePushSubscription(sub.endpoint).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

// iPhone app start-up: Apple can change a device's token, so if push is on, re-register and save the current one.
export async function refreshNativePush() {
  if (!isNative || !savedToken()) return;
  try {
    if ((await PushNotifications.checkPermissions()).receive !== "granted") return;
    const token = await nativeToken();
    if (token !== savedToken()) {
      await api.deleteNativePushToken(savedToken()).catch(() => {});
      await api.saveNativePushToken(token);
      rememberToken(token);
    }
  } catch (e) { console.error("push refresh failed", e); }
}
