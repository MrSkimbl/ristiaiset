// Ristiäiset — login, multi-person RSVP, live list
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const SHARED_PASSWORD = "heinakuu2026";

function normalizePwd(s) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Household = kirjautuva henkilö + lisähenkilöt, joita hän voi ilmoittaa.
// Vain "primary"-nimet näkyvät kirjautumis-dropdownissa.
// Lisähenkilöt näkyvät "Ketkä ilmoitat?" -pilleissä vasta kirjautumisen jälkeen.
const HOUSEHOLDS = [
  { primary: "Maire",   members: ["Vesa"] },
  { primary: "Heidi",   members: [] },
  { primary: "Mikko",   members: [] },
  { primary: "Johanna", members: [] },
  { primary: "Martti",  members: ["Jenni"] }
];

const GUESTS = HOUSEHOLDS.map(h => h.primary);

function householdFor(primary) {
  const h = HOUSEHOLDS.find(x => x.primary === primary);
  return h ? [h.primary, ...h.members] : [primary];
}

const OVERNIGHT_LABELS = {
  "to-pe": "To–Pe",
  "pe-la": "Pe–La",
  "la-su": "La–Su",
  "ei": "Ei yövy"
};

// ---------- Firebase ----------
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const rsvpsCol = collection(db, "rsvps");

// ---------- DOM refs ----------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginNameSel = document.getElementById("login-name");
const loginPwd = document.getElementById("login-password");
const loginError = document.getElementById("login-error");
const heroGreeting = document.getElementById("hero-greeting");
const logoutBtn = document.getElementById("logout-btn");
const rsvpForm = document.getElementById("rsvp-form");
const rsvpNotes = document.getElementById("rsvp-notes");
const rsvpMsg = document.getElementById("rsvp-msg");
const rsvpSubmitBtn = document.getElementById("rsvp-submit");
const overnightGroup = document.getElementById("overnight-group");
const rsvpListEl = document.getElementById("rsvp-list");
const formModeLabel = document.getElementById("form-mode-label");
const cancelEditBtn = document.getElementById("cancel-edit");
const peopleChipsEl = document.getElementById("rsvp-people");
const singlePersonEl = document.getElementById("rsvp-person-single");
const singlePersonNameEl = document.getElementById("rsvp-person-single-name");

// ---------- State ----------
let currentUser = null;
let currentRsvps = [];
let editingName = null; // null => multi-create mode; else => editing that single person

// ---------- Build login dropdown ----------
function fillLoginOptions() {
  loginNameSel.innerHTML = `<option value="" disabled selected>— Valitse nimesi —</option>` +
    GUESTS.map(n => `<option value="${n}">${n}</option>`).join("");
}
fillLoginOptions();

// ---------- Build people chips (only current user's household) ----------
function fillPeopleChips() {
  const names = householdFor(currentUser);
  peopleChipsEl.innerHTML = names.map(n => `
    <label class="chip">
      <input type="checkbox" name="person" value="${n}" />
      <span>${n}${n === currentUser ? " (sinä)" : ""}</span>
    </label>
  `).join("");
}

// ---------- View helpers ----------
function setView(view) {
  if (view === "login") {
    loginView.classList.remove("hidden");
    appView.classList.add("hidden");
  } else {
    loginView.classList.add("hidden");
    appView.classList.remove("hidden");
  }
}

function saveSession(name) { localStorage.setItem("ristiaiset.user", name); }
function clearSession() { localStorage.removeItem("ristiaiset.user"); }
function getSession() { return localStorage.getItem("ristiaiset.user"); }

function enterApp(name) {
  currentUser = name;
  heroGreeting.textContent = `Tervetuloa juhliin ${name}!`;
  fillPeopleChips();
  resetFormToDefault();
  setView("app");
  subscribeRsvps();
}

function canEditOrDelete(row) {
  if (!currentUser) return false;
  return row.name === currentUser || row.submittedBy === currentUser;
}

function getSelectedPeople() {
  return Array.from(peopleChipsEl.querySelectorAll('input[name="person"]:checked')).map(c => c.value);
}

