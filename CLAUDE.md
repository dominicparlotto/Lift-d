# Gym App

A mobile-style fitness app (React + Vite) with four tabs: Nutrition, Feed (social), Workout, Profile.

## Stack
- React 18, Vite
- No router/state library — state is local `useState` in `App.jsx`, passed down as props
- No backend — all data is mock data in `src/data/`
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
- `src/utils/helpers.js` — small pure helpers (`scaleFood`, `sumLog`, `makeInvite`)

## Commands
- `npm install` — install dependencies
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview the build

## Notes
- This was split out of a single ~1000-line JSX prototype file into proper components/data/utils — behavior should be unchanged from the original, just reorganized.
- All styling is inline `style={{...}}` for one-off layout plus CSS classes (defined in `styles.css`) for reusable/animated pieces. When adding new UI, follow whichever pattern is already used nearby.
