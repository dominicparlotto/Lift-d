import { supabase } from "./supabase";

// Data layer: every read/write to Supabase goes through here, converting between database rows
// (snake_case) and the shapes the components already use.

function check({ data, error }) { if (error) throw error; return data; }

export const toProfile = p => ({ id: p.id, name: p.name, username: p.username, bio: p.bio, location: p.location, skill: p.skill, avatar: p.avatar_url, createdAt: Date.parse(p.created_at) });
const toWorkout = r => ({ id: r.id, exercise: r.exercise, group: r.muscle_group, sets: r.sets, loggedAt: Date.parse(r.logged_at) });
const toFood = r => ({ id: r.id, name: r.name, grams: +r.grams, calories: +r.calories, protein: +r.protein, carbs: +r.carbs, fat: +r.fat });
const toPost = r => ({ id: r.id, content: r.content, hasVideo: r.has_video, mediaType: r.media_type || null, mediaUrl: r.media_url || null, mediaPath: r.media_path || null, createdAt: Date.parse(r.created_at), muscle: r.muscle, skill: r.skill, equipment: r.equipment, authorId: r.user_id, commentCount: commentCount(r) });
// Rows selected with `comments(count)` carry how many comments they have (only ones the viewer can see).
const commentCount = r => r.comments?.[0]?.count ?? 0;
const byDay = (rows, convert) => rows.reduce((acc, r) => { (acc[r.day] ||= []).push(convert(r)); return acc; }, {});

// Everything the signed-in user's screens need, shaped like the app's `user` object.
export async function loadUserData(authUser) {
  const uid = authUser.id;
  const [profile, workouts, food, posts, following, followersCount, saved, admin, nutrition, customExercises] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single().then(check),
    supabase.from("workout_entries").select("*").eq("user_id", uid).order("logged_at").then(check),
    supabase.from("food_entries").select("*").eq("user_id", uid).order("created_at").then(check),
    supabase.from("posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).then(check),
    supabase.from("follows").select("following_id").eq("follower_id", uid).then(check),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", uid).then(r => { if (r.error) throw r.error; return r.count || 0; }),
    supabase.from("saved_clips").select("clip_id").eq("user_id", uid).then(check),
    supabase.from("admins").select("user_id").eq("user_id", uid).maybeSingle().then(check),
    supabase.from("nutrition_settings").select("*").eq("user_id", uid).maybeSingle().then(check),
    supabase.from("custom_exercises").select("*").eq("user_id", uid).order("created_at").then(check),
  ]);
  return {
    ...toProfile(profile),
    email: authUser.email,
    workouts: byDay(workouts, toWorkout),
    food: byDay(food, toFood),
    posts: posts.map(toPost),
    following: following.map(f => f.following_id),
    followersCount,
    savedClips: saved.map(s => s.clip_id),
    isAdmin: !!admin,
    nutrition: toNutrition(nutrition),
    customExercises: customExercises.map(toCustomExercise),
  };
}

// In-app feedback: anyone can send; only admins can read (Feedback Inbox in Settings, or the Supabase dashboard).
export const sendFeedback = ({ category, message }) =>
  supabase.from("feedback").insert({ category, message, device: navigator.userAgent.slice(0, 300) }).then(check);
export async function loadFeedback() {
  const rows = check(await supabase.from("feedback").select("*, author:profiles(*)").order("created_at", { ascending: false }).limit(200));
  return rows.map(r => ({ id: r.id, category: r.category, message: r.message, device: r.device, createdAt: Date.parse(r.created_at), author: r.author ? toProfile(r.author) : null }));
}
export const deleteFeedback = id => supabase.from("feedback").delete().eq("id", id).then(check);

// Exercises the user added themselves (only they can see them).
const toCustomExercise = r => ({ id: r.id, group: r.muscle_group, name: r.name });
export const addCustomExercise = (group, name) =>
  supabase.from("custom_exercises").insert({ muscle_group: group, name }).select().single().then(check).then(toCustomExercise);
export const deleteCustomExercise = id => supabase.from("custom_exercises").delete().eq("id", id).then(check);

