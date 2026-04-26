// Ristiäiset: login, RSVP (itse + pienet lapset), nimiarvaus, live-lista
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, doc, setDoc, deleteDoc, addDoc, onSnapshot,
  serverTimestamp, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

// Kutsuttujen lista.
// cat: 1 = pieni lapsi (ei kirjaudu itse, saman ryhmän aikuinen/lapsi ilmoittaa)
//      2 = lapsi (ilmoitetaan vanhemman/sisaruksen kautta, ei kirjaudu itse)
//      3 = aikuinen (kirjautuu itse)
// group = perheryhmä. Ei näy missään UI:ssa, käytetään vain jotta vanhemmat
// saavat oman ryhmänsä jäsenet chip-valintoihin.
// role = suhde Mustikkaan (päätähti). Puolisot ja niin edelleen jäävät ilman roolia.
// gen = etunimen genitiivi (vain jos heuristiikka epäonnistuu: astevaihtelu
//       kk→k / pp→p / tt→t, tai konsonanttiloppuinen joka tarvitsee +in).
//       Muut palautuvat funktion oletukseen ("vokaali → +n").
const PEOPLE = [
  { name: "Aada Höynälä",          cat: 3, group: 16 },
  { name: "Aliisa Janatuinen",     cat: 2, group: 15 },
  { name: "Amanda Kutuk",          cat: 1, group: 18, role: "Pikkuserkku" },
  { name: "Antti Korhonen",        cat: 3, group: 14, gen: "Antin" },
  { name: "Ari-Pekka Salonen",     cat: 3, group: 19, gen: "Ari-Pekan" },
  { name: "Eija Luoto",            cat: 3, group: 20 },
  { name: "Eliel Luoto",           cat: 1, group: 3,  role: "Serkku", gen: "Elielin" },
  { name: "Elina Tähkiö",          cat: 3, group: 19 },
  { name: "Elisa Jokela",          cat: 3, group: 9,  role: "Jamin kummi" },
  { name: "Ellen Louhelainen",     cat: 2, group: 0,  role: "Sisko", gen: "Ellenin" },
  { name: "Elsi Jaakonvaara",      cat: 1, group: 13 },
  { name: "Emma Martikainen",      cat: 3, group: 7 },
  { name: "Emmi Juntunen",         cat: 3, group: 15 },
  { name: "Essi Rehell",           cat: 3, group: 3 },
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
  { name: "Jukka Ohtonen",         cat: 3, group: 9,  role: "Jamin kummi", gen: "Jukan" },
  { name: "Kerttu Valkonen",       cat: 3, group: 11, role: "Jamin kummi", gen: "Kertun" },
  { name: "Kimmo Louhelainen",     cat: 3, group: 0,  role: "Isä" },
  { name: "Leena Airaksinen",      cat: 2, group: 11 },
  { name: "Maija Kurki",           cat: 3, group: 13 },
  { name: "Maire Luoto",           cat: 3, group: 1,  role: "Mummi" },
  { name: "Mari Moisio",           cat: 3, group: 14 },
  { name: "Martti Louhelainen",    cat: 3, group: 6,  role: "Ukki", gen: "Martin" },
  { name: "Matti Luoto",           cat: 3, group: 2,  role: "Eno", gen: "Matin" },
  { name: "Meme Kutuk",            cat: 3, group: 18 },
  { name: "Miisa Jaakonvaara",     cat: 2, group: 13 },
  { name: "Mikko Luoto",           cat: 3, group: 3,  role: "Eno", gen: "Mikon" },
  { name: "Mila Kutuk",            cat: 2, group: 18, role: "Pikkuserkku" },
  { name: "Milla Nevanpää",        cat: 2, group: 14 },
  { name: "Mustikka Louhelainen",  cat: 1, group: 0,  role: "Päätähti", gen: "Mustikan" },
  { name: "Neela Ax",              cat: 2, group: 8,  role: "Serkku" },
  { name: "Nelli Nevanpää",        cat: 2, group: 14 },
  { name: "Oiva Ax",               cat: 2, group: 8,  role: "Serkku" },
  { name: "Oliver Brouk",          cat: 2, group: 10, gen: "Oliverin" },
  { name: "Olivia Brouk",          cat: 2, group: 10 },
  { name: "Olli Patrakka",         cat: 3, group: 4 },
  { name: "Olli-Pekka Höynälä",    cat: 3, group: 16, gen: "Olli-Pekan" },
  { name: "Onni Korhonen",         cat: 1, group: 14 },
  { name: "Pete Luoto",            cat: 3, group: 20 },
  { name: "Petra Salonen",         cat: 3, group: 18 },
  { name: "Pia Ax",                cat: 3, group: 17 },
  { name: "Päivi Karvala",         cat: 3, group: 12, role: "Iivon kummi" },
  { name: "Sanna Ax",              cat: 3, group: 8,  role: "Täti" },
  { name: "Seppo Tähkiö",          cat: 3, group: 6,  role: "Isoukki", gen: "Sepon" },
  { name: "Tero Airaksinen",       cat: 3, group: 11, role: "Jamin kummi" },
  { name: "Timi Airaksinen",       cat: 2, group: 11 },
  { name: "Tomi Brouk",            cat: 3, group: 10, role: "Ellenin kummi" },
  { name: "Tuomo Janatuinen",      cat: 3, group: 15 },
  { name: "Tuukka Airaksinen",     cat: 2, group: 11, gen: "Tuukan" },
  { name: "Vauva Janatuinen",      cat: 1, group: 15 },
  { name: "Vesa Luoto",            cat: 3, group: 1,  role: "Vaari" },
  { name: "Viola Brouk",           cat: 2, group: 10 },
  { name: "Vivian Wilen",          cat: 2, group: 5,  role: "Serkku", gen: "Vivianin" },
  { name: "William Wilen",         cat: 1, group: 5,  role: "Serkku", gen: "Williamin" },
];

