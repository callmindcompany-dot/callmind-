# Expo — read the docs for the version that is installed

This project is on **Expo SDK 51** (`react-native` 0.74.5). Check
`package.json` before trusting anything here.

Read <https://docs.expo.dev/versions/v51.0.0/> — or, when a page has been
removed for a version that old, read the current docs and then **check the
installed package's own type definitions** in `node_modules` before writing
against them.

That last step is not optional. This file used to point at
`https://docs.expo.dev/versions/v57.0.0/` while the project sat on 51, and the
two disagree in ways that compile:

- `expo-notifications` in SDK 57 takes `shouldShowBanner` / `shouldShowList` in
  the notification handler and a `SchedulableTriggerInputTypes` enum for
  triggers. Version 0.28, which SDK 51 installs, has **neither** — the handler
  takes `shouldShowAlert` and a date trigger is `{ date }`. Code written from
  the v57 page type-checks and then does nothing at runtime.

- `android.permissions` in `app.json` is a **whitelist**. Listing it at all
  means only those permissions are included, so a module's config plugin cannot
  add its own. `expo-location` was a dependency and was being used for
  attendance, and `ACCESS_FINE_LOCATION` was not in the list — so punching in
  could never have worked on Android.

## Upgrading

Worth doing, but it is its own piece of work, not something to do while
changing a screen. Until then, write for 51.

## Building

See `BUILD.md`. The app had never been built when that was written; if
something there is out of date, fix it rather than working around it.
