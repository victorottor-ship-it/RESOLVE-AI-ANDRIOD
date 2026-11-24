/*
 * RESOLVE AI — Android Get App button
 * Package ID: com.resolveai.app
 *
 * The Android browser attempts to launch the installed package. If Android
 * cannot open it, Chrome's intent fallback (and the timed fallback below)
 * sends the visitor to the latest GitHub Release APK.
 */
(() => {
  "use strict";

  const PACKAGE_ID = "com.resolveai.app";
  const APK_URL =
    "https://github.com/victorottor-ship-it/RESOLVE-AI-ANDRIOD/releases/latest/download/resolve-ai.apk";
  const button = document.getElementById("getAppButton");

  if (!button) return;

  button.addEventListener("click", (event) => {
    if (!/Android/i.test(navigator.userAgent)) {
      // On desktop, the same link opens the release/download destination.
      return;
    }

    event.preventDefault();
    let appOpened = false;

    const fallback = window.setTimeout(() => {
      if (!appOpened) window.location.assign(APK_URL);
    }, 1600);

    const detectReturnToPage = () => {
      if (document.hidden) {
        appOpened = true;
        window.clearTimeout(fallback);
      }
    };

    document.addEventListener("visibilitychange", detectReturnToPage, { once: true });

    const intentUrl =
      "intent://launch#Intent;" +
      "scheme=resolveai;" +
      "package=" + PACKAGE_ID + ";" +
      "action=android.intent.action.MAIN;" +
      "category=android.intent.category.LAUNCHER;" +
      "S.browser_fallback_url=" + encodeURIComponent(APK_URL) + ";" +
      "end";

    window.location.href = intentUrl;
  });
})();
