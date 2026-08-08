# Building the telecaller app

The app had never been built. There was no `eas.json`, no EAS project id, and
no `.env`, so `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
were both empty strings — the app would have started and connected to nothing.
`versionCode` was already at 108 for a build that never shipped.

Everything below is done from `mobile/`.

## Once

**1. Environment**

```bash
cp .env.example .env
```

Fill in the Supabase project URL and the **anon** key — never the service role
key. Both are embedded in the bundle and readable by anyone who downloads the
app; that is what the anon key is for, and row-level security is what actually
protects the data.

**2. EAS account**

```bash
npx eas login
npx eas init
```

`eas init` writes `extra.eas.projectId` into `app.json`. Commit that — builds
fail without it.

**3. Android signing**

EAS generates and stores a keystore on the first production build. Let it, and
do not lose access to the account: **Google Play will not accept an update
signed with a different key.** Back it up:

```bash
npx eas credentials
```

## Each build

```bash
# An installable APK for testing on a real phone
npx eas build --platform android --profile preview

# The .aab that goes to Play
npx eas build --platform android --profile production
```

`production` has `autoIncrement`, so the version code moves on its own. Leave
`versionCode` in `app.json` alone once that is working — two things
incrementing it is how a build gets rejected for a duplicate.

## Before the first Play submission

- **Data safety form.** The app collects precise location, and only at
  attendance. Declare it, say it is not shared with third parties, and match
  the wording to the privacy policy. A mismatch here is the common rejection.
- **Privacy policy URL** — `https://callmind.app/legal/privacy`. It must be
  reachable and must not be the draft: `REVIEWED_BY_LAWYER` in
  `src/config/legal.ts` is still `false`.
- **Permissions.** The app requests notifications, biometrics, vibration,
  network and location. It does **not** request call log or contacts, so no
  declaration is needed for those — and do not add them without reading
  Google's Call Log permission policy first, which restricts them to apps whose
  core purpose is dialling or caller ID.

## What is not set up

- **Remote push.** `expo-notifications` is installed and used for local
  follow-up reminders, which need no server. Push from the server — "a new lead
  was assigned to you" — needs an FCM project and `google-services.json`, and
  is not configured.
- **OTA updates.** No `updates` block in `app.json`, so every change ships as a
  new build.
- **iOS.** No bundle identifier and no Apple account. Android only for now.
