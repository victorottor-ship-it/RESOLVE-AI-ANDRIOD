import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// Firebase web-app config belongs here. It is not the Gemini API key.
const firebaseConfig = {
  apiKey: "AIzaSyAKnnKaqdf0FkXC-toz58jtJMh5ijLq8-k",
  authDomain: "resolve-ai-3c57e.firebaseapp.com",
  projectId: "resolve-ai-3c57e",
  storageBucket: "resolve-ai-3c57e.firebasestorage.app",
  messagingSenderId: "904898771989",
  appId: "1:904898771989:web:16c0afc3b3645b69b7221c"
};

const $ = id => document.getElementById(id);
const apiUrl = new URL("./api/investigate", window.location.href).toString();
const authView = $("authView");
const appView = $("appView");
let auth;
let db;
let signup = false;
let currentReport = "";

function showMessage(id, message, error = false) {
  const element = $(id);
  element.textContent = message;
  element.style.color = error ? "#ffaaa9" : "#80e0bf";
}

function configReady() {
  return typeof firebaseConfig.apiKey === "string" &&
    firebaseConfig.apiKey.startsWith("AIza") &&
    typeof firebaseConfig.projectId === "string" &&
    !firebaseConfig.projectId.startsWith("YOUR_") &&
    typeof firebaseConfig.appId === "string" &&
    !firebaseConfig.appId.startsWith("YOUR_");
}

if (!configReady()) {
  showMessage("authMessage", "Setup required: add your Firebase web-app config in public/app.js, then deploy the project. See SETUP.md.", true);
} else {
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
    onAuthStateChanged(
      auth,
      user => {
        authView.classList.toggle("hidden", Boolean(user));
        appView.classList.toggle("hidden", !user);
        if (user) loadHistory().catch(error => showMessage("appMessage", friendlyError(error), true));
      },
      error => showMessage("authMessage", friendlyError(error), true)
    );
  } catch (error) {
    showMessage("authMessage", friendlyError(error), true);
  }
}

$("loginTab").addEventListener("click", () => setMode(false));
$("signupTab").addEventListener("click", () => setMode(true));

function setMode(createAccount) {
  signup = createAccount;
  $("loginTab").classList.toggle("active", !signup);
  $("signupTab").classList.toggle("active", signup);
  $("loginTab").setAttribute("aria-selected", String(!signup));
  $("signupTab").setAttribute("aria-selected", String(signup));
  $("nameField").classList.toggle("hidden", !signup);
  $("name").required = signup;
  $("password").autocomplete = signup ? "new-password" : "current-password";
  $("authSubmit").querySelector("span").textContent = signup ? "Create account" : "Sign in";
  showMessage("authMessage", "");
}

$("authForm").addEventListener("submit", async event => {
  event.preventDefault();
  if (!auth) {
    showMessage("authMessage", "Firebase is not configured yet. Complete the setup instructions first.", true);
    return;
  }
  const email = $("email").value.trim();
  const password = $("password").value;
  const submit = $("authSubmit");
  submit.disabled = true;
  showMessage("authMessage", signup ? "Creating your account…" : "Signing in…");
  try {
    if (signup) {
      const name = $("name").value.trim();
      if (!name) throw new Error("Enter your name.");
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (error) {
    showMessage("authMessage", friendlyError(error), true);
  } finally {
    submit.disabled = false;
  }
});

function friendlyError(error) {
  const messages = {
    "auth/configuration-not-found": "Firebase Authentication is not enabled for this project. In Firebase Console, open Authentication, click Get started, and enable Email/Password. Confirm the web-app config belongs to the same Firebase project.",
    "auth/email-already-in-use": "That email already has an account. Sign in instead.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/weak-password": "Use a password with at least 8 characters.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/too-many-requests": "Too many attempts. Wait a little and try again.",
    "auth/network-request-failed": "Network problem. Check your connection."
  };
  return messages[error.code] || error.message || "Something went wrong. Please try again.";
}

$("logout").addEventListener("click", async () => {
  if (auth) await signOut(auth);
});

$("analyse").addEventListener("click", async () => {
  if (!auth?.currentUser || !db) {
    showMessage("appMessage", "Sign in after Firebase has been configured.", true);
    return;
  }
  const problem = $("problem").value.trim();
  if (problem.length < 20) {
    showMessage("appMessage", "Please describe the situation in at least 20 characters.", true);
    return;
  }
  const button = $("analyse");
  button.disabled = true;
  button.querySelector("span").textContent = "Investigating…";
  showMessage("appMessage", "Preparing your investigation securely…");
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ problem, category: $("category").value, priority: $("priority").value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `The AI service returned an error (${response.status}).`);
    currentReport = renderReport(data);
    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    await addDoc(collection(db, "users", auth.currentUser.uid, "cases"), {
      problem,
      category: $("category").value,
      priority: $("priority").value,
      result: data,
      createdAt: serverTimestamp()
    });
    await loadHistory();
    showMessage("appMessage", "Investigation completed and saved to your account.");
  } catch (error) {
    showMessage("appMessage", friendlyError(error), true);
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = "Investigate problem";
  }
});

