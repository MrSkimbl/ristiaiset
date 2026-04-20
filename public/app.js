// Ristiäiset — login, RSVP (itse + pienet lapset), nimiarvaus, live-lista
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Kutsuttujen lista.
// cat: 1 = pieni lapsi (ei kirjaudu itse, saman ryhmän aikuinen/lapsi ilmoittaa)
//      2 = lapsi (kirjautuu itse)
//      3 = aikuinen (kirjautuu itse)
// group = perheryhmä. Ei näy missään UI:ssa — käytetään vain jotta vanhemmat
// saavat oman ryhmänsä cat 1 -lapset chip-valintoihin.
// Rooli = suhde Mustikkaan (päätähti). Puolisot ja niin edelleen jäävät ilman roolia.
const PEOPLE = [
  { name: "Aada Höynälä",          cat: 3, group: 16 },
  { name: "Aliisa Janatuinen",     cat: 2, group: 15 },
  { name: "Amanda Kutuk",          cat: 1, group: 18, role: "Pikkuserkku" },
  { name: "Antti Korhonen",        cat: 3, group: 14 },
  { name: "Ari-Pekka Salonen",     cat: 3, group: 19 },
  { name: "Eija Luoto",            cat: 3, group: 20 },
  { name: "Eliel Luoto",           cat: 1, group: 3,  role: "Serkku" },
  { name: "Elina Tähkiö",          cat: 3, group: 19 },
  { name: "Elisa Jokela",          cat: 3, group: 9,  role: "Jamin kummi" },
  { name: "Ellen Louhelainen",     cat: 2, group: 0,  role: "Sisko" },
  { name: "Elsi Jaakonvaara",      cat: 1, group: 13 },
  { name: "Emma Martikainen",      cat: 3, group: 7 },
  { name: "Emmi Juntunen",         cat: 3, group: 15 },
  { name: "Essi Rehel",            cat: 3, group: 3 },
  { name: "Hanna-Sofia Luoto",     cat: 3, group: 4,  role: "Täti" },
  { name: "Harri Jaakonvaara",     cat: 3, group: 13, role: "Iivon kummi" },
  { name: "Heidi Louhelainen",     cat: 3, group: 0,  role: "Äiti" },
  { name: "Heli Luoto",            cat: 3, group: 5,  role: "Täti" },
  { name: "Hely Tähkiö",           cat: 3, group: 6,  role: "Isoisotäti" },
  { name: "Henry Wilen",           cat: 3, group: 5 },
  { name: "Iivo Louhelainen",      cat: 2, group: 0,  role: "Veli" },
  { name: "Jami Louhelainen",      cat: 2, group: 0,  role: "Veli" },
  { name: "Janne Louhelainen",     cat: 3, group: 7,  role: "Setä" },
  { name: "Jarmo Kakkonen",        cat: 3, group: 8 },
  { name: "Jenni Partinen",        cat: 3, group: 2 },
  { name: "Jenni Virtanen",        cat: 3, group: 10, role: "Ellenin kummi" },
  { name: "Johanna Tähkiö",        cat: 3, group: 6,  role: "Mummo" },
  { name: "Jukka Ohtonen",         cat: 3, group: 9,  role: "Jamin kummi" },
  { name: "Kerttu Valkonen",       cat: 3, group: 11, role: "Jamin kummi" },
  { name: "Kimmo Louhelainen",     cat: 3, group: 0,  role: "Isä" },
  { name: "Leena Airaksinen",      cat: 2, group: 11 },
  { name: "Maija Kurki",           cat: 3, group: 13 },
  { name: "Maire Luoto",           cat: 3, group: 1,  role: "Mummi" },
  { name: "Mari Moisio",           cat: 3, group: 14 },
  { name: "Martti Louhelainen",    cat: 3, group: 6,  role: "Ukki" },
  { name: "Matti Luoto",           cat: 3, group: 2,  role: "Eno" },
  { name: "Meme Kutuk",            cat: 3, group: 18 },
  { name: "Miisa Jaakonvaara",     cat: 2, group: 13 },
  { name: "Mikko Luoto",           cat: 3, group: 3,  role: "Eno" },
  { name: "Mila Kutuk",            cat: 2, group: 18, role: "Pikkuserkku" },
  { name: "Milla Nevanpää",        cat: 2, group: 14 },
  { name: "Mustikka Louhelainen",  cat: 1, group: 0,  role: "Päätähti" },
  { name: "Neela Ax",              cat: 2, group: 8,  role: "Serkku" },
  { name: "Nelli Nevanpää",        cat: 2, group: 14 },
  { name: "Oiva Ax",               cat: 2, group: 8,  role: "Serkku" },
  { name: "Oliver Brouk",          cat: 2, group: 10 },
  { name: "Olivia Brouk",          cat: 2, group: 10 },
  { name: "Olli Patrakka",         cat: 3, group: 4 },
  { name: "Olli-Pekka Höynälä",    cat: 3, group: 16 },
  { name: "Onni Korhonen",         cat: 1, group: 14 },
  { name: "Pete Luoto",            cat: 3, group: 20 },
  { name: "Petra Salonen",         cat: 3, group: 18 },
  { name: "Pia Ax",                cat: 3, group: 17 },
  { name: "Päivi Karvala",         cat: 3, group: 12, role: "Iivon kummi" },
  { name: "Sanna Ax",              cat: 3, group: 8,  role: "Täti" },
  { name: "Seppo Tähkiö",          cat: 3, group: 6,  role: "Isoukki" },
  { name: "Tero Airaksinen",       cat: 3, group: 11, role: "Jamin kummi" },
  { name: "Timi Airaksinen",       cat: 2, group: 11 },
  { name: "Tomi Brouk",            cat: 3, group: 10, role: "Ellenin kummi" },
  { name: "Tuomo Janatuinen",      cat: 3, group: 15 },
  { name: "Tuukka Airaksinen",     cat: 2, group: 11 },
  { name: "Vauva Janatuinen",      cat: 1, group: 15 },
  { name: "Vesa Luoto",            cat: 3, group: 1,  role: "Vaari" },
  { name: "Viola Brouk",           cat: 2, group: 10 },
  { name: "Vivian Wilen",          cat: 2, group: 5,  role: "Serkku" },
  { name: "William Wilen",         cat: 1, group: 5,  role: "Serkku" },
];