function personByName(name) { return PEOPLE.find(p => p.name === name); }
function catOf(name)   { return personByName(name)?.cat   ?? 0; }
function groupOf(name) { return personByName(name)?.group ?? -1; }
function roleOf(name)  { return personByName(name)?.role  ?? ""; }
function firstNameOf(name) { return String(name || "").split(" ")[0]; }

// Lapsista (cat 1 ja 2) näytetään UI:ssa vain etunimi. Aikuisilla (cat 3)
// koko nimi, jolloin esim. kaksi Jenniä erottuvat toisistaan luonnostaan.
function displayName(fullName) {
  const p = personByName(fullName);
  if (!p) return fullName || "";
  return p.cat <= 2 ? firstNameOf(fullName) : fullName;
}

// Etunimen genitiivi. Käyttää ensin PEOPLE-listan gen-kenttää (jos asetettu),
// muuten heuristiikkaa: vokaaliloppuiset +n, konsonanttiloppuiset +in.
function genitiveOf(fullName) {
  const p = personByName(fullName);
  if (p?.gen) return p.gen;
  const fn = firstNameOf(fullName);
  if (!fn) return "";
  return /[aeiouyäö]$/i.test(fn) ? fn + "n" : fn + "in";
}

// Login-dropdown: vain aikuiset (cat 3), aakkosjärjestyksessä.
// Lapset (cat 1 ja 2) ilmoitetaan vanhempansa kautta perheryhmän chip-valinnoilla.
function loginCandidates() {
  return PEOPLE
    .filter(p => p.cat >= 3)
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
const auditCol = collection(db, "audit");

// Audit-loki: jokainen kirjoitus rsvps/guesses-kokoelmiin tallennetaan lisäksi
// audit-kokoelmaan, jotta historia voidaan tarvittaessa palauttaa (esim. jos
// joku alkaa spämmätä tai pyyhkii vastauksia). Säännöt sallivat vain create:n
// clientiltä, ei luku/muokkaus/poistoa.
async function logAudit(action, target, payload) {
  try {
    await addDoc(auditCol, {
      ts: serverTimestamp(),
      action: String(action || ""),
      target: String(target || ""),
      by: String(currentUser || "(unknown)"),
      payload: payload || {}
    });
  } catch (err) {
    // Älä rikota käyttäjäpolkua jos audit epäonnistuu.
    console.warn("Audit-loki epäonnistui:", action, target, err);
  }
}

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
const guessCloudEl = document.getElementById("guess-cloud");
const guessPeopleEl = document.getElementById("guess-people");
const guessPeopleGroupEl = document.getElementById("guess-people-group");
const guessInputLabelEl = document.getElementById("guess-input-label");
const guessExistingHintEl = document.getElementById("guess-existing-hint");

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
let editingName = null;
let selectedGuessPerson = null;
let unsubscribeRsvps = null;
let unsubscribeGuess = null;

// ---------- Build login dropdown ----------
function fillLoginOptions() {
  loginNameSel.innerHTML = `<option value="" disabled selected>Valitse nimesi</option>` +
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
        <span>${escapeHtml(displayName(n))}${suffix}</span>
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
  selectedGuessPerson = name;
  heroGreeting.innerHTML = `Tervetuloa juhliin<br>${escapeHtml(firstNameOf(name))}!`;
  fillPeopleChips();
  fillGuessPeopleChips();
  resetFormToDefault();
  renderGuessForm();
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
  selectedGuessPerson = null;
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
  singlePersonNameEl.textContent = displayName(row.name);
  if (peopleHintEl) peopleHintEl.classList.add("hidden");

  const attendingVal = row.attending || (row.attending === false ? "no" : "yes");
  const radio = rsvpForm.querySelector(`input[name="attending"][value="${attendingVal}"]`);
  if (radio) radio.checked = true;

  rsvpForm.querySelectorAll('input[name="overnight"]').forEach(cb => {
    cb.checked = (row.nights || []).includes(cb.value);
  });
  overnightGroup.classList.toggle("disabled", !attendingAllowsOvernight(attendingVal));

  rsvpNotes.value = row.notes || "";

  formModeLabel.textContent = `Muokataan: ${displayName(row.name)}`;
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
    const writes = people.map(async (person) => {
      const existing = currentRsvps.find(r => r.name === person);
      const submittedBy = editingName && existing
        ? (existing.submittedBy || currentUser)
        : currentUser;

      // Terveiset/huomiot ovat henkilökohtaisia: ne tallennetaan vain ilmoittajalle
      // itselleen (tai muokkaustilassa muokattavalle henkilölle), ei muille saman
      // perheen jäsenille.
      const personalNotes = editingName
        ? (person === editingName ? notes : (existing?.notes || ""))
        : (person === currentUser ? notes : (existing?.notes || ""));

      const payload = {
        name: person,
        attending,
        nights: attendingAllowsOvernight(attending) ? nights : [],
        notes: personalNotes,
        submittedBy,
        lastEditedBy: currentUser,
        updatedAt: serverTimestamp()
      };
      await setDoc(doc(rsvpsCol, person), payload, { merge: true });
      // Tallenna sama tieto audit-lokiin (ilman serverTimestamp-merkkiä).
      logAudit("rsvp_save", person, {
        attending: payload.attending,
        nights: payload.nights,
        notes: payload.notes,
        submittedBy: payload.submittedBy,
        lastEditedBy: payload.lastEditedBy
      });
    });
    await Promise.all(writes);

    rsvpMsg.textContent = editingName
      ? `${genitiveOf(editingName)} tiedot päivitetty.`
      : (people.length === 1
          ? `Kiitos! ${displayName(people[0])} on ilmoitettu.`
          : `Kiitos! ${people.length} henkilöä ilmoitettu (${people.map(displayName).join(", ")}).`);
    rsvpMsg.style.color = "";
    const submittedAttending = attending;
    const wasEdit = !!editingName;
    resetFormToDefault();
    if (!wasEdit) showWelcomeModal(submittedAttending);
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
  const ok = confirm(`Poistetaanko ${genitiveOf(name)} ilmoittautuminen?`);
  if (!ok) return;
  try {
    await deleteDoc(doc(rsvpsCol, name));
    logAudit("rsvp_delete", name, {});
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
  const dispName = displayName(r.name);
  const nameHtml = role
    ? `${escapeHtml(dispName)}<span class="role">, ${escapeHtml(role)}</span>`
    : escapeHtml(dispName);

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
    renderGuessForm();
    renderGuessCloud();
  }, (err) => console.error(err));
}

