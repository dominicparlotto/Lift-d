# Gym App

A mobile-style fitness app (React + Vite) with four tabs: Nutrition, Feed (social), Workout, Profile.

## Stack
- React 18, Vite
- No router/state library — state is local `useState` in `App.jsx`, passed down as props
- Backend: **Supabase** (project `liftd`, id `hzkoebfqglgcijibuuou`, region us-east-2). Auth = Supabase email/password; data in Postgres with Row Level Security on every table; profile photos in the public `avatars` storage bucket (`<user id>/...`). Client is `src/lib/supabase.js` (publishable key only — never a secret/service_role key).
- `App.jsx` owns the Supabase session and the loaded `user` object, and passes `actions` (logWorkout, addFood, createPost, toggleFollow, updateProfile, changePassword, signOut, …) to the tabs. All DB reads/writes live in `src/lib/api.js`, which maps rows to the shapes the components use.
- Schema (see Supabase migrations): profiles (auto-created by trigger on sign-up), workout_entries, food_entries, posts, follows, friend_adds, saved_clips, blocks, gyms, gym_members, gym_channels, messages, gym_checkins, reports; RPCs `is_username_available`, `delete_my_account`. Change the schema via new migrations, then re-run the Supabase security advisors.
- New accounts start empty; stats, PRs and badges are derived from logged data. `src/data/` holds static reference data (exercise list, food DB, badge definitions) plus the remaining mock gym communities (gyms/chat/"who's training" are not wired to the backend yet).
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
  - `ClipsView.jsx` — short-video-style clip feed used inside Social
  - `WorkoutTab.jsx` — exercise picker/logger against `WORKOUTS`
  - `ProfileTab.jsx` — profile, badges, PR announcements, settings
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
