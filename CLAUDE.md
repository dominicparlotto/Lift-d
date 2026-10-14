# Gym App

A mobile-style fitness app (React + Vite) with four tabs: Nutrition, Feed (social), Workout, Profile.

## Stack
- React 18, Vite
- No router/state library — state is local `useState` in `App.jsx`, passed down as props
- Backend: **Supabase** (project `liftd`, id `hzkoebfqglgcijibuuou`, region us-east-2). Auth = Supabase email/password; data in Postgres with Row Level Security on every table; profile photos in the public `avatars` storage bucket (`<user id>/...`). Client is `src/lib/supabase.js` (publishable key only — never a secret/service_role key).
- `App.jsx` owns the Supabase session and the loaded `user` object, and passes `actions` (logWorkout, addFood, createPost, toggleFollow, updateProfile, changePassword, signOut, …) to the tabs. All DB reads/writes live in `src/lib/api.js`, which maps rows to the shapes the components use.
- Schema (see Supabase migrations): profiles (auto-created by trigger on sign-up), workout_entries, food_entries, posts, follows, friend_adds, saved_clips, blocks, gyms, gym_members, gym_channels, messages, gym_checkins, reports; RPCs `is_username_available`, `delete_my_account`. Change the schema via new migrations, then re-run the Supabase security advisors.
- New accounts start empty; stats, PRs and badges are derived from logged data. `src/data/` holds only static reference data (exercise list, food DB, badge definitions, skill tags); there is no mock user content.
- Gyms are real: anyone can find/join/create one; members get chat (live via Supabase Realtime on `messages`), a weekly-volume leaderboard (`gym_leaderboard` RPC — returns only per-member weekly totals, members only), and live "who's training" check-ins (`gym_checkins`, active for `CHECKIN_HOURS`). Invite links are `…/app/#join=<invite_code>` (handled in `App.jsx`, also on `hashchange`). Friends are mutual: connected when both `friend_adds` rows exist.
- Media + clips: posts can carry a photo/video (`posts.media_type/media_path/media_url`, files in the public `post-media` bucket under `<user id>/`, ≤50 MB, videos ≤3 min checked client-side). The Clips feed (`api.loadClips`) = curated learning clips (`clips` table + `clips` bucket, with on-screen `cues` and a `credit`) followed by members' video posts; it scrolls Reels-style (CSS scroll-snap for touch, one clip per wheel/trackpad gesture). The Feed also shows the curated clips (merged with posts by date), so everything in Clips is in the Feed; video cards there use the same `ReelVideo`/`CueBadge` (src/components/Reel.jsx) in a 4:5 frame, autoplay muted when on screen, and open in Clips on tap. Each clip has `focus_x` (horizontal crop, 0–100, keeps the lifter in a vertical frame) and `cue_position` (`top` for full-body shots, `bottom` for close-ups — cues must not cover the lifter); admins set both via "Adjust framing" in the clip's ⋯ menu or when adding a clip. Comments (`comments` table, on a post or a clip, RLS hides blocked users; owners of a post and admins can delete) open in `CommentsSheet`; comments can be reported (`reports.target_type = 'comment'`). Saved clips are stored as `clip:<id>` / `post:<id>` keys. Admins (`admins` table — grant only via SQL/dashboard; `private.is_admin()`) see "+ Add clip" in Clips. Library clips are free-license stock videos from Mixkit and Pexels (credit stored in `clips.credit`, e.g. "Video: <creator> / Pexels"; keep the coaching-cue overlay so they're not shown as bare stock, and never show the people in them in a bad light or as endorsing Lift'd).
- Nutrition goals: body stats + goal live in `nutrition_settings` (private — owner-only RLS, never on profiles; stored metric, shown in the user's units), loaded as `user.nutrition` and saved via `actions.saveNutrition`. Targets come from `src/utils/nutrition.js`: Mifflin-St Jeor × activity factor = maintenance; cut −20%, bulk +10%, with a calorie floor (1,500 male / 1,200 female); or the user's custom targets (goal `custom`). Without stats the generic `DEFAULT_TARGETS` are used. `GoalSettings.jsx` is the stats/custom sheet; the Nutrition tab asks for a fresh weight every 30 days.
- Custom exercises: users can add their own exercise to any muscle group (`custom_exercises`, owner-only RLS — never shared); loaded as `user.customExercises`, shown first in that group's list with a "Yours" tag. Removing one keeps already-logged workouts (entries store the exercise name).
- Password fields use `PasswordInput.jsx` (show/hide eye toggle) everywhere.
- Exercise-linked clips: `clips.exercises` (text[] of exercise names from `src/data/workouts.js`) — those exercises show "▶ Form" in the Workout log, opening `ClipPlayer` (Reel.jsx). Admins set links in Clips → ⋯ → Edit clip, or when adding a clip.
- Shareable PR card: `src/utils/prCard.js` draws a 1080×1920 story image on a canvas; `PRShare.jsx` previews it and uses the Web Share API (files) when available, else "Save image". Opened from Profile → PRs ("📸 Story") and the Workout tab's Personal Records (📤).
- Bottom nav: Nutrition, Feed (posts + Clips), Community (`CommunityTab.jsx` → GymList/GymRoom; gym invite links land here), Workout, Profile.
- Feedback: Settings → Send Feedback writes to `feedback` (insert-only for users; admins read it in Settings → Feedback Inbox, or Supabase Table Editor → feedback).
- Light/dark theme: Settings → Dark Mode. Colours are CSS variables in `:root` (dark) overridden by `:root[data-theme="light"]` in styles.css; choice saved per device (`src/utils/theme.js`, applied early by a script in app/index.html). Use `var(--text|--muted|--line|--fill|--surface|--bar)` for new UI instead of hard-coded white/navy, except on video overlays and gradient buttons.
- Safety (required for the App Store): Report (posts/messages → `reports`, review them in the Supabase dashboard), Block (two-way, enforced by RLS via `private.is_blocked_between`), Blocked Accounts list, and in-app Delete Account (`delete_my_account` RPC; photos removed first).
- Styling is a single global stylesheet (`src/styles.css`), plain CSS custom properties (dark theme), no CSS framework

## Structure
- `index.html` — public homepage: static HTML/CSS (no React) so search engines can read it; holds the SEO meta tags + structured data. Links into the app via `app/#signup` / `app/#signin`.
- `app/index.html` — the React app entry (marked `noindex`). Vite builds both pages (`build.rollupOptions.input` in `vite.config.js`); `base: "./"` keeps asset paths relative, so the build works at the domain root or any sub-path.
- `public/` — favicon, apple-touch-icon, link-preview image (`og-image.jpg`), `sitemap.xml`. Absolute URLs in `index.html` + `sitemap.xml` point at `https://joinliftd.com/` (custom domain on GitHub Pages; also referenced in `robots.txt` and baked into `og-image.jpg`).
- `src/App.jsx` — root component: Supabase session, loads the user's data, defines `actions`, renders the active tab + bottom nav
- `src/components/` — one file per screen/section:
  - `AuthScreen.jsx` — Supabase sign-in/sign-up/forgot-password screens, `NewPasswordScreen` (reset-link landing), `useUsernameStatus` hook
  - `NutritionTab.jsx` — food logging against `FOOD_DB_INIT`
  - `SocialTab.jsx` — feed of posts + gyms, renders `ClipsView`
  - `ClipsView.jsx` — vertical clip feed (curated + member videos), coaching-cue overlay, tap-to-play, admin `AddClipSheet`
  - `WorkoutTab.jsx` — exercise picker/logger against `WORKOUTS`
  - `ProfileTab.jsx` — profile, badges, PR announcements, settings (edit profile, change password, blocked accounts, delete account)
  - `GymCommunity.jsx` — `GymList` (find/join/create gyms) and `GymRoom` (chat, channels, leaderboard, invite link, live check-in count)
  - `WhoIsTraining.jsx` — live check-in card on the Workout tab, with mutual friend requests
  - `Moderation.jsx` — shared sheets: action menu, report, block, blocked accounts, delete account, `Avatar`
- `src/data/` — static mock data (`foodDb.js`, `workouts.js`, `badges.js`, `social.js`)
- `src/utils/helpers.js` — small pure helpers (food math, date keys/current week, `bestSets`/`trainingStats`, avatar image cropping)
- `src/utils/validation.js` — password rules, username format, friendly auth error messages
- `src/lib/` — `supabase.js` (client) and `api.js` (data access layer)

## Commands
- `npm install` — install dependencies
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview the build

## Notes
- This was split out of a single ~1000-line JSX prototype file into proper components/data/utils — behavior should be unchanged from the original, just reorganized.
- All styling is inline `style={{...}}` for one-off layout plus CSS classes (defined in `styles.css`) for reusable/animated pieces. When adding new UI, follow whichever pattern is already used nearby.