function personByName(name) { return PEOPLE.find(p => p.name === name); }
function catOf(name)   { return personByName(name)?.cat   ?? 0; }
function groupOf(name) { return personByName(name)?.group ?? -1; }
function roleOf(name)  { return personByName(name)?.role  ?? ""; }

// Login-dropdown: cat 2 ja 3, aakkosjärjestyksessä.
function loginCandidates() {
  return PEOPLE
    .filter(p => p.cat >= 2)
    .sort((a, b) => a.name.localeCompare(b.name, "fi"));
}

// Chips: koko saman perheryhmän jäsenet aakkosjärjestyksessä. Itse ensimmäisenä (pre-checked).
function registerableNames(user) {
  const me = personByName(user);
  if (!me) return [user];
  const others = PEOPLE
    .filter(p => p.group === me.group && p.name !== user)
    .sort((a, b) => a.name.localeCompare(b.name, "fi"))
    .map(p => p.name);
  return [user, ...others];
}

const OVERNIGHT_LABELS = {
  "to-pe": "To–Pe",
  "pe-la": "Pe–La",
  "la-su": "La–Su",
  "ei": "Ei yövy"
};

const ATTENDING_LABELS = {
  "yes":   "Tulossa",
  "maybe": "Ehkä tulossa",
  "no":    "Ei pääse"
};

