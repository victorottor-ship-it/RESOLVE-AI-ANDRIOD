RESOLVE AI — Visual Upgrade Package

WHAT THIS UPDATE DOES
- Keeps the existing Discover, investigation, result, and saved-history interface.
- Adds a Get App button to the website header.
- Adds responsive visual refinements using the existing navy, blue, and cyan palette.
- Adds an Android launch attempt with a GitHub Release APK fallback.

WHAT THIS UPDATE DOES NOT CHANGE
- app.js is included unchanged: Firebase Authentication, Firestore history,
  investigation request handling, report rendering, and copy-report behaviour
  remain as they were in the supplied project.
- sw.js is included unchanged.
- No Firebase configuration or database rules are changed.

FILES
- index.html          Updated header and app-download script reference.
- style.css           Existing stylesheet plus presentation-only refinements.
- app.js              Unchanged existing application logic.
- app-download.js     Android app launch / APK fallback.
- sw.js               Unchanged service worker.
- README.md           Original project readme.

GITHUB RELEASE REQUIREMENT
The button points to:
https://github.com/victorottor-ship-it/RESOLVE-AI-ANDRIOD/releases/latest/download/resolve-ai.apk

For that download to work, publish a GitHub Release and attach the built APK
with the exact asset filename: resolve-ai.apk.

ANDROID LAUNCH NOTE
The browser launch attempt is best-effort. Android browsers can restrict app
launches, and the native APK must expose a compatible launch activity. If the
launch cannot be completed, the button falls back to the APK download.

UPLOAD
Replace the repository's index.html and style.css with these updated files,
and add app-download.js at the repository root. Keep app.js and sw.js intact.
Do not upload the ZIP itself as the website's source files.
