# Lift'd — App Store Connect listing

Copy each field into App Store Connect → your app. Character limits are checked.

## App information

| Field | Value |
|---|---|
| Name (≤30) | `Lift'd: Gym Crew & Form Clips` (29) |
| Subtitle (≤30) | `Workout log, form tips & PRs` (28) |
| Bundle ID | `com.joinliftd.app` |
| SKU | `liftd-ios-1` |
| Primary category | Health & Fitness |
| Secondary category | Social Networking |
| Content rights | **Yes**, it contains third-party content: the learning clips are free-licence stock video from Pexels and Mixkit, credited on each clip. You have the rights to use them. |
| Copyright | `2026 Lift'd` (use your LLC's name once it exists) |
| Price | Free, no in-app purchases |
| Devices | iPhone only (iPad is switched off in the Xcode project, so no iPad screenshots are needed) |

## URLs

| Field | Value |
|---|---|
| Privacy Policy URL | https://joinliftd.com/privacy/ |
| Support URL | https://joinliftd.com/support/ |
| Marketing URL | https://joinliftd.com/ |

## Promotional text (≤170, can be changed any time without review)

> Find your gym crew. See who's training right now, learn proper form from short coaching clips, log every lift and post your PRs. Free.

## Description (≤4000)

> Stop lifting alone in a gym full of people. Lift'd is the free workout app built around your gym: learn proper form from short clips, log every lift, and grow with the people you already see on the gym floor.
>
> YOUR GYM'S OWN COMMUNITY
> • Find your gym and join in one tap, or add it and become its founding member
> • Group chat with channels for your gym
> • Check in when you arrive and see who's training right now
> • Weekly gym leaderboards for volume, miles and training streaks
> • Add workout buddies when you both add each other
>
> LEARN BETWEEN SETS
> • Short form clips with on-screen coaching cues
> • Filter by muscle group, skill level and equipment
> • A ▶ Form button right in your workout log for exercises with a clip
> • Save clips for your next session
>
> TRACK EVERY LIFT
> • 170+ exercises across 10 categories, plus your own custom exercises
> • Your PRs, streaks and badges update automatically
> • Running and cardio logged as miles and minutes
> • Optional macro tracking with calorie and protein targets for your goal
> • Pounds or kilograms, miles or kilometres
>
> POST YOUR GAINS
> • Post photos, videos and PRs to your profile and the feed
> • Turn a PR into a story card for Instagram or TikTok in one tap
> • Likes, comments, follows and direct messages
> • Private account option: only followers you approve see your posts
>
> SAFE BY DESIGN
> • Zero tolerance for harassment and objectionable content
> • Report any post, comment, message or profile; reports are reviewed within 24 hours
> • Block anyone, everywhere, in one tap
> • Automatic filter for slurs and profanity
> • Message requests: people you don't follow can't land in your inbox uninvited
> • Delete your account and data from Settings at any time
>
> No ads. We never sell your data.
>
> Lift'd gives general fitness and nutrition information, not medical advice. Talk to a doctor before starting a new exercise or diet programme.
>
> Terms of Use: https://joinliftd.com/terms/
> Privacy Policy: https://joinliftd.com/privacy/

## Keywords (≤100, comma-separated, no spaces)

```
lifting,weightlifting,tracker,exercise,fitness,macros,buddy,beginner,strength,training,partner,squat
```
(100 characters. Words already in the name and subtitle, like gym, crew, form, clips, workout, log, tips and PRs, are indexed anyway, so they aren't repeated.)

## Screenshots

Required: **6.9" iPhone, 1320 × 2868** (Apple scales these down for smaller iPhones). 3–10 images. Taken from the iOS Simulator (iPhone 17 Pro Max) signed in as the demo account, so they show real app screens:

1. Gym room: chat with "who's training now"
2. Clips: a form clip with a coaching cue on screen
3. Workout log: an exercise with sets and the ▶ Form button
4. Profile: PRs and badges
5. Feed: posts from the gym crew
6. PR story card share sheet
7. Nutrition: today's macros against targets

## Age rating questionnaire

| Question | Answer |
|---|---|
| Parental controls | No |
| Age assurance | No (sign-up requires confirming you're 13+) |
| Unrestricted web access | No |
| User-generated content | **Yes** |
| Messaging and chat | **Yes** |
| Advertising | No |
| Cartoon or fantasy violence | None |
| Realistic violence | None |
| Prolonged graphic or sadistic violence | None |
| Profanity or crude humour | None (filtered, and against the rules) |
| Mature or suggestive themes | None |
| Horror or fear themes | None |
| Medical or treatment information | None |
| Health or wellness topics | **Yes** (fitness and nutrition targets) |
| Alcohol, tobacco or drug use or references | None |
| Sexual content or nudity | None |
| Simulated gambling / gambling / contests / loot boxes | None / No |

Apple works out the rating from these answers. Our Terms require users to be 13+. If Apple's result comes out lower than 13+, choose 13+ in the age-rating override so the store matches the Terms.

## App Privacy ("nutrition label")

**Do you or your third-party partners collect data from this app?** Yes.
**Is any data used to track users?** No (for every type below).
**Purpose for every type:** App Functionality only. **Linked to the user's identity:** Yes, for every type.

| Category | Data type | What it is in Lift'd |
|---|---|---|
| Contact Info | Name | Profile name |
| Contact Info | Email Address | Sign-in email |
| Health & Fitness | Health | Optional body stats for nutrition targets (height, weight, sex, birth year). Private to the user. |
| Health & Fitness | Fitness | Workouts, sets, distances, foods logged |
| User Content | Photos or Videos | Profile photo, photo and video posts |
| User Content | Emails or Text Messages | Direct messages and gym chat |
| User Content | Customer Support | Feedback sent from Settings (includes device type) |
| User Content | Other User Content | Posts, comments, bio, location typed on the profile, gyms |
| Identifiers | User ID | Account ID |

**Not collected:** location (GPS), contacts, browsing or search history, purchases, financial info, usage analytics, crash or performance diagnostics, advertising data, sensitive info, device ID. Push tokens are used only to deliver notifications, which Apple doesn't count as collection.

These match the Privacy Policy and the privacy manifest in the Xcode project (`ios/App/App/PrivacyInfo.xcprivacy`).

## App Review information

**Sign-in required:** Yes. Demo account: *(fill in after it's created and seeded)*

- Email: `__________`
- Password: `__________`

**Notes for the reviewer** (paste into "Notes"):

> Thank you for reviewing Lift'd, a free gym community and workout-tracking app.
>
> DEMO ACCOUNT: the account above already has logged workouts, PRs, posts, a gym with chat and leaderboard, and follows. Tabs: Nutrition, Feed (posts and Clips), Community (gyms), Workout, Profile.
>
> USER-GENERATED CONTENT (Guideline 1.2). Lift'd has posts, comments, gym chat and direct messages, with these safeguards:
> • Terms: sign-up requires agreeing to the Terms of Use (zero tolerance for objectionable content and abusive users) and confirming the user is 13+.
> • Filtering: slurs and profanity are blocked in usernames, posts, comments, chat and messages, on the server.
> • Reporting: the ⋯ menu on any post, clip, profile or gym chat message has "Report"; comments have a Report button; tap a direct message to report it.
> • Blocking: ⋯ → Block on any profile, post or message. It removes the user from the blocker's feed, search, chats and follows, both ways. Settings → Blocked Accounts lists blocked users.
> • Message requests: a first message from someone the recipient doesn't follow goes to Requests (text hidden) until accepted.
> • Moderation: every report notifies our moderators, who act within 24 hours: removing content and banning accounts (signed out everywhere, content hidden).
>
> ACCOUNT DELETION (5.1.1(v)): Profile → Settings tab → Delete Account (at the bottom) permanently deletes the account and its data in the app.
>
> HEALTH: workouts and nutrition targets are general information. The app and Terms show a "not medical advice" note. We don't use HealthKit.
>
> CONTENT RIGHTS: the "Lift'd Learn" form clips are free-licence stock videos from Pexels and Mixkit, credited on each clip, with our own coaching-cue overlay.
>
> PUSH: notifications are optional (Profile → Settings tab → Push Notifications) and only cover likes, comments, follows and messages.
>
> Contact: support@joinliftd.com