// ---------- Login ----------
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = loginNameSel.value;
  const pwd = loginPwd.value.trim();
  loginError.textContent = "";

  if (!name) {
    loginError.textContent = "Valitse nimesi listasta.";
    return;
  }
  if (normalizePwd(pwd) !== SHARED_PASSWORD) {
    loginError.textContent = "Salasana ei täsmää. Tarkista kutsusta.";
    loginPwd.value = "";
    return;
  }

  saveSession(name);
  enterApp(name);
});

logoutBtn.addEventListener("click", () => {
  clearSession();
  currentUser = null;
  loginPwd.value = "";
  loginNameSel.value = "";
  setView("login");
});

// ---------- Attendance toggle disables overnight ----------
rsvpForm.addEventListener("change", (e) => {
  if (e.target.name === "attending") {
    const isNo = e.target.value === "no";
    overnightGroup.classList.toggle("disabled", isNo);
    if (isNo) {
      rsvpForm.querySelectorAll('input[name="overnight"]').forEach(cb => cb.checked = false);
    }
  }
});

// ---------- Form modes ----------
function resetFormToDefault() {
  editingName = null;
  rsvpForm.reset();

  // Show chips, hide single-person label
  peopleChipsEl.classList.remove("hidden");
  singlePersonEl.classList.add("hidden");

  // Pre-check current user
  peopleChipsEl.querySelectorAll('input[name="person"]').forEach(cb => {
    cb.checked = (cb.value === currentUser);
    cb.disabled = false;
  });

  overnightGroup.classList.remove("disabled");
  formModeLabel.textContent = "Uusi ilmoittautuminen";
  formModeLabel.classList.remove("editing");
  cancelEditBtn.classList.add("hidden");
  rsvpSubmitBtn.textContent = "Lähetä ilmoittautuminen";
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";
}

function enterEditMode(row) {
  editingName = row.name;

  // Hide chips, show single-person label
  peopleChipsEl.classList.add("hidden");
  singlePersonEl.classList.remove("hidden");
  singlePersonNameEl.textContent = row.name;

  // Set attending radio
  const attendingVal = row.attending ? "yes" : "no";
  const radio = rsvpForm.querySelector(`input[name="attending"][value="${attendingVal}"]`);
  if (radio) radio.checked = true;

  // Set overnight checkboxes
  rsvpForm.querySelectorAll('input[name="overnight"]').forEach(cb => {
    cb.checked = (row.nights || []).includes(cb.value);
  });
  overnightGroup.classList.toggle("disabled", !row.attending);

  rsvpNotes.value = row.notes || "";

  formModeLabel.textContent = `Muokataan: ${row.name}`;
  formModeLabel.classList.add("editing");
  cancelEditBtn.classList.remove("hidden");
  rsvpSubmitBtn.textContent = "Tallenna muutokset";
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";

  document.getElementById("rsvp-form").scrollIntoView({ behavior: "smooth", block: "center" });
}

cancelEditBtn.addEventListener("click", () => resetFormToDefault());

// ---------- Submit RSVP ----------
rsvpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";

  const attending = rsvpForm.querySelector('input[name="attending"]:checked')?.value;
  const nights = Array.from(rsvpForm.querySelectorAll('input[name="overnight"]:checked')).map(c => c.value);
  const notes = rsvpNotes.value.trim();

  // Determine target list: single (edit mode) or multi (chips)
  const people = editingName ? [editingName] : getSelectedPeople();

  if (!people.length) {
    rsvpMsg.textContent = "Valitse vähintään yksi henkilö.";
    rsvpMsg.style.color = "#a33a3a";
    return;
  }
  if (!attending) {
    rsvpMsg.textContent = "Valitse tuletko juhliin.";
    rsvpMsg.style.color = "#a33a3a";
    return;
  }

  rsvpSubmitBtn.disabled = true;
  const origLabel = rsvpSubmitBtn.textContent;
  rsvpSubmitBtn.textContent = "Tallennetaan…";

  try {
    await Promise.all(people.map(person => {
      const existing = currentRsvps.find(r => r.name === person);
      // In edit mode: keep original submitter. In create mode: current user.
      const submittedBy = editingName && existing
        ? (existing.submittedBy || currentUser)
        : currentUser;

      const payload = {
        name: person,
        attending: attending === "yes",
        nights: attending === "yes" ? nights : [],
        notes,
        submittedBy,
        lastEditedBy: currentUser,
        updatedAt: serverTimestamp()
      };
      return setDoc(doc(rsvpsCol, person), payload, { merge: true });
    }));

    rsvpMsg.textContent = editingName
      ? `${editingName}n tiedot päivitetty.`
      : (people.length === 1
          ? `Kiitos! ${people[0]} on ilmoitettu.`
          : `Kiitos! ${people.length} henkilöä ilmoitettu (${people.join(", ")}).`);
    rsvpMsg.style.color = "";
    resetFormToDefault();
  } catch (err) {
    console.error(err);
    rsvpMsg.textContent = "Jokin meni pieleen. Yritä uudelleen.";
    rsvpMsg.style.color = "#a33a3a";
    rsvpSubmitBtn.textContent = origLabel;
  } finally {
    rsvpSubmitBtn.disabled = false;
  }
});

