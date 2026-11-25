import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, signOut } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

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
const nativeApp = Boolean(window.Capacitor?.isNativePlatform?.() || window.Capacitor?.getPlatform?.() === "android");
const apiUrl = nativeApp
  ? "https://resolve-ai.victorottor.workers.dev/api/investigate"
  : new URL("./api/investigate", window.location.href).toString();
const authView = $("authView");
const appView = $("appView");
let auth;
let db;
let signup = false;
let currentReport = "";
let currentCaseId = null;
let currentMessages = [];

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
        else { currentCaseId = null; currentMessages = []; }
      },
      error => showMessage("authMessage", friendlyError(error), true)
    );
  } catch (error) {
    showMessage("authMessage", friendlyError(error), true);
  }
}

if (nativeApp) {
  document.body.classList.add("native-app");
  document.querySelectorAll(".native-only").forEach(el => el.classList.remove("hidden"));
  document.querySelectorAll(".web-history-only").forEach(el => el.classList.add("hidden"));
}

function closeHistoryDrawer() {
  $("historyDrawer")?.classList.remove("open");
  $("historyBackdrop")?.classList.remove("open");
  $("historyToggle")?.setAttribute("aria-expanded", "false");
}

$("historyToggle")?.addEventListener("click", () => {
  const open = $("historyDrawer").classList.toggle("open");
  $("historyBackdrop").classList.toggle("open", open);
  $("historyToggle").setAttribute("aria-expanded", String(open));
});
$("historyClose")?.addEventListener("click", closeHistoryDrawer);
$("historyBackdrop")?.addEventListener("click", closeHistoryDrawer);
$("historySearch")?.addEventListener("input", () => loadHistory().catch(error => showMessage("appMessage", friendlyError(error), true)));
$("newConversation")?.addEventListener("click", () => {
  currentCaseId = null;
  currentMessages = [];
  currentReport = "";
  $("problem").value = "";
  $("result").classList.add("hidden");
  $("conversationThread")?.classList.add("hidden");
  $("conversationThread")?.replaceChildren();
  if ($("workspaceTitle")) $("workspaceTitle").textContent = "What needs resolving?";
  if ($("workspaceSubtitle")) $("workspaceSubtitle").textContent = "Start a new conversation. Your previous chats remain in History.";
  $("analyse").querySelector("span").textContent = "Investigate problem";
  $("charCount").textContent = "0 / 8,000";
  closeHistoryDrawer();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

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
    const priorContext = nativeApp && currentCaseId && currentMessages.length
      ? currentMessages.slice(-12).map(m => `${m.role === "assistant" ? "RESOLVE AI" : "USER"}: ${m.content}`).join("\n\n")
      : "";
    const contextualProblem = priorContext
      ? `Continue this investigation using the conversation context below. Treat earlier AI output as suggestions, not verified facts.\n\n${priorContext}\n\nUSER FOLLOW-UP: ${problem}`.slice(-7800)
      : problem;
    const token = await auth.currentUser.getIdToken();
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ problem: contextualProblem, category: $("category").value, priority: $("priority").value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `The AI service returned an error (${response.status}).`);
    currentReport = renderReport(data);
    $("result").classList.remove("hidden");
    $("result").scrollIntoView({ behavior: "smooth", block: "start" });

    const assistantText = JSON.stringify(data);
    const newMessages = [
      ...currentMessages,
      { role: "user", content: problem, createdAt: new Date().toISOString() },
      { role: "assistant", content: assistantText, createdAt: new Date().toISOString() }
    ].slice(-40);
    const caseCollection = collection(db, "users", auth.currentUser.uid, "cases");
    if (nativeApp && currentCaseId) {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "cases", currentCaseId), {
        messages: newMessages,
        result: data,
        problem: newMessages.find(m => m.role === "user")?.content || problem,
        title: data.title || problem.slice(0, 64),
        updatedAt: serverTimestamp()
      });
    } else {
      const saved = await addDoc(caseCollection, {
        problem,
        title: data.title || problem.slice(0, 64),
        category: $("category").value,
        priority: $("priority").value,
        result: data,
        messages: newMessages,
        pinned: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      if (nativeApp) currentCaseId = saved.id;
    }
    currentMessages = newMessages;
    if (nativeApp) renderConversationThread();
    if (nativeApp) {
      if ($("workspaceTitle")) $("workspaceTitle").textContent = data.title || "Investigation";
      if ($("workspaceSubtitle")) $("workspaceSubtitle").textContent = "Continue this conversation below. Your history is saved to your account.";
      $("analyse").querySelector("span").textContent = "Send follow-up";
    }
    await loadHistory();
    showMessage("appMessage", "Investigation saved to your conversation history.");
  } catch (error) {
    showMessage("appMessage", friendlyError(error), true);
  } finally {
    button.disabled = false;
    button.querySelector("span").textContent = nativeApp && currentCaseId ? "Send follow-up" : "Investigate problem";
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
  if (!auth?.currentUser || !db) return;
  const historyQuery = query(
    collection(db, "users", auth.currentUser.uid, "cases"),
    orderBy("createdAt", "desc"),
    limit(nativeApp ? 100 : 10)
  );
  const snapshot = await getDocs(historyQuery);
  const records = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  const timestamp = value => value?.toDate?.().getTime?.() || (value ? new Date(value).getTime() : 0);
  records.sort((a, b) => timestamp(b.updatedAt || b.createdAt) - timestamp(a.updatedAt || a.createdAt));
  const host = $("historyList");
  if (host) {
    host.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("p");
      empty.className = "muted";
      empty.textContent = "No investigations saved yet. Your first report will appear here.";
      host.append(empty);
    } else {
      records.forEach(value => {
        const row = document.createElement("div");
        row.className = "history-item";
        const openButton = document.createElement("button");
        openButton.type = "button";
        openButton.textContent = (value.title || value.problem || "Untitled problem").slice(0, 95);
        openButton.addEventListener("click", () => openConversation(value));
        const date = document.createElement("small");
        date.textContent = value.createdAt?.toDate?.().toLocaleString() || "Recently saved";
        row.append(openButton, date);
        host.append(row);
      });
    }
  }

  const conversationHost = $("conversationList");
  if (!conversationHost || !nativeApp) return;
  const search = ($("historySearch")?.value || "").trim().toLowerCase();
  const filtered = records.filter(value => `${value.title || ""} ${value.problem || ""}`.toLowerCase().includes(search));
  filtered.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)));
  conversationHost.replaceChildren();
  if (!filtered.length) {
    const empty = document.createElement("p");
    empty.className = "muted";
    empty.textContent = search ? "No matching conversations." : "Your conversations will appear here.";
    conversationHost.append(empty);
    return;
  }
  filtered.forEach(value => {
    const row = document.createElement("div");
    row.className = "conversation-row";
    const open = document.createElement("button");
    open.className = "conversation-open";
    open.type = "button";
    open.textContent = `${value.pinned ? "📌 " : ""}${value.title || value.problem || "Untitled conversation"}`;
    open.addEventListener("click", () => openConversation(value));
    const tools = document.createElement("div");
    tools.className = "conversation-tools";
    const pin = document.createElement("button");
    pin.type = "button"; pin.textContent = value.pinned ? "Unpin" : "Pin";
    pin.addEventListener("click", async () => {
      await updateDoc(doc(db, "users", auth.currentUser.uid, "cases", value.id), { pinned: !value.pinned });
      await loadHistory();
    });
    const remove = document.createElement("button");
    remove.type = "button"; remove.textContent = "Delete";
    remove.addEventListener("click", async () => {
      if (!confirm("Delete this conversation permanently?")) return;
      await deleteDoc(doc(db, "users", auth.currentUser.uid, "cases", value.id));
      if (currentCaseId === value.id) $("newConversation").click();
      await loadHistory();
    });
    tools.append(pin, remove); row.append(open, tools); conversationHost.append(row);
  });
}