// Body stats + nutrition goal (private to the user). No row yet = no stats, generic targets.
const num = v => v == null ? null : +v;
const toNutrition = r => ({
  sex: r?.sex || null, birthYear: r?.birth_year || null, heightCm: num(r?.height_cm), weightKg: num(r?.weight_kg), activity: r?.activity || null,
  units: r?.units || "imperial", goal: r?.goal || "maintenance",
  custom: r?.custom_calories != null ? { cals: r.custom_calories, protein: r.custom_protein ?? 0, carbs: r.custom_carbs ?? 0, fat: r.custom_fat ?? 0 } : null,
  weightUpdatedAt: r?.weight_updated_at ? Date.parse(r.weight_updated_at) : null,
});
export const saveNutrition = (uid, n) =>
  supabase.from("nutrition_settings").upsert({
    user_id: uid, sex: n.sex, birth_year: n.birthYear, height_cm: n.heightCm, weight_kg: n.weightKg, activity: n.activity,
    units: n.units, goal: n.goal,
    custom_calories: n.custom?.cals ?? null, custom_protein: n.custom?.protein ?? null, custom_carbs: n.custom?.carbs ?? null, custom_fat: n.custom?.fat ?? null,
    weight_updated_at: n.weightUpdatedAt ? new Date(n.weightUpdatedAt).toISOString() : null, updated_at: new Date().toISOString(),
  }).select().single().then(check).then(toNutrition);

// Newest posts from everyone (blocked users are filtered out by the database).
export async function loadFeed() {
  const rows = check(await supabase.from("posts").select("*, author:profiles(*), comments(count)").order("created_at", { ascending: false }).limit(100));
  return rows.filter(r => r.author).map(r => ({ ...toPost(r), author: toProfile(r.author) }));
}

export const isUsernameAvailable = name => supabase.rpc("is_username_available", { p_username: name.trim() }).then(check);

export const insertWorkout = (day, { exercise, group, sets }) =>
  supabase.from("workout_entries").insert({ day, exercise, muscle_group: group, sets }).select().single().then(check).then(toWorkout);

export const insertFood = (day, f) =>
  supabase.from("food_entries").insert({ day, name: f.name, grams: f.grams, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }).select().single().then(check).then(toFood);
export const deleteFood = id => supabase.from("food_entries").delete().eq("id", id).then(check);

export const insertPost = p =>
  supabase.from("posts").insert({
    content: p.content, has_video: p.mediaType === "video", media_type: p.mediaType || null, media_path: p.mediaPath || null, media_url: p.mediaUrl || null,
    muscle: p.muscle || "All", skill: p.skill || "All", equipment: p.equipment || "All",
  }).select().single().then(check).then(toPost);

// Uploads a photo/video for a post into the user's own folder; returns where it lives.
export async function uploadPostMedia(uid, file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "") || (file.type.startsWith("video") ? "mp4" : "jpg");
  const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  check(await supabase.storage.from("post-media").upload(path, file, { contentType: file.type }));
  return { path, url: supabase.storage.from("post-media").getPublicUrl(path).data.publicUrl, mediaType: file.type.startsWith("video") ? "video" : "image" };
}
export const removePostMedia = path => supabase.storage.from("post-media").remove([path]).then(check);

export const follow = id => supabase.from("follows").insert({ following_id: id }).then(check);
export const unfollow = (uid, id) => supabase.from("follows").delete().eq("follower_id", uid).eq("following_id", id).then(check);

export const saveClip = id => supabase.from("saved_clips").insert({ clip_id: id }).then(check);
export const unsaveClip = (uid, id) => supabase.from("saved_clips").delete().eq("user_id", uid).eq("clip_id", id).then(check);

export const updateProfileRow = (uid, fields) =>
  supabase.from("profiles").update(fields).eq("id", uid).select().single().then(check).then(toProfile);

