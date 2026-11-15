// Sends push notifications for Lift'd.
//  - {action:"public_key"}  → returns the VAPID public key browsers need to subscribe (public, no auth).
//  - {notification_id}        → called by the database (pg_net) when a notification is created; must carry the
//                               shared x-push-secret header. Pushes it to every device the recipient turned push on for:
//                               browsers via Web Push (push_subscriptions) and the iPhone app via Apple (native_push_tokens).
// VAPID keys are generated on first use and stored server-side (private.app_config); the private key never leaves the server.
// Apple push needs these Edge Function secrets (Supabase dashboard → Edge Functions → Secrets):
//   APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the whole .p8 file), optional APNS_BUNDLE_ID (default com.joinliftd.app).
// Without them, iPhone pushes are skipped and Web Push still works.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import * as webpush from "jsr:@negrel/webpush@0.5.0";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

type Setup = { secret: string; publicKey: string; server: webpush.ApplicationServer };
let cached: Setup | null = null;

async function setup(): Promise<Setup> {
  if (cached) return cached;
  const { data: cfg, error } = await admin.rpc("push_get_config");
  if (error) throw error;
  let exported = cfg?.vapid;
  if (!exported) {
    // First run: make the keys and store them (if two requests race, the first stored pair wins).
    const fresh = await webpush.generateVapidKeys({ extractable: true });
    const { error: setErr } = await admin.rpc("push_set_vapid", { keys: await webpush.exportVapidKeys(fresh) });
    if (setErr) throw setErr;
    const { data: again, error: againErr } = await admin.rpc("push_get_config");
    if (againErr) throw againErr;
    exported = again.vapid;
  }
  const vapidKeys = await webpush.importVapidKeys(exported, { extractable: false });
  const server = await webpush.ApplicationServer.new({ contactInformation: "https://joinliftd.com", vapidKeys });
  cached = { secret: cfg.webhook_secret, publicKey: await webpush.exportApplicationServerKey(vapidKeys), server };
  return cached;
}

// ---------- Apple Push Notification service (iPhone app) ----------
const APNS = {
  keyId: Deno.env.get("APNS_KEY_ID"),
  teamId: Deno.env.get("APNS_TEAM_ID"),
  privateKey: Deno.env.get("APNS_PRIVATE_KEY"),
  bundleId: Deno.env.get("APNS_BUNDLE_ID") || "com.joinliftd.app",
};
const apnsConfigured = () => !!(APNS.keyId && APNS.teamId && APNS.privateKey);
const b64url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
let apnsJwt: { token: string; at: number } | null = null;

// Apple wants a fresh ES256-signed token at most every hour (and no more than every 20 minutes).
async function apnsAuth(): Promise<string> {
  if (apnsJwt && Date.now() - apnsJwt.at < 45 * 60 * 1000) return apnsJwt.token;
  const pem = APNS.privateKey!.replace(/\\n/g, "\n").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)));
  const unsigned = `${enc({ alg: "ES256", kid: APNS.keyId })}.${enc({ iss: APNS.teamId, iat: Math.floor(Date.now() / 1000) })}`;
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned)));
  apnsJwt = { token: `${unsigned}.${b64url(sig)}`, at: Date.now() };
  return apnsJwt.token;
}

async function apnsSend(token: string, env: string, payload: unknown, collapseId: string) {
  const host = env === "sandbox" ? "api.sandbox.push.apple.com" : "api.push.apple.com";
  const res = await fetch(`https://${host}/3/device/${token}`, {
    method: "POST",
    headers: {
      authorization: `bearer ${await apnsAuth()}`,
      "apns-topic": APNS.bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "apns-expiration": String(Math.floor(Date.now() / 1000) + 86400),
      "apns-collapse-id": collapseId.slice(0, 64),
    },
    body: JSON.stringify(payload),
  });
  const reason = res.ok ? null : (await res.json().catch(() => ({})))?.reason ?? null;
  return { status: res.status, reason };
}