function renderReport(data) {
  const root = $("resultBody");
  root.replaceChildren();
  const sections = [
    ["Problem framing", data.framing],
    ["Possible root causes", data.causes],
    ["Recommended approach", data.approach],
    ["Action plan", data.actions],
    ["Progress measures", data.measure]
  ];
  for (const [title, value] of sections) {
    const block = document.createElement("section");
    block.className = "result-block";
    const heading = document.createElement("h3");
    heading.textContent = title;
    block.append(heading);
    if (Array.isArray(value)) {
      const list = document.createElement(title === "Action plan" ? "ol" : "ul");
      value.forEach(item => {
        const li = document.createElement("li");
        li.textContent = String(item);
        list.append(li);
      });
      block.append(list);
    } else {
      const paragraph = document.createElement("p");
      paragraph.textContent = value || "Not provided.";
      block.append(paragraph);
    }
    root.append(block);
  }
  $("resultTitle").textContent = data.title || "Resolution brief";
  return sections.map(([title, value]) => `${title}: ${Array.isArray(value) ? value.join("; ") : value || ""}`).join("\n\n");
}

$("copy").addEventListener("click", async () => {
  if (!currentReport) return;
  try {
    await navigator.clipboard.writeText(currentReport);
    $("copy").textContent = "Copied ✓";
    setTimeout(() => { $("copy").textContent = "Copy report"; }, 1800);
  } catch {
    showMessage("appMessage", "Copy is unavailable in this browser. You can select and copy the report text.", true);
  }
});

async function loadHistory() {
  const historyQuery = query(
    collection(db, "users", auth.currentUser.uid, "cases"),
    orderBy("createdAt", "desc"),
    limit(10)
  );
  const snapshot = await getDocs(historyQuery);
  const host = $("historyList");
  host.replaceChildren();
  if (snapshot.empty) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = "No investigations saved yet. Your first report will appear here.";
    host.append(empty);
    return;
  }
  snapshot.forEach(documentSnapshot => {
    const value = documentSnapshot.data();
    const row = document.createElement("div");
    row.className = "history-item";
    const openButton = document.createElement("button");
    openButton.type = "button";
    openButton.textContent = (value.problem || "Untitled problem").slice(0, 95);
    openButton.addEventListener("click", () => {
      currentReport = renderReport(value.result || {});
      $("result").classList.remove("hidden");
      $("result").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const date = document.createElement("small");
    date.textContent = value.createdAt?.toDate?.().toLocaleString() || "Recently saved";
    row.append(openButton, date);
    host.append(row);
  });
}

// A local file preview can show the design, but Firebase and the AI endpoint need HTTPS hosting.
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(new URL("./sw.js", import.meta.url))
      .catch(error => console.warn("RESOLVE AI service worker registration:", error));
  });
}

const problemBox = $("problem");
if (problemBox) {
  problemBox.addEventListener("input", () => {
    $("charCount").textContent = `${problemBox.value.length.toLocaleString()} / 8,000`;
  });
}
// RESOLVE AI splash screen
window.addEventListener("load", () => {
  const splash = document.getElementById("splashScreen");

  if (splash) {
    setTimeout(() => {
      splash.classList.add("hide");

      setTimeout(() => {
        splash.remove();
      }, 800);

    }, 3500);
  }
});
