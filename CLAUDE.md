# Gym App

A mobile-style fitness app (React + Vite) with four tabs: Nutrition, Feed (social), Workout, Profile.

## Stack
- React 18, Vite
- No router/state library — state is local `useState` in `App.jsx`, passed down as props
- No backend — user accounts and everything they log (posts, workouts, food, profile) are stored in the browser's `localStorage` via `src/utils/accounts.js`. `App.jsx` owns `accounts` + the session; tabs read `user` and write through `updateUser(patch)`. Passwords are salted PBKDF2 hashes (still client-side only — a real launch needs server auth).
- New accounts start empty (`EMPTY_DATA`); stats, PRs and badges are derived from logged data. `src/data/` holds static reference data (exercise list, food DB, badge definitions) plus the remaining mock gym communities.
- Styling is a single global stylesheet (`src/styles.css`), plain CSS custom properties (dark theme), no CSS framework

## Structure
- `src/App.jsx` — root component, owns `user`/`tab`/`savedClips` state, renders the active tab + bottom nav
- `src/components/` — one file per screen/section:
  - `AuthScreen.jsx` — login/signup flow shown when `user` is null
  - `NutritionTab.jsx` — food logging against `FOOD_DB_INIT`
  - `SocialTab.jsx` — feed of posts + gyms, renders `ClipsView`
  - `ClipsView.jsx` — short-video-style clip feed used inside Social
  - `WorkoutTab.jsx` — exercise picker/logger against `WORKOUTS`
  - `ProfileTab.jsx` — profile, badges, PR announcements, settings
- `src/data/` — static mock data (`foodDb.js`, `workouts.js`, `badges.js`, `social.js`)
- `src/utils/helpers.js` — small pure helpers (food math, date keys/current week, `bestSets`/`trainingStats`, avatar image cropping)
- `src/utils/accounts.js` — account store (localStorage), password rules + hashing, username/email validation

## Commands
- `npm install` — install dependencies
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview the build

## Notes
- This was split out of a single ~1000-line JSX prototype file into proper components/data/utils — behavior should be unchanged from the original, just reorganized.
- All styling is inline `style={{...}}` for one-off layout plus CSS classes (defined in `styles.css`) for reusable/animated pieces. When adding new UI, follow whichever pattern is already used nearby.