function fillGuessPeopleChips() {
  const names = registerableNames(currentUser);
  // Jos käyttäjä on yksin perheryhmässä (ei muita arvattavia), valitsin piiloon.
  if (names.length <= 1) {
    guessPeopleGroupEl.classList.add("hidden");
    return;
  }
  guessPeopleGroupEl.classList.remove("hidden");
  guessPeopleEl.innerHTML = names.map(n => {
    const isSelf = n === currentUser;
    const label = isSelf ? `${n.split(" ")[0]} (sinä)` : n.split(" ")[0];
    const checked = n === selectedGuessPerson ? "checked" : "";
    return `
      <label class="chip">
        <input type="radio" name="guess-person" value="${escapeHtml(n)}" ${checked} />
        <span>${escapeHtml(label)}</span>
      </label>
    `;
  }).join("");
}

guessPeopleEl?.addEventListener("change", (e) => {
  if (e.target.name === "guess-person") {
    selectedGuessPerson = e.target.value;
    guessMsg.textContent = "";
    renderGuessForm();
    guessInput.focus();
  }
});

function renderGuessForm() {
  if (!selectedGuessPerson) return;
  const personGuess = allGuesses.find(g => g.name === selectedGuessPerson);
  const hasGuess = !!personGuess?.guess;
  const isSelf = selectedGuessPerson === currentUser;
  const gen = genitiveOf(selectedGuessPerson);

  if (guessInputLabelEl) {
    guessInputLabelEl.textContent = isSelf
      ? "Oma arvaukseni"
      : `${gen} arvaus`;
  }

  guessInput.value = personGuess?.guess || "";
  guessSubmitBtn.textContent = hasGuess ? "Tallenna muutokset" : "Tallenna arvaus";

  if (guessExistingHintEl) {
    if (hasGuess) {
      guessExistingHintEl.textContent = isSelf
        ? "Aiempi arvauksesi on yllä. Voit muokata sitä."
        : `${gen} aiempi arvaus on yllä, voit muokata sitä.`;
      guessExistingHintEl.classList.remove("hidden");
    } else {
      guessExistingHintEl.textContent = "";
      guessExistingHintEl.classList.add("hidden");
    }
  }
}