const ICON_PENCIL = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>`;
const ICON_TRASH = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

// ---------- Firebase ----------
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const rsvpsCol = collection(db, "rsvps");
const guessesCol = collection(db, "guesses");

// ---------- DOM refs ----------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const loginNameSel = document.getElementById("login-name");
const loginError = document.getElementById("login-error");
const heroGreeting = document.getElementById("hero-greeting");
const logoutBtn = document.getElementById("logout-btn");

const guessForm = document.getElementById("guess-form");
const guessInput = document.getElementById("guess-input");
const guessMsg = document.getElementById("guess-msg");
const guessSubmitBtn = document.getElementById("guess-submit");
const guessCancelBtn = document.getElementById("guess-cancel");
const guessViewEl = document.getElementById("guess-view");
const guessViewValueEl = document.getElementById("guess-view-value");
const guessEditBtn = document.getElementById("guess-edit-btn");
const guessCloudEl = document.getElementById("guess-cloud");

const rsvpForm = document.getElementById("rsvp-form");
const rsvpNotes = document.getElementById("rsvp-notes");
const rsvpMsg = document.getElementById("rsvp-msg");
const rsvpSubmitBtn = document.getElementById("rsvp-submit");
const overnightGroup = document.getElementById("overnight-group");
const rsvpListEl = document.getElementById("rsvp-list");
const peopleChipsEl = document.getElementById("rsvp-people");
const singlePersonEl = document.getElementById("rsvp-person-single");
const singlePersonNameEl = document.getElementById("rsvp-person-single-name");
const formModeLabel = document.getElementById("form-mode-label");
const formHeaderEl = document.getElementById("form-header");
const cancelEditBtn = document.getElementById("cancel-edit");
const peopleHintEl = document.getElementById("rsvp-people-hint");

// ---------- State ----------
let currentUser = null;
let currentRsvps = [];
let allGuesses = [];
let currentGuess = null;
let editingName = null;
let editingGuess = false;
let unsubscribeRsvps = null;
let unsubscribeGuess = null;

// ---------- Build login dropdown ----------
function fillLoginOptions() {
  loginNameSel.innerHTML = `<option value="" disabled selected>— Valitse nimesi —</option>` +
    loginCandidates().map(p => `<option value="${p.name}">${p.name}</option>`).join("");
}
fillLoginOptions();

// ---------- Build people chips (current user + cat-1 dependents) ----------
function fillPeopleChips() {
  const names = registerableNames(currentUser);
  peopleChipsEl.innerHTML = names.map(n => {
    const suffix = n === currentUser ? " (sinä)" : "";
    return `
      <label class="chip">
        <input type="checkbox" name="person" value="${escapeHtml(n)}" />
        <span>${escapeHtml(n)}${suffix}</span>
      </label>
    `;
  }).join("");
  // Piilota hint jos ryhmässä ei ole pieniä lapsia (chipsejä vain yksi).
  if (peopleHintEl) {
    peopleHintEl.classList.toggle("hidden", names.length <= 1);
  }
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
  heroGreeting.innerHTML = `Tervetuloa juhliin<br>${escapeHtml(name)}!`;
  fillPeopleChips();
  resetFormToDefault();
  setView("app");
  subscribeRsvps();
  subscribeGuess();
}

function canEditOrDelete(row) {
  if (!currentUser) return false;
  if (row.name === currentUser) return true;
  if (row.submittedBy === currentUser) return true;
  // Saman perheryhmän jäsenet saavat muokata toistensa rivejä.
  const rowGroup = groupOf(row.name);
  if (rowGroup >= 0 && rowGroup === groupOf(currentUser)) return true;
  return false;
}

function getSelectedPeople() {
  return Array.from(peopleChipsEl.querySelectorAll('input[name="person"]:checked')).map(c => c.value);
}

// ---------- Login ----------
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = loginNameSel.value;
  loginError.textContent = "";

  if (!name) {
    loginError.textContent = "Valitse nimesi listasta.";
    return;
  }

  saveSession(name);
  enterApp(name);
});

logoutBtn.addEventListener("click", () => {
  if (unsubscribeRsvps) { unsubscribeRsvps(); unsubscribeRsvps = null; }
  if (unsubscribeGuess) { unsubscribeGuess(); unsubscribeGuess = null; }
  clearSession();
  currentUser = null;
  currentGuess = null;
  editingGuess = false;
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
  if (e.target.name === "person") {
    updateFormLabels();
  }
});

// Monikko kun valittuja on useampi kuin yksi (ei koske edit-moodia, joka on aina yhdelle).
function updateFormLabels() {
  const isMulti = !editingName && getSelectedPeople().length > 1;
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set("lbl-attending",  isMulti ? "Tuletteko juhliin?" : "Tuletko juhliin?");
  set("lbl-attend-yes", isMulti ? "Tulemme mukaan"    : "Tulen mukaan");
  set("lbl-attend-no",  isMulti ? "Emme pääse"        : "En pääse");
  set("lbl-overnight",  isMulti ? "Yövyttekö meillä?" : "Yövytkö meillä?");
  set("lbl-night-ei",   isMulti ? "Emme yövy"         : "En yövy");
}

// "maybe" ja "yes" → overnight-ryhmä aktiivinen.
function attendingAllowsOvernight(att) { return att === "yes" || att === "maybe"; }

// ---------- Form modes ----------
function resetFormToDefault() {
  editingName = null;
  rsvpForm.reset();

  peopleChipsEl.classList.remove("hidden");
  singlePersonEl.classList.add("hidden");

  peopleChipsEl.querySelectorAll('input[name="person"]').forEach(cb => {
    cb.checked = (cb.value === currentUser);
    cb.disabled = false;
  });

  overnightGroup.classList.remove("disabled");
  formModeLabel.textContent = "";
  formModeLabel.classList.remove("editing");
  if (formHeaderEl) formHeaderEl.classList.add("hidden");
  cancelEditBtn.classList.add("hidden");
  rsvpSubmitBtn.textContent = "Lähetä ilmoittautuminen";
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";
  updateFormLabels();
}

function enterEditMode(row) {
  editingName = row.name;

  peopleChipsEl.classList.add("hidden");
  singlePersonEl.classList.remove("hidden");
  singlePersonNameEl.textContent = row.name;
  if (peopleHintEl) peopleHintEl.classList.add("hidden");

  const attendingVal = row.attending || (row.attending === false ? "no" : "yes");
  const radio = rsvpForm.querySelector(`input[name="attending"][value="${attendingVal}"]`);
  if (radio) radio.checked = true;

  rsvpForm.querySelectorAll('input[name="overnight"]').forEach(cb => {
    cb.checked = (row.nights || []).includes(cb.value);
  });
  overnightGroup.classList.toggle("disabled", !attendingAllowsOvernight(attendingVal));

  rsvpNotes.value = row.notes || "";

  formModeLabel.textContent = `Muokataan: ${row.name}`;
  formModeLabel.classList.add("editing");
  if (formHeaderEl) formHeaderEl.classList.remove("hidden");
  cancelEditBtn.classList.remove("hidden");
  rsvpSubmitBtn.textContent = "Tallenna muutokset";
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";
  updateFormLabels();

  rsvpForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

cancelEditBtn.addEventListener("click", () => {
  resetFormToDefault();
  // Palauta hint jos ryhmässä on cat 1 -lapsia.
  if (peopleHintEl && registerableNames(currentUser).length > 1) {
    peopleHintEl.classList.remove("hidden");
  }
});

// ---------- Submit RSVP ----------
rsvpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  rsvpMsg.textContent = "";
  rsvpMsg.style.color = "";

  const attending = rsvpForm.querySelector('input[name="attending"]:checked')?.value;
  const nights = Array.from(rsvpForm.querySelectorAll('input[name="overnight"]:checked')).map(c => c.value);
  const notes = rsvpNotes.value.trim();

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
      const submittedBy = editingName && existing
        ? (existing.submittedBy || currentUser)
        : currentUser;

      const payload = {
        name: person,
        attending,
        nights: attendingAllowsOvernight(attending) ? nights : [],
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

function renderMemberRow(r) {
  const att = typeof r.attending === "string"
    ? r.attending
    : (r.attending ? "yes" : "no");
  const statusText = ATTENDING_LABELS[att] || "Tulossa";
  const attClass = att === "yes" ? "attending" : att === "maybe" ? "maybe" : "declined";

  const nightsText = (attendingAllowsOvernight(att) && r.nights?.length)
    ? r.nights.map(n => OVERNIGHT_LABELS[n] || n).join(", ")
    : "";

  const metaParts = [`<span class="status">${statusText}</span>`];
  if (nightsText) metaParts.push(escapeHtml(nightsText));
  const meta = `<p class="meta">${metaParts.join(" · ")}</p>`;

  const notes = r.notes ? `<p class="notes">${escapeHtml(r.notes)}</p>` : "";

  const actions = canEditOrDelete(r)
    ? `<div class="row-actions">
        <button class="row-action edit" data-action="edit" data-name="${escapeHtml(r.name)}" aria-label="Muokkaa" title="Muokkaa">${ICON_PENCIL}</button>
        <button class="row-action delete" data-action="delete" data-name="${escapeHtml(r.name)}" aria-label="Poista" title="Poista">${ICON_TRASH}</button>
       </div>`
    : "";

  const role = roleOf(r.name);
  const nameHtml = role
    ? `${escapeHtml(r.name)}<span class="role">, ${escapeHtml(role)}</span>`
    : escapeHtml(r.name);

  return `
    <div class="member-row ${attClass}">
      ${actions}
      <h3 class="name">${nameHtml}</h3>
      ${meta}
      ${notes}
    </div>
  `;
}

function renderRsvps(items) {
  if (!items.length) {
    rsvpListEl.innerHTML = `<p class="empty">Ei vielä ilmoittautumisia. Ole ensimmäinen!</p>`;
    return;
  }

  const userGroup = currentUser ? groupOf(currentUser) : -1;

  // Ryhmittele perheen mukaan. Tuntemattomat (-1) loppuun.
  const byGroup = new Map();
  for (const r of items) {
    const g = groupOf(r.name);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(r);
  }

  // Perhekortin sisällä: aikuiset (cat 3) → cat 2 → cat 1, nimi aakkosjärjestyksessä kategorian sisällä.
  const groupsArr = [...byGroup.entries()].map(([g, members]) => {
    const sorted = [...members].sort((a, b) =>
      (catOf(b.name) - catOf(a.name)) || a.name.localeCompare(b.name, "fi")
    );
    // "first" = ensimmäinen nimi aakkosellisesti, jotta ryhmien välinen lajittelu pysyy vakaana.
    const firstAlpha = [...members].sort((a, b) => a.name.localeCompare(b.name, "fi"))[0]?.name || "";
    return { g, members: sorted, first: firstAlpha };
  });
  groupsArr.sort((a, b) => {
    if (a.g === userGroup && b.g !== userGroup) return -1;
    if (b.g === userGroup && a.g !== userGroup) return 1;
    if (a.g === -1 && b.g !== -1) return 1;
    if (b.g === -1 && a.g !== -1) return -1;
    return a.first.localeCompare(b.first, "fi");
  });

  rsvpListEl.innerHTML = groupsArr.map(({ g, members }) => {
    const isOwn = g === userGroup;
    const rows = members.map(renderMemberRow).join("");
    return `<div class="family-card${isOwn ? " own" : ""}">${rows}</div>`;
  }).join("");
}

rsvpListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".row-action");
  if (!btn) return;
  const action = btn.dataset.action;
  const name = btn.dataset.name;
  if (!action || !name) return;
  const row = currentRsvps.find(r => r.name === name);
  if (!row) return;
  if (action === "edit") enterEditMode(row);
  if (action === "delete") handleDelete(name);
});

// ---------- Nimiarvaus ----------
function subscribeGuess() {
  if (unsubscribeGuess) unsubscribeGuess();
  unsubscribeGuess = onSnapshot(guessesCol, (snap) => {
    allGuesses = snap.docs.map(d => d.data());
    currentGuess = allGuesses.find(g => g.name === currentUser) || null;
    renderGuess();
    renderGuessCloud();
  }, (err) => console.error(err));
}

function renderGuessCloud() {
  const others = allGuesses.filter(g => g.name !== currentUser && g.guess);
  if (!others.length) {
    guessCloudEl.innerHTML = "";
    return;
  }
  const sorted = [...others].sort((a, b) => a.name.localeCompare(b.name, "fi"));
  guessCloudEl.innerHTML = sorted.map(g => {
    const firstName = g.name.split(" ")[0];
    const role = roleOf(g.name);
    const byText = role ? `${firstName}, ${role}` : firstName;
    return `
      <div class="guess-bubble">
        <p class="bubble-name">${escapeHtml(g.guess)}</p>
        <p class="bubble-by">— ${escapeHtml(byText)}</p>
      </div>
    `;
  }).join("");
}

function renderGuess() {
  const hasGuess = !!currentGuess?.guess;
  if (hasGuess && !editingGuess) {
    // Näytä tallennetun arvauksen näkymä, piilota lomake.
    guessViewValueEl.textContent = currentGuess.guess;
    guessViewEl.classList.remove("hidden");
    guessForm.classList.add("hidden");
    guessMsg.textContent = "";
  } else {
    // Näytä lomake. Täytä nykyinen arvaus jos muokataan, muuten tyhjä.
    guessViewEl.classList.add("hidden");
    guessForm.classList.remove("hidden");
    if (editingGuess && hasGuess) {
      guessInput.value = currentGuess.guess;
      guessSubmitBtn.textContent = "Tallenna muutokset";
      guessCancelBtn.classList.remove("hidden");
    } else {
      guessInput.value = "";
      guessSubmitBtn.textContent = "Tallenna arvaus";
      guessCancelBtn.classList.add("hidden");
    }
  }
}

guessEditBtn.addEventListener("click", () => {
  editingGuess = true;
  renderGuess();
  guessInput.focus();
});

guessCancelBtn.addEventListener("click", () => {
  editingGuess = false;
  guessMsg.textContent = "";
  renderGuess();
});

guessForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  guessMsg.textContent = "";
  guessMsg.style.color = "";
  const guess = guessInput.value.trim();
  if (!guess) {
    guessMsg.textContent = "Kirjoita arvauksesi.";
    guessMsg.style.color = "#a33a3a";
    return;
  }
  guessSubmitBtn.disabled = true;
  const origLabel = guessSubmitBtn.textContent;
  guessSubmitBtn.textContent = "Tallennetaan…";
  try {
    await setDoc(doc(guessesCol, currentUser), {
      name: currentUser,
      guess,
      updatedAt: serverTimestamp()
    }, { merge: true });
    editingGuess = false;
    // renderGuess kutsutaan onSnapshotin kautta kun data päivittyy.
  } catch (err) {
    console.error(err);
    guessMsg.textContent = "Arvauksen tallennus ei onnistunut.";
    guessMsg.style.color = "#a33a3a";
    guessSubmitBtn.textContent = origLabel;
  } finally {
    guessSubmitBtn.disabled = false;
  }
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
if (existing && PEOPLE.some(p => p.name === existing && p.cat >= 2)) {
  enterApp(existing);
}