// ---------- Delete ----------
async function handleDelete(name) {
  const ok = confirm(`Poistetaanko ${name}n ilmoittautuminen?`);
  if (!ok) return;
  try {
    await deleteDoc(doc(rsvpsCol, name));
    if (editingName === name) resetFormToDefault();
  } catch (err) {
    console.error(err);
    alert("Poisto ei onnistunut. Yritä uudelleen.");
  }
}

// ---------- Live RSVP list ----------
let unsubscribeRsvps = null;

function subscribeRsvps() {
  if (unsubscribeRsvps) unsubscribeRsvps();
  const q = query(rsvpsCol, orderBy("name"));
  unsubscribeRsvps = onSnapshot(q, (snap) => {
    currentRsvps = snap.docs.map(d => d.data());
    renderRsvps(currentRsvps);
  }, (err) => {
    console.error(err);
    rsvpListEl.innerHTML = `<p class="empty">Ilmoittautumisten lataus ei onnistunut.</p>`;
  });
}

function renderRsvps(items) {
  if (!items.length) {
    rsvpListEl.innerHTML = `<p class="empty">Ei vielä ilmoittautumisia. Ole ensimmäinen!</p>`;
    return;
  }
  rsvpListEl.innerHTML = items.map(r => {
    const statusText = r.attending ? "Tulossa" : "Ei pääse";
    const classes = ["rsvp-card", r.attending ? "attending" : "declined"].join(" ");
    const nights = (r.attending && r.nights?.length)
      ? `<div class="nights">${r.nights.map(n => `<span class="night-tag">${OVERNIGHT_LABELS[n] || n}</span>`).join("")}</div>`
      : "";
    const byLine = (r.submittedBy && r.submittedBy !== r.name)
      ? `<span class="by">ilm. ${escapeHtml(r.submittedBy)}</span>` : "";
    const notes = r.notes ? `<p class="notes">"${escapeHtml(r.notes)}"</p>` : "";
    const actions = canEditOrDelete(r)
      ? `<div class="card-actions">
          <button class="card-btn edit" data-action="edit" data-name="${escapeHtml(r.name)}">Muokkaa</button>
          <button class="card-btn delete" data-action="delete" data-name="${escapeHtml(r.name)}">Poista</button>
         </div>`
      : "";
    return `
      <div class="${classes}">
        ${byLine}
        <p class="name">${escapeHtml(r.name)}</p>
        <p class="status">${statusText}</p>
        ${nights}
        ${notes}
        ${actions}
      </div>
    `;
  }).join("");
}

rsvpListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".card-btn");
  if (!btn) return;
  const action = btn.dataset.action;
  const name = btn.dataset.name;
  if (!action || !name) return;
  const row = currentRsvps.find(r => r.name === name);
  if (!row) return;
  if (action === "edit") enterEditMode(row);
  if (action === "delete") handleDelete(name);
});

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- Auto-login on load ----------
const existing = getSession();
if (existing && GUESTS.includes(existing)) {
  enterApp(existing);
}