function renderGuessCloud() {
  const others = allGuesses.filter(g => g.name !== currentUser && g.guess);
  if (!others.length) {
    guessCloudEl.innerHTML = "";
    return;
  }
  const sorted = [...others].sort((a, b) => a.name.localeCompare(b.name, "fi"));
  guessCloudEl.innerHTML = sorted.map(g => {
    // Lapset näytetään etunimellä, aikuiset koko nimellä (jolloin esim. kaksi
    // samannimistä aikuista erottuvat toisistaan luonnostaan).
    const dispName = displayName(g.name);
    const role = roleOf(g.name);
    const byText = role ? `${dispName}, ${role}` : dispName;
    return `
      <div class="guess-bubble">
        <p class="bubble-name">${escapeHtml(g.guess)}</p>
        <p class="bubble-by">${escapeHtml(byText)}</p>
      </div>
    `;
  }).join("");
}

guessForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  guessMsg.textContent = "";
  guessMsg.style.color = "";
  const guess = guessInput.value.trim();
  const target = selectedGuessPerson || currentUser;
  if (!guess) {
    guessMsg.textContent = "Kirjoita arvaus.";
    guessMsg.style.color = "#a33a3a";
    return;
  }
  guessSubmitBtn.disabled = true;
  const origLabel = guessSubmitBtn.textContent;
  guessSubmitBtn.textContent = "Tallennetaan…";
  try {
    await setDoc(doc(guessesCol, target), {
      name: target,
      guess,
      submittedBy: currentUser,
      updatedAt: serverTimestamp()
    }, { merge: true });
    logAudit("guess_save", target, { guess, submittedBy: currentUser });
    const isSelf = target === currentUser;
    guessMsg.textContent = isSelf
      ? "Arvaus tallennettu."
      : `${genitiveOf(target)} arvaus tallennettu.`;
    guessMsg.style.color = "";
    // renderGuessForm kutsutaan onSnapshotin kautta kun data päivittyy.
  } catch (err) {
    console.error(err);
    guessMsg.textContent = "Arvauksen tallennus ei onnistunut.";
    guessMsg.style.color = "#a33a3a";
    guessSubmitBtn.textContent = origLabel;
  } finally {
    guessSubmitBtn.disabled = false;
  }
});

