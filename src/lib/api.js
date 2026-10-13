import { supabase } from "./supabase";

// Data layer: every read/write to Supabase goes through here, converting between database rows
// (snake_case) and the shapes the components already use.

function check({ data, error }) { if (error) throw error; return data; }

export const toProfile = p => ({ id: p.id, name: p.name, username: p.username, bio: p.bio, location: p.location, skill: p.skill, avatar: p.avatar_url, createdAt: Date.parse(p.created_at) });
const toWorkout = r => ({ id: r.id, exercise: r.exercise, group: r.muscle_group, sets: r.sets, loggedAt: Date.parse(r.logged_at) });
const toFood = r => ({ id: r.id, name: r.name, grams: +r.grams, calories: +r.calories, protein: +r.protein, carbs: +r.carbs, fat: +r.fat });
const toPost = r => ({ id: r.id, content: r.content, hasVideo: r.has_video, createdAt: Date.parse(r.created_at), muscle: r.muscle, skill: r.skill, equipment: r.equipment, authorId: r.user_id });
const byDay = (rows, convert) => rows.reduce((acc, r) => { (acc[r.day] ||= []).push(convert(r)); return acc; }, {});

// Everything the signed-in user's screens need, shaped like the app's `user` object.
export async function loadUserData(authUser) {
  const uid = authUser.id;
  const [profile, workouts, food, posts, following, followersCount, saved] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", uid).single().then(check),
    supabase.from("workout_entries").select("*").eq("user_id", uid).order("logged_at").then(check),
    supabase.from("food_entries").select("*").eq("user_id", uid).order("created_at").then(check),
    supabase.from("posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).then(check),
    supabase.from("follows").select("following_id").eq("follower_id", uid).then(check),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", uid).then(r => { if (r.error) throw r.error; return r.count || 0; }),
    supabase.from("saved_clips").select("clip_id").eq("user_id", uid).then(check),
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
  };
}

// Newest posts from everyone (blocked users are filtered out by the database).
export async function loadFeed() {
  const rows = check(await supabase.from("posts").select("*, author:profiles(*)").order("created_at", { ascending: false }).limit(100));
  return rows.filter(r => r.author).map(r => ({ ...toPost(r), author: toProfile(r.author) }));
}

export const isUsernameAvailable = name => supabase.rpc("is_username_available", { p_username: name.trim() }).then(check);

export const insertWorkout = (day, { exercise, group, sets }) =>
  supabase.from("workout_entries").insert({ day, exercise, muscle_group: group, sets }).select().single().then(check).then(toWorkout);

export const insertFood = (day, f) =>
  supabase.from("food_entries").insert({ day, name: f.name, grams: f.grams, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat }).select().single().then(check).then(toFood);
export const deleteFood = id => supabase.from("food_entries").delete().eq("id", id).then(check);

export const insertPost = p =>
  supabase.from("posts").insert({ content: p.content, has_video: !!p.hasVideo, muscle: p.muscle || "All", skill: p.skill || "All", equipment: p.equipment || "All" }).select().single().then(check).then(toPost);

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
