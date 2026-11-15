# Getting Lift'd into the App Store

Steps marked **(you)** need your accounts, password or money. Everything else is already done in the code or is something Claude can do once you've finished your part.

## 1. This Mac (one time)

1. **(you)** Accept Xcode's licence. In Terminal, run the command below and enter your Mac password:
   ```bash
   sudo xcodebuild -license accept
   ```
2. **(you)** Open Xcode once. Let it install components, and if it asks, download the **iOS** platform (Xcode → Settings → Components).

## 2. Supabase

The project is paused, so the app can't load data until it's restored.

- **(you)** Supabase dashboard → project *liftd* → **Restore project**. If it refuses because the free quota is still used up, upgrade the organisation to **Pro ($25/month)**. You'll want Pro before launch anyway: free projects pause after a week without activity, and Pro adds daily backups.
- Then Claude applies `supabase/pending/native_push_tokens.sql`, deploys `supabase/functions/send-push`, and re-runs the security advisors.

## 3. Apple Developer Program ($99/year)

- **(you)** Enrol at developer.apple.com/programs.
  - **As an individual:** your own name shows as the seller. Approval is usually quick.
  - **As an organisation (your LLC):** the LLC's name shows as the seller. You need a free D-U-N-S number first, which can take 1–2 weeks.
  - Decide this before enrolling, because switching later is a hassle.
- **(you)** Once approved, note your **Team ID** (Membership details page) and send it to Claude. It isn't secret: it goes into `public/.well-known/apple-app-site-association`, replacing `TEAMID`, which makes joinliftd.com/app links open the app.

## 4. Push notification key

1. **(you)** developer.apple.com → Certificates, IDs & Profiles → **Keys** → ＋ → name it "Lift'd push" → tick **Apple Push Notifications service (APNs)** → Continue → Register → **Download** the `.p8` file. Apple only lets you download it once, so keep it safe.
2. **(you)** Supabase dashboard → Edge Functions → **Secrets** → add:
   - `APNS_KEY_ID`: the 10-character Key ID shown next to the key
   - `APNS_TEAM_ID`: your Team ID
   - `APNS_PRIVATE_KEY`: open the `.p8` file in TextEdit and paste its whole contents, including the BEGIN and END lines

   Never paste the `.p8` contents into chat, the code or GitHub. It only belongs in Supabase's secret store.

## 5. Run it on your iPhone

```bash
npm run ios
```
This builds the app code, copies it into the Xcode project and opens Xcode. Then:

1. **(you)** Click **App** in the left sidebar → **Signing & Capabilities** → Team: pick your developer team. Xcode registers the `com.joinliftd.app` ID with Push Notifications and Associated Domains for you.
2. **(you)** Plug in your iPhone, pick it at the top of the window, and press ▶. The first time, the iPhone asks you to turn on Developer Mode (Settings → Privacy & Security).
3. Check: sign in, turn on Push Notifications in Settings, like something from another account, and the notification should arrive.

## 6. Demo account for Apple's reviewer

1. **(you)** In the app, sign up a new account for the reviewer (for example `review@joinliftd.com`, using the Namecheap email forwarding) with a strong password. Confirm the email.
2. Tell Claude the **email only** (never the password). Claude runs `supabase/pending/seed_demo_account.sql`, which adds six weeks of workouts, PRs, food, posts, a gym with chat and a live check-in.
3. **(you)** Put the email and password into App Store Connect → App Review Information.

## 7. Screenshots

With the demo account seeded and the Xcode licence accepted, Claude can run the app in the iPhone 17 Pro Max simulator and save the 1320 × 2868 screenshots listed in `LISTING.md` into `appstore/screenshots/`.

## 8. App Store Connect

1. **(you)** appstoreconnect.apple.com → Apps → ＋ → New App: iOS, name `Lift'd: Gym Crew & Form Clips`, bundle ID `com.joinliftd.app`, SKU `liftd-ios-1`.
2. **(you)** Fill in everything from `appstore/LISTING.md`: description, keywords, URLs, age rating, App Privacy, review notes and screenshots.

## 9. Upload and submit

1. **(you)** Xcode: pick **Any iOS Device (arm64)** at the top → **Product → Archive** → Distribute App → App Store Connect → Upload.
2. **(you)** Wait for processing (around 15 minutes), then try it yourself through **TestFlight**.
3. **(you)** App Store Connect → your version → select the build → **Add for Review** → Submit. Review usually takes 1–3 days.

## Updating the app later

- The iPhone app carries its own copy of the app code. Pushing to GitHub updates the website **only**.
- To ship changes to the iPhone app:
  1. Run `npm run build:ios`.
  2. Raise the version (Xcode → App → General → Version and Build).
  3. Archive and submit again.
- Database and edge-function changes apply to both straight away. Keep them backwards-compatible, because people will be on older app versions.
