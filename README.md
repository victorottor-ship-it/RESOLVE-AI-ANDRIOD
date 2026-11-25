# RESOLVE AI Android — conversation history upgrade

This repository package contains the Android web layer and Capacitor build configuration for the RESOLVE AI app.

## Included

- Existing RESOLVE AI sign-in/sign-up/sign-out interface and Firebase Authentication integration.
- Android-only ChatGPT-style history drawer.
- Firestore conversation persistence under `users/{uid}/cases/{caseId}`.
- Search, reopen, continue, pin/unpin, delete, and start-new-chat actions.
- Android conversation thread rendering and follow-up context.
- Existing RESOLVE AI dark blue/cyan visual identity.
- GitHub Actions workflow that builds a debug APK and uploads it as an artifact.

## Upload to GitHub

1. Download and extract this ZIP.
2. Open your repository `victorottor-ship-it/RESOLVE-AI-ANDRIOD`.
3. Upload the **contents inside** `RESOLVE-AI-ANDROID-UPGRADE` to the repository root (not the outer folder itself).
4. Replace matching files when GitHub asks. Keep any existing backend/source files that are not included here; this package does not contain or replace your Cloudflare Worker backend.
5. Commit the changes to the `main` branch.
6. Open **Actions** → **Build RESOLVE AI Android APK**. Wait for the workflow to complete.
7. Open the successful run and download the `resolve-ai-android-debug-apk` artifact. Extract it to get `app-debug.apk`.

## Firestore data and rules

Conversations are saved per authenticated Firebase UID at:

`users/{uid}/cases/{caseId}`

The supplied `firestore.rules` keeps reads/writes restricted to the signed-in owner. If your current rules include other required paths, merge the owner-only `cases` match into your existing rules rather than removing unrelated rules.

## Backend connection

The Android app calls the existing Cloudflare Worker endpoint:

`https://resolve-ai.victorottor.workers.dev/api/investigate`

The Gemini key must remain stored as a Cloudflare Worker secret. This package does not contain, change, or deploy the Worker. The Worker must accept the Firebase ID token sent as a Bearer token and permit requests from the Capacitor app origin. If the Worker endpoint is currently failing, history UI can still be built, but AI conversations cannot complete until the backend is fixed.

## Important

- The Firebase web-app configuration in `www/app.js` is client configuration, not a Gemini secret. Never commit a Gemini API key or service-account private key.
- Existing users must sign in with the same Firebase account to see their own saved history.
- The app uses the same `cases` collection path as the existing project, so existing saved investigations remain compatible.
- The workflow builds a **debug APK** for testing. It is not a signed production release.
- This is an integration package prepared from the available project snapshot. Run the APK on a device and verify login, saving, restore, follow-up, pin and delete before release.