// Uploads a new profile photo (a JPEG data URL from the photo picker) and removes older ones.
// A new filename each time means browsers never show a stale cached photo.
export async function uploadAvatar(uid, dataUrl) {
  const blob = await (await fetch(dataUrl)).blob();
  const path = `${uid}/avatar-${Date.now()}.jpg`;
  check(await supabase.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg" }));
  await removeAvatars(uid, path);
  return supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
}
export async function removeAvatars(uid, keepPath) {
  const files = check(await supabase.storage.from("avatars").list(uid));
  const old = files.map(f => `${uid}/${f.name}`).filter(p => p !== keepPath);
  if (old.length) check(await supabase.storage.from("avatars").remove(old));
}

// ---------- Gyms ----------
export const CHECKIN_HOURS = 3; // a check-in counts as "training now" for this long
const activeSince = () => new Date(Date.now() - CHECKIN_HOURS * 3600e3).toISOString();
const toGym = g => ({ id: g.id, name: g.name, location: g.location, inviteCode: g.invite_code, createdBy: g.created_by, memberCount: g.gym_members?.[0]?.count ?? 0 });

// Every gym, with member count, how many are training now, and the signed-in user's role (null = not a member).
export async function loadGyms(uid) {
  const [gyms, mine, checkins] = await Promise.all([
    supabase.from("gyms").select("*, gym_members(count)").order("name").then(check),
    supabase.from("gym_members").select("gym_id, role").eq("user_id", uid).then(check),
    supabase.from("gym_checkins").select("gym_id").gte("checked_in_at", activeSince()).then(check),
  ]);
  const roles = Object.fromEntries(mine.map(m => [m.gym_id, m.role]));
  const live = checkins.reduce((acc, c) => { acc[c.gym_id] = (acc[c.gym_id] || 0) + 1; return acc; }, {});
  return gyms.map(g => ({ ...toGym(g), role: roles[g.id] || null, liveCount: live[g.id] || 0 }));
}
export async function loadGym(gymId, uid) {
  const [g, me] = await Promise.all([
    supabase.from("gyms").select("*, gym_members(count)").eq("id", gymId).single().then(check),
    supabase.from("gym_members").select("role").eq("gym_id", gymId).eq("user_id", uid).maybeSingle().then(check),
  ]);
  return { ...toGym(g), role: me?.role || null };
}
// The database trigger makes the creator the owner and adds a #general channel.
export const createGym = (name, location) => supabase.from("gyms").insert({ name, location }).select("id").single().then(check).then(g => g.id);
export const joinGym = gymId => supabase.from("gym_members").insert({ gym_id: gymId }).then(r => { if (r.error && r.error.code !== "23505") throw r.error; });
export const leaveGym = (uid, gymId) => supabase.from("gym_members").delete().eq("gym_id", gymId).eq("user_id", uid).then(check);
export async function findGymByInvite(code) {
  const rows = check(await supabase.from("gyms").select("id").eq("invite_code", code).limit(1));
  return rows[0]?.id || null;
}

// ---------- Channels + chat ----------
export const loadChannels = gymId => supabase.from("gym_channels").select("id, name").eq("gym_id", gymId).order("created_at").then(check);
export const createChannel = (gymId, name) => supabase.from("gym_channels").insert({ gym_id: gymId, name }).select("id, name").single().then(check);

const toMessage = m => ({ id: m.id, channelId: m.channel_id, content: m.content, createdAt: Date.parse(m.created_at), authorId: m.user_id, author: m.author ? toProfile(m.author) : null });
export async function loadMessages(channelId) {
  const rows = check(await supabase.from("messages").select("*, author:profiles(*)").eq("channel_id", channelId).order("created_at", { ascending: false }).limit(100));
  return rows.reverse().map(toMessage);
}
export const sendMessage = (channelId, content) => supabase.from("messages").insert({ channel_id: channelId, content }).select("*, author:profiles(*)").single().then(check).then(toMessage);
export const deleteMessage = id => supabase.from("messages").delete().eq("id", id).then(check);
export const fetchProfile = id => supabase.from("profiles").select("*").eq("id", id).single().then(check).then(toProfile);

// Live: calls onNew for every new message in this channel. Returns an unsubscribe function.
export function subscribeToMessages(channelId, onNew) {
  const ch = supabase.channel(`messages:${channelId}:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` }, p => onNew(toMessage(p.new)))
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ---------- "Who's training now" check-ins ----------
const toCheckin = r => ({ userId: r.user_id, gymId: r.gym_id, muscle: r.muscle, checkedInAt: Date.parse(r.checked_in_at), profile: r.profile ? toProfile(r.profile) : null });
export async function loadCheckins(gymId) {
  const rows = check(await supabase.from("gym_checkins").select("*, profile:profiles(*)").eq("gym_id", gymId).gte("checked_in_at", activeSince()).order("checked_in_at", { ascending: false }));
  return rows.filter(r => r.profile).map(toCheckin);
}
export async function loadMyCheckin(uid) {
  const r = check(await supabase.from("gym_checkins").select("*").eq("user_id", uid).gte("checked_in_at", activeSince()).maybeSingle());
  return r ? toCheckin(r) : null;
}
export const checkIn = (uid, gymId, muscle) => supabase.from("gym_checkins").upsert({ user_id: uid, gym_id: gymId, muscle, checked_in_at: new Date().toISOString() }).then(check);
export const checkOut = uid => supabase.from("gym_checkins").delete().eq("user_id", uid).then(check);
// Live: calls onChange whenever anyone checks in or out. Returns an unsubscribe function.
export function subscribeToCheckins(onChange) {
  const ch = supabase.channel(`checkins:${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "gym_checkins" }, () => onChange())
    .subscribe();
  return () => supabase.removeChannel(ch);
}

// ---------- Friends (mutual: connected once both people add each other) ----------
export async function loadFriendAdds(uid) {
  const rows = check(await supabase.from("friend_adds").select("user_id, friend_id"));
  return { added: rows.filter(r => r.user_id === uid).map(r => r.friend_id), addedMe: rows.filter(r => r.friend_id === uid).map(r => r.user_id) };
}
export const addFriend = id => supabase.from("friend_adds").insert({ friend_id: id }).then(r => { if (r.error && r.error.code !== "23505") throw r.error; });

export const loadLeaderboard = gymId => supabase.rpc("gym_leaderboard", { p_gym: gymId }).then(check)
  .then(rows => rows.map(r => ({ userId: r.user_id, username: r.username, name: r.name, avatar: r.avatar_url, volume: +r.volume })));

// ---------- Safety: block, report, delete ----------
export const blockUser = id => supabase.from("blocks").insert({ blocked_id: id }).then(r => { if (r.error && r.error.code !== "23505") throw r.error; });
export const unblockUser = (uid, id) => supabase.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", id).then(check);
export async function loadBlocked() {
  const rows = check(await supabase.from("blocks").select("created_at, profile:profiles!blocks_blocked_id_fkey(*)").order("created_at", { ascending: false }));
  return rows.filter(r => r.profile).map(r => toProfile(r.profile));
}
export const reportContent = ({ targetType, targetId, reason, details }) =>
  supabase.from("reports").insert({ target_type: targetType, target_id: targetId, reason, details: details || "" }).then(check);
export async function deletePost(id, mediaPath) {
  check(await supabase.from("posts").delete().eq("id", id));
  if (mediaPath) await removePostMedia(mediaPath).catch(() => {}); // the post is gone either way
}
// Removes the user's photos, then their account (every table cascades from it).
export async function deleteMyAccount(uid) {
  await removeAvatars(uid);
  const media = check(await supabase.storage.from("post-media").list(uid, { limit: 1000 }));
  if (media.length) check(await supabase.storage.from("post-media").remove(media.map(f => `${uid}/${f.name}`)));
  check(await supabase.rpc("delete_my_account"));
}

// ---------- Clips: curated learning clips + members' video posts ----------
// Both become one shape for the Clips feed. key is what saved_clips stores ("clip:<id>" / "post:<id>").
const clipUrl = path => supabase.storage.from("clips").getPublicUrl(path).data.publicUrl;
const toCuratedClip = c => ({
  key: `clip:${c.id}`, kind: "curated", id: c.id, title: c.title, description: c.description, videoUrl: clipUrl(c.video_path), videoPath: c.video_path,
  cues: c.cues || [], music: c.music_title ? { title: c.music_title, source: c.music_source || "" } : null, credit: c.credit,
  muscle: c.muscle, skill: c.skill, equipment: c.equipment, author: null, createdAt: Date.parse(c.created_at), isPublished: c.is_published,
  focusX: c.focus_x ?? 50, cuePosition: c.cue_position || "bottom", exercises: c.exercises || [], commentCount: commentCount(c),
});
const toPostClip = p => ({
  key: `post:${p.id}`, kind: "community", id: p.id, title: p.content, description: "", videoUrl: p.mediaUrl, videoPath: p.mediaPath,
  cues: [], music: null, credit: "", muscle: p.muscle, skill: p.skill, equipment: p.equipment, author: p.author, createdAt: p.createdAt,
  focusX: 50, cuePosition: "bottom", exercises: [], commentCount: p.commentCount,
});
export async function loadClips() {
  const [curated, posts] = await Promise.all([
    supabase.from("clips").select("*, comments(count)").order("created_at", { ascending: false }).limit(100).then(check),
    supabase.from("posts").select("*, author:profiles(*), comments(count)").eq("media_type", "video").order("created_at", { ascending: false }).limit(100).then(check),
  ]);
  const community = posts.filter(r => r.author && r.media_url).map(r => toPostClip({ ...toPost(r), author: toProfile(r.author) }));
  // Learning clips first, then the newest community videos.
  return [...curated.map(toCuratedClip), ...community];
}
export async function addCuratedClip({ file, title, description, muscle, skill, equipment, cues, musicTitle, musicSource, credit, focusX = 50, cuePosition = "bottom", exercises = [] }) {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const path = `${crypto.randomUUID()}.${ext}`;
  check(await supabase.storage.from("clips").upload(path, file, { contentType: file.type }));
  try {
    const row = check(await supabase.from("clips").insert({
      title, description, muscle, skill, equipment, video_path: path, cues,
      music_title: musicTitle || null, music_source: musicSource || null, credit: credit || "", focus_x: focusX, cue_position: cuePosition, exercises,
    }).select().single());
    return toCuratedClip(row);
  } catch (e) {
    await supabase.storage.from("clips").remove([path]); // don't leave an orphaned video behind
    throw e;
  }
}
export async function deleteCuratedClip(id, path) {
  check(await supabase.from("clips").delete().eq("id", id));
  await supabase.storage.from("clips").remove([path]).catch(() => {});
}
// Admin: edit a clip's framing (horizontal crop + where the cue sits) and which exercises it teaches.
export const updateClip = (id, { focusX, cuePosition, exercises }) =>
  supabase.from("clips").update({ focus_x: focusX, cue_position: cuePosition, exercises }).eq("id", id).then(check);
// Learning clips only (for the Workout tab's "▶ Form" buttons).
export const loadLearnClips = () =>
  supabase.from("clips").select("*").then(check).then(rows => rows.map(toCuratedClip));

// ---------- Comments (on posts and on curated clips) ----------
// item is a feed post or a clip; curated clips are commented on by clip id, everything else by post id.
const commentTarget = item => item.kind === "curated" ? { clip_id: item.id } : { post_id: item.id };
const toComment = c => ({ id: c.id, content: c.content, createdAt: Date.parse(c.created_at), authorId: c.user_id, author: c.author ? toProfile(c.author) : null });
export async function loadComments(item) {
  const [[col, id]] = Object.entries(commentTarget(item));
  const rows = check(await supabase.from("comments").select("*, author:profiles(*)").eq(col, id).order("created_at").limit(500));
  return rows.filter(r => r.author).map(toComment);
}
export const addComment = (item, content) =>
  supabase.from("comments").insert({ ...commentTarget(item), content }).select("*, author:profiles(*)").single().then(check).then(toComment);
export const deleteComment = id => supabase.from("comments").delete().eq("id", id).then(check);