function renderConversationThread() {
  const host = $("conversationThread");
  if (!host || !nativeApp) return;
  host.replaceChildren();
  currentMessages.forEach(message => {
    const bubble = document.createElement("article");
    bubble.className = `chat-message ${message.role === "assistant" ? "assistant-message" : "user-message"}`;
    const label = document.createElement("small");
    label.textContent = message.role === "assistant" ? "RESOLVE AI" : "YOU";
    const body = document.createElement("p");
    let text = message.content || "";
    if (message.role === "assistant") {
      try {
        const parsed = JSON.parse(text);
        text = [parsed.title, parsed.framing, parsed.approach, ...(parsed.actions || []).map((item, i) => `${i + 1}. ${item}`)].filter(Boolean).join("\n\n");
      } catch { /* keep plain-text assistant content */ }
    }
    body.textContent = text;
    bubble.append(label, body);
    host.append(bubble);
  });
  host.classList.toggle("hidden", !currentMessages.length);
}

function openConversation(value) {
  currentCaseId = value.id;
  currentMessages = Array.isArray(value.messages) && value.messages.length
    ? value.messages
    : [
        { role: "user", content: value.problem || "" },
        { role: "assistant", content: JSON.stringify(value.result || {}) }
      ];
  currentReport = renderReport(value.result || {});
  if (nativeApp) renderConversationThread();
  $("result").classList.remove("hidden");
  if ($("workspaceTitle")) $("workspaceTitle").textContent = value.title || value.problem || "Saved investigation";
  if ($("workspaceSubtitle")) $("workspaceSubtitle").textContent = "Conversation restored. Add a follow-up to continue this investigation.";
  $("analyse").querySelector("span").textContent = "Send follow-up";
  $("problem").value = "";
  $("charCount").textContent = "0 / 8,000";
  closeHistoryDrawer();
  window.scrollTo({ top: 0, behavior: "smooth" });
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
