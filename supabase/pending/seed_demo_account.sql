-- Fills the App Store reviewer demo account with realistic data so the app isn't empty during review.
-- 1. Create the account in the app yourself (sign up, confirm the email).
-- 2. Put its email below, then run this with the Supabase MCP / SQL editor (it runs as the database owner).
-- Safe to re-run: it clears the demo account's own workouts, food, posts and demo gym first.
do $$
declare
  v_email text := 'REPLACE_WITH_DEMO_EMAIL';
  me uuid;
  gym uuid;
  chan uuid;
  d date;
  wk int;
  dow int;
  bump numeric;
begin
  select id into me from auth.users where lower(email) = lower(v_email);
  if me is null then raise exception 'No account with email %', v_email; end if;

  -- Profile (username is left as chosen at sign-up).
  update public.profiles set name = 'Alex Rivera', bio = 'Getting stronger one set at a time. Push/pull/legs, 5 days a week.',
    location = 'Austin, TX', skill = 'Intermediate' where id = me;

  -- Body stats + goal (private, used for the nutrition targets).
  insert into public.nutrition_settings (user_id, sex, birth_year, height_cm, weight_kg, activity, units, goal, weight_updated_at, updated_at)
  values (me, 'male', 1997, 180, 81, 'moderate', 'imperial', 'bulk', now(), now())
  on conflict (user_id) do update set sex = excluded.sex, birth_year = excluded.birth_year, height_cm = excluded.height_cm,
    weight_kg = excluded.weight_kg, activity = excluded.activity, units = excluded.units, goal = excluded.goal,
    weight_updated_at = now(), updated_at = now();

  delete from public.workout_entries where user_id = me;
  delete from public.food_entries where user_id = me;
  delete from public.posts where user_id = me;
  delete from public.gyms where created_by = me and name = 'Lift''d Demo Gym';

  -- Six weeks of Mon–Fri training (push / pull / legs / upper / run), weights creeping up each week,
  -- so PRs, streaks, badges and the weekly chart all have something to show.
  for wk in 0..5 loop
    for dow in 0..4 loop
      d := date_trunc('week', current_date)::date - (5 - wk) * 7 + dow;
      continue when d > current_date;
      bump := wk * 5;
      if dow = 0 then
        insert into public.workout_entries (user_id, day, exercise, muscle_group, sets, logged_at) values
          (me, d, 'Barbell Bench Press', 'Chest', jsonb_build_array(jsonb_build_object('weight', 165 + bump, 'reps', 8), jsonb_build_object('weight', 175 + bump, 'reps', 6), jsonb_build_object('weight', 185 + bump, 'reps', 4)), d + time '18:05'),
          (me, d, 'Incline Dumbbell Press', 'Chest', jsonb_build_array(jsonb_build_object('weight', 55 + wk * 2.5, 'reps', 10), jsonb_build_object('weight', 55 + wk * 2.5, 'reps', 9)), d + time '18:25'),
          (me, d, 'Lateral Raise Dumbbell', 'Shoulders', jsonb_build_array(jsonb_build_object('weight', 20, 'reps', 15), jsonb_build_object('weight', 20, 'reps', 12)), d + time '18:40');
      elsif dow = 1 then
        insert into public.workout_entries (user_id, day, exercise, muscle_group, sets, logged_at) values
          (me, d, 'Conventional Deadlift', 'Back', jsonb_build_array(jsonb_build_object('weight', 275 + bump * 2, 'reps', 5), jsonb_build_object('weight', 295 + bump * 2, 'reps', 3)), d + time '18:05'),
          (me, d, 'Barbell Row', 'Back', jsonb_build_array(jsonb_build_object('weight', 145 + bump, 'reps', 8), jsonb_build_object('weight', 145 + bump, 'reps', 8)), d + time '18:25'),
          (me, d, 'Hammer Curl', 'Arms', jsonb_build_array(jsonb_build_object('weight', 35, 'reps', 12), jsonb_build_object('weight', 35, 'reps', 10)), d + time '18:45');
      elsif dow = 2 then
        insert into public.workout_entries (user_id, day, exercise, muscle_group, sets, logged_at) values
          (me, d, 'Barbell Back Squat', 'Legs', jsonb_build_array(jsonb_build_object('weight', 205 + bump * 2, 'reps', 6), jsonb_build_object('weight', 225 + bump * 2, 'reps', 5), jsonb_build_object('weight', 235 + bump * 2, 'reps', 3)), d + time '18:05'),
          (me, d, 'Romanian Deadlift', 'Back', jsonb_build_array(jsonb_build_object('weight', 185 + bump, 'reps', 8), jsonb_build_object('weight', 185 + bump, 'reps', 8)), d + time '18:30'),
          (me, d, 'Leg Press', 'Legs', jsonb_build_array(jsonb_build_object('weight', 360 + bump * 2, 'reps', 12)), d + time '18:45');
      elsif dow = 3 then
        insert into public.workout_entries (user_id, day, exercise, muscle_group, sets, logged_at) values
          (me, d, 'Barbell Overhead Press', 'Shoulders', jsonb_build_array(jsonb_build_object('weight', 105 + wk * 2.5, 'reps', 6), jsonb_build_object('weight', 110 + wk * 2.5, 'reps', 5)), d + time '18:05'),
          (me, d, 'Chin-Up', 'Back', jsonb_build_array(jsonb_build_object('weight', 0, 'reps', 10), jsonb_build_object('weight', 0, 'reps', 8)), d + time '18:20'),
          (me, d, 'Barbell Hip Thrust', 'Glutes', jsonb_build_array(jsonb_build_object('weight', 225 + bump * 2, 'reps', 10)), d + time '18:35');
      else
        insert into public.workout_entries (user_id, day, exercise, muscle_group, sets, logged_at) values
          (me, d, 'Running Outdoor', 'Cardio', jsonb_build_array(jsonb_build_object('miles', 3 + wk * 0.25, 'minutes', 27 + wk)), d + time '07:10');
      end if;
    end loop;
  end loop;

  -- Today's food (per-100 g values from src/data/foodDb.js, scaled to the portion).
  insert into public.food_entries (user_id, day, name, grams, calories, protein, carbs, fat) values
    (me, current_date, 'Greek yogurt plain 2%', 200, 200, 34, 12, 1.4),
    (me, current_date, 'Egg whole', 150, 233, 19.5, 1.5, 16.5),
    (me, current_date, 'Chicken breast skinless', 200, 330, 62, 0, 8),
    (me, current_date, 'White rice cooked', 250, 325, 6.8, 70, 0.8);

  -- Posts on the profile and in the feed.
  insert into public.posts (user_id, content, muscle, skill, equipment, created_at) values
    (me, 'Squat PR today 🏋️ Six weeks of PPL and it finally moved. Thanks to the 6am crew for the spot.', 'Legs', 'All', 'All', now() - interval '2 days'),
    (me, 'Tip that fixed my bench: squeeze the bar like you''re trying to bend it, and drive your feet into the floor.', 'Chest', 'All', 'All', now() - interval '6 days'),
    (me, 'First 3.5 mile run without stopping. Slowly becoming a cardio person 🏃', 'Cardio', 'All', 'All', now() - interval '10 days');

  -- A gym (the trigger makes the account its owner and adds #general), some chat, and a live check-in.
  insert into public.gyms (name, location, created_by) values ('Lift''d Demo Gym', 'Austin, TX', me) returning id into gym;
  select id into chan from public.gym_channels where gym_id = gym order by created_at limit 1;
  insert into public.messages (channel_id, user_id, content, created_at) values
    (chan, me, 'Welcome to the gym chat! Post your session plans here 💪', now() - interval '3 hours'),
    (chan, me, 'Legs tonight at 6. Anyone want to share a rack?', now() - interval '40 minutes');
  insert into public.gym_checkins (user_id, gym_id, muscle, checked_in_at) values (me, gym, 'Legs', now())
    on conflict (user_id) do update set gym_id = excluded.gym_id, muscle = excluded.muscle, checked_in_at = excluded.checked_in_at;
end $$;