// Tokens from Xcode/debug builds only work on Apple's sandbox server, App Store/TestFlight ones on production.
// Try the environment we last saw working, switch if Apple says the token belongs to the other one.
async function sendToIphone(row: { token: string; environment: string }, payload: unknown, collapseId: string) {
  const other = row.environment === "sandbox" ? "production" : "sandbox";
  let r = await apnsSend(row.token, row.environment, payload, collapseId);
  if (r.status === 400 && r.reason === "BadDeviceToken") {
    r = await apnsSend(row.token, other, payload, collapseId);
    if (r.status === 200) await admin.from("native_push_tokens").update({ environment: other }).eq("token", row.token);
  }
  if (r.status === 200) return "sent";
  if (r.status === 410 || (r.status === 400 && r.reason === "BadDeviceToken")) {
    await admin.from("native_push_tokens").delete().eq("token", row.token); // app deleted or token expired
    return "removed";
  }
  console.error("apns failed", r.status, r.reason);
  return "failed";
}

const clip = (t: string | null | undefined, n = 80) => (t ?? "").length > n ? (t ?? "").slice(0, n - 1) + "…" : (t ?? "");

function message(n: any) {
  const who = n.actor?.username ? `@${n.actor.username}` : "Someone";
  switch (n.type) {
    case "like": return { body: `${who} liked your post${n.post?.content ? `: \"${clip(n.post.content, 60)}\"` : ""}`, url: `/app/#post=${n.post_id}` };
    case "comment": return { body: `${who} commented: \"${clip(n.body)}\"`, url: `/app/#post=${n.post_id}` };
    case "follow": return { body: `${who} started following you`, url: `/app/#user=${n.actor_id}` };
    case "follow_request": return { body: `${who} wants to follow you`, url: `/app/#requests` };
    case "follow_accepted": return { body: `${who} accepted your follow request`, url: `/app/#user=${n.actor_id}` };
    case "report": return { body: `New report — ${clip(n.body, 60)}. Review it in Settings → Reports.`, url: `/app/#reports` };
    // Message requests (body is null) don't show the text, just who it's from.
    case "dm": return { body: n.body ? `${who}: ${clip(n.body, 120)}` : `${who} wants to send you a message`, url: `/app/#dm=${n.actor_id}` };
    default: return { body: "You have a new notification", url: "/app/" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const s = await setup();
    if (body.action === "public_key") return json({ publicKey: s.publicKey });

    if (!s.secret || req.headers.get("x-push-secret") !== s.secret) return json({ error: "unauthorized" }, 401);
    if (!body.notification_id) return json({ error: "missing notification_id" }, 400);

    const { data: n, error } = await admin.from("notifications")
      .select("*, actor:profiles!notifications_actor_id_fkey(username), post:posts(content)")
      .eq("id", body.notification_id).maybeSingle();
    if (error) throw error;
    if (!n) return json({ sent: 0 });

    const { body: text, url } = message(n);
    const title = n.type === "report" ? "Lift'd · Moderation" : "Lift'd";
    const tag = `${n.type}:${n.post_id ?? n.actor_id}`;
    const payload = JSON.stringify({ title, body: text, url, tag });
    const { data: subs, error: subErr } = await admin.from("push_subscriptions").select("*").eq("user_id", n.user_id);
    if (subErr) throw subErr;

    let sent = 0, removed = 0, failed = 0;
    for (const sub of subs ?? []) {
      try {
        await s.server.subscribe({ endpoint: sub.endpoint, keys: { auth: sub.auth, p256dh: sub.p256dh } })
          .pushTextMessage(payload, { ttl: 86400, urgency: webpush.Urgency.High });
        sent++;
      } catch (e: any) {
        const status = e?.response?.status;
        if (status === 404 || status === 410) {
          // The browser unsubscribed or the subscription expired — forget it.
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
          removed++;
        } else {
          failed++;
          console.error("push failed", status, String(e));
        }
      }
    }

    // iPhone app.
    if (apnsConfigured()) {
      const { data: phones, error: phoneErr } = await admin.from("native_push_tokens").select("token, environment").eq("user_id", n.user_id);
      if (phoneErr) console.error(phoneErr);
      const apsPayload = { aps: { alert: { title, body: text }, sound: "default", "thread-id": n.type }, url };
      for (const row of phones ?? []) {
        try {
          const r = await sendToIphone(row, apsPayload, tag);
          if (r === "sent") sent++; else if (r === "removed") removed++; else failed++;
        } catch (e) { failed++; console.error("apns error", String(e)); }
      }
    }
    return json({ sent, removed, failed });
  } catch (e) {
    console.error(e);
    return json({ error: "failed" }, 500);
  }
});