// ---------- Kalenterikutsut ----------
// Google avataan web-URL:lla. Outlook ja Apple lataavat saman .ics-tiedoston:
// Outlookin web-deeplink on epäluotettava (mm. tulkitsee aikavyöhykkeen
// väärin), joten .ics on selvästi paras vaihtoehto.
const EVENT_DATA = {
  title: "Mustikan ristiäiset ja kesäjuhlat",
  startLocal: "20260724T140000",
  endLocal:   "20260724T220000",
  location:   "Petäjäveden vanha kirkko, Vanhankirkontie 9, 41900 Petäjävesi",
  description: "Klo 14.00 ristiäiset Petäjäveden vanhassa kirkossa. Klo 14.30 juhlatilaisuus Lemettilän Tilalla, Siltatie 23. Illalla kesäjuhlat Kuohulla, Joensuunmutka 40."
};

function buildCalendarLinks() {
  const googleUrl =
    "https://calendar.google.com/calendar/render?action=TEMPLATE" +
    `&text=${encodeURIComponent(EVENT_DATA.title)}` +
    `&dates=${EVENT_DATA.startLocal}/${EVENT_DATA.endLocal}` +
    `&ctz=Europe/Helsinki` +
    `&details=${encodeURIComponent(EVENT_DATA.description)}` +
    `&location=${encodeURIComponent(EVENT_DATA.location)}`;

  // Itsenäinen VTIMEZONE-määrittely tekee aikavyöhykkeestä yksiselitteisen
  // kaikille kalenteriasiakkaille (Outlook desktop/web, Apple Calendar, ym.).
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mustikan ristiaiset//FI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VTIMEZONE",
    "TZID:Europe/Helsinki",
    "BEGIN:STANDARD",
    "DTSTART:19701025T040000",
    "TZOFFSETFROM:+0300",
    "TZOFFSETTO:+0200",
    "TZNAME:EET",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19700329T030000",
    "TZOFFSETFROM:+0200",
    "TZOFFSETTO:+0300",
    "TZNAME:EEST",
    "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
    "BEGIN:VEVENT",
    "UID:mustikan-ristiaiset-2026-07-24@louhelainen.fi",
    "DTSTAMP:20260101T000000Z",
    "DTSTART;TZID=Europe/Helsinki:" + EVENT_DATA.startLocal,
    "DTEND;TZID=Europe/Helsinki:" + EVENT_DATA.endLocal,
    "SUMMARY:" + EVENT_DATA.title,
    "LOCATION:" + EVENT_DATA.location,
    "DESCRIPTION:" + EVENT_DATA.description.replace(/\n/g, "\\n"),
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\r\n");
  const icsUrl = "data:text/calendar;charset=utf-8," + encodeURIComponent(ics);

  const gEl = document.getElementById("cal-google");
  const iEl = document.getElementById("cal-ics");
  if (gEl) gEl.href = googleUrl;
  if (iEl) iEl.href = icsUrl;
}
buildCalendarLinks();

// ---------- Tervetuloa-modal ilmoittautumisen jälkeen ----------
const welcomeModal = document.getElementById("welcome-modal");
const welcomeModalTitle = document.getElementById("welcome-modal-title");
const welcomeModalLede = document.getElementById("welcome-modal-lede");
const welcomeModalText = document.getElementById("welcome-modal-text");
const welcomeModalWaTitle = document.getElementById("welcome-modal-wa-title");
const welcomeModalWaSub = document.getElementById("welcome-modal-wa-sub");

const MODAL_CONTENT = {
  yes: {
    title: "Kiitos ilmoittautumisesta!",
    lede:  "Ihana, että pääset juhlimaan kanssamme.",
    text:  "Liity vielä juhlien WhatsApp-ryhmään, niin pysyt mukana viestien ja kuvien tahdissa.",
    waTitle: "Tule WhatsApp-ryhmään",
    waSub:   "Kuvia, kuulumisia ja viestejä juhlista"
  },
  maybe: {
    title: "Kiitos vastauksesta!",
    lede:  "Toivottavasti pääset paikalle.",
    text:  "Voit päivittää tiedot myöhemmin samasta lomakkeesta tai ilmoittautuneiden listalta. Liity ihmeessä jo WhatsApp-ryhmään, niin pysyt mukana kuulumisissa.",
    waTitle: "Tule WhatsApp-ryhmään",
    waSub:   "Kuulumisia ja kuvia juhlapäivän tunnelmista"
  },
  no: {
    title: "Harmi, että et pääse",
    lede:  "Kiitos, että kerroit. Jäämme kaipaamaan sinua.",
    text:  "Voit silti liittyä WhatsApp-ryhmään, jos haluat nähdä juhlista kuvia ja kuulumisia.",
    waTitle: "Liity WhatsApp-ryhmään",
    waSub:   "Näe kuvat ja kuulumiset juhlista jälkikäteen"
  }
};

function showWelcomeModal(attending) {
  if (!welcomeModal) return;
  const c = MODAL_CONTENT[attending] || MODAL_CONTENT.yes;
  if (welcomeModalTitle)   welcomeModalTitle.textContent = c.title;
  if (welcomeModalLede)    welcomeModalLede.textContent = c.lede;
  if (welcomeModalText)    welcomeModalText.textContent = c.text;
  if (welcomeModalWaTitle) welcomeModalWaTitle.textContent = c.waTitle;
  if (welcomeModalWaSub)   welcomeModalWaSub.textContent = c.waSub;

  welcomeModal.classList.remove("hidden");
  // Pieni viive jotta CSS-transition käynnistyy.
  requestAnimationFrame(() => welcomeModal.classList.add("show"));
  document.body.style.overflow = "hidden";
}

function hideWelcomeModal() {
  if (!welcomeModal) return;
  welcomeModal.classList.remove("show");
  document.body.style.overflow = "";
  setTimeout(() => welcomeModal.classList.add("hidden"), 220);
}

if (welcomeModal) {
  welcomeModal.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) hideWelcomeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && welcomeModal.classList.contains("show")) {
      hideWelcomeModal();
    }
  });
}

// ---------- Kopioi tilinumero ----------
const toastEl = document.getElementById("toast");
let toastTimer = null;

function showToast(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add("show");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1800);
}

async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (_) { /* fall through */ }
  // Fallback vanhemmille selaimille / ei-secure-konteksteille.
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch (_) {
    return false;
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".copy-btn");
  if (!btn) return;
  const value = btn.dataset.copy;
  if (!value) return;
  const ok = await copyToClipboard(value);
  if (ok) {
    btn.classList.add("copied");
    setTimeout(() => btn.classList.remove("copied"), 1200);
    showToast("Kopioitu");
  } else {
    showToast("Kopiointi ei onnistunut");
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
if (existing && PEOPLE.some(p => p.name === existing && p.cat >= 3)) {
  enterApp(existing);
}
