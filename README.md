# Ristiäiset & Lasten juhlat — 24.7.2026

Yksityinen staattinen juhlasivusto, jossa kutsutut voivat kirjautua yksinkertaisella salasanalla, nähdä ohjelman ja ilmoittautua. Sivusto hostataan Firebase Hostingissa ja RSVP-tiedot tallentuvat Firestoreen.

**Live:** https://ristiaiset-2026.web.app
**Firebase-projekti:** `ristiaiset-2026`
**Omistaja:** kimmo.louhelainen@gmail.com

---

## Arkkitehtuuri

- **Frontend:** puhdas HTML + CSS + ES-moduuli-JS. Ei rakennusvaihetta.
- **Hosting:** Firebase Hosting (`public/` -kansio juurena).
- **Tietokanta:** Firestore. Kolme kokoelmaa: `rsvps` (ilmoittautumiset), `guesses` (Mustikan nimiarvaukset) ja `audit` (append-only kirjoitusloki, vain admin lukee).
- **Autentikointi:** ei autentikointia. Kirjautuminen on pelkkä nimen valinta dropdownista — turva luotu Firestore-säännöissä (whitelist + datan muoto) ja sen varassa, että URL on yksityinen.
- **Fontit:** Google Fonts (Cormorant Garamond + Inter).
- **Kuvat:** embed Wikimedia Commons (Petäjäveden vanha kirkko).

```
.
├── firebase.json         # Hosting + Firestore rules config
├── firestore.rules       # Firestoren suojaus (ml. sallittujen nimien whitelist)
├── .firebaserc           # projekti-alias
├── public/
│   ├── index.html        # koko sivu (login + juhla-näkymä)
│   ├── styles.css        # tyyli (dusty rose + cream + plum)
│   ├── app.js            # kirjautuminen, ilmoittautuminen, lista, arvaus
│   ├── favicon.svg       # sivuston ikoni (mustikka)
│   └── firebase-config.js # web-SDK config (julkiset avaimet)
├── scripts/
│   └── sync-names.mjs    # synkkaa PEOPLE → firestore.rules
└── README.md
```

---

## Keskeiset käyttäjälähtöiset säännöt

Seuraa näitä kun teet muutoksia — nämä on sovittu käyttäjän (Kimmo) kanssa:

1. **Kieli:** kaikki UI-teksti on suomea.
2. **Autentikointi:** ei Firebase Authia, ei UI-tason salasanaa. Kirjautuminen = valitse nimesi dropdownista. Pääsynhallinta tapahtuu Firestore-säännöissä (whitelist 66 nimelle) ja sen turvana, että URL jaetaan vain kutsutuille.
3. **Vieraat rakenteessa `PEOPLE`** (`app.js`): yksi flat-lista, jossa jokaisella kentät `{ name, cat, group, role? }`.
   - `cat: 3` = aikuinen, `cat: 2` = lapsi, `cat: 1` = pieni lapsi (ei kirjaudu itse).
   - `cat >= 2` näkyy login-dropdownissa; kaikilla kirjautuvilla samat oikeudet (login, RSVP, nimiarvaus).
   - `cat === 1` (pienet lapset): eivät kirjaudu. Saman `group`-numeron aikuinen/lapsi valitsee heidät chipeistä RSVP-lomakkeessa ja ilmoittaa heidät samassa yhteydessä.
   - `group`-numero on vain tekninen apu — **se ei näy UI:ssa missään**.
   - `role` (valinnainen) = suhde päätähteen (Mustikkaan). Näkyy pienellä versaalialalla nimen vieressä RSVP-listassa.
4. **RSVP-logiikka:**
   - Dokumentin ID = henkilön nimi (yksi rivi per henkilö).
   - Chip-valinta: itse + saman ryhmän cat 1 -lapset → samalla lähetyksellä voi ilmoittaa itsensä ja pienen lapsensa.
   - Edit-moodi: yhdelle henkilölle kerrallaan, `editingName` hallitsee tilaa.
   - **Muokkaus/poisto-oikeus** rivillä: `row.name === currentUser || row.submittedBy === currentUser`; lisäksi saman ryhmän jäsenet voivat muokata ryhmänsä cat 1 -lasten rivejä.
   - Lajittelu listassa ja login-dropdownissa: aikuiset (cat 3) ensin, sitten lapset (cat 2), RSVP-listassa myös cat 1 -lapset perässä; nimi aakkosjärjestyksessä kategorian sisällä.
5. **Nimiarvaus** (`guesses`-kokoelma):
   - Oma osio ja lomake, näkyy ennen RSVP:tä kirjautumisen jälkeen.
   - Vapaamuotoinen teksti, yksi arvaus per henkilö, muokattavissa milloin tahansa.
   - Saman perheryhmän jäsenet voivat tallentaa arvauksen toistensa puolesta (radio-chip valitsee kohteen).
   - Muiden arvaukset näkyvät kuplina lomakkeen alla.
6. **Audit-loki** (`audit`-kokoelma): jokainen RSVP- ja guess-kirjoitus tallennetaan myös tänne. Append-only sääntöjen tasolla — clientti ei voi lukea, muokata eikä poistaa. Käytetään historian palauttamiseen jos joku alkaa spämmätä tai pyyhkiä vastauksia.
7. **Tervetuloa-modaali:** ilmoittautumisen jälkeen avautuu pop-up, jonka sisältö vaihtelee vastauksen mukaan (`yes` / `maybe` / `no`). Sisältää WhatsApp-ryhmän linkin ja `yes`/`maybe`-vastauksissa myös kalenterikutsunappulat (Google Kalenteri + .ics Outlookiin/Appleen/muuhun).
8. **Firestore-säännöt**: dokumentin ID:n oltava yksi 66 whitelistatusta nimestä (`allowedName` `firestore.rules`:ssä). Sisällön muoto validoidaan (`rsvps` + `guesses`). `audit` on create-only. Muita kokoelmia ei sallita.
9. **Kuohun osoite:** Joensuunmutka 40, 41930 Kuohu.
10. **Kirkko:** Petäjäveden vanha kirkko, Vanhankirkontie 9, 41900 Petäjävesi, klo 14.
11. **Muistaminen-osio:** tilinumerot oikeissa muodoissaan (Jami, Ellen, Iivo, Mustikka/Heidin tili). Päivitettävissä `index.html`:n `.accounts`-blokista.

---

## Paikallinen kehitys

```bash
# Asenna firebase CLI jos puuttuu
npm install -g firebase-tools

# Kloonaa ja aja paikallisesti
git clone https://github.com/MrSkimbl/ristiaiset.git
cd ristiaiset
firebase login                # kertaluonteinen selainkirjautuminen
firebase emulators:start      # paikallinen testi osoitteessa http://localhost:5000
```

Ei tarvitse `npm install`ia — ei ole buildia. Voit myös avata `public/index.html` suoraan selaimessa, mutta silloin ES-moduuli-importit eivät välttämättä toimi `file://`-protokollassa — käytä kevyttä staattista serveriä:

```bash
npx serve public -p 5000
```

---

## Julkaisu (deploy)

Projekti on jo linkitetty Firebase-projektiin `ristiaiset-2026` (`.firebaserc`).

```bash
# kaikki
firebase deploy --project ristiaiset-2026

# vain hosting (nopea, tyypillinen)
firebase deploy --only hosting --project ristiaiset-2026

# rules (jos firestore.rules muuttui)
firebase deploy --only firestore:rules --project ristiaiset-2026
```

**Selainvälimuisti:** `index.html` ja JS/CSS palvellaan no-cache -otsakkeilla. Lisäksi `<script type="module" src="app.js?v=N">` version-parametri — **kasvata `v=N` aina kun `app.js` muuttuu** jotta ES-moduulivälimuisti ei lataa vanhaa.

---

## Yleisimmät muutokset

### Lisää / muokkaa kutsuvieraita

Osallistujalistaa muokataan vain ylläpitäjältä (sinä). Asiakaskirjoitukset Firestoreen on rajoitettu whitelistiin (`firestore.rules`), joten lisäyksen jälkeen on muistettava päivittää myös säännöt.

1. Muokkaa `public/app.js`:

   ```js
   const PEOPLE = [
     { name: "Kimmo Louhelainen",    cat: 3, group: 0 },  // aikuinen
     { name: "Iivo Louhelainen",     cat: 2, group: 0 },  // lapsi
     { name: "Mustikka Louhelainen", cat: 1, group: 0 },  // pieni lapsi — vanhempi ilmoittaa
   ];
   ```

   - `cat: 2` ja `cat: 3` → näkyvät login-dropdownissa, kirjautuvat itse.
   - `cat: 1` → ei kirjaudu. Sama `group` kuin muilla ryhmän jäsenillä → näkyy heidän RSVP-chipeissään.
   - Aakkosjärjestyksellä ei ole väliä — JS lajittelee listan ja rules-tiedosto generoidaan aakkosjärjestykseen.

2. Synkkaa nimet Firestore-sääntöihin:

   ```bash
   node scripts/sync-names.mjs
   ```

   Skripti lukee `PEOPLE`-listan `app.js`:stä ja kirjoittaa ne uudelleen `firestore.rules`:n `allowedName`-funktioon.

3. Bump-aa `?v=N`-parametri HTML:ssä ja deployaa molemmat:

   ```bash
   firebase deploy --only hosting,firestore:rules --project ristiaiset-2026
   ```

Jos skipppaat vaiheen 2, uusi vieras näkyy UI:ssa mutta Firestore hylkää hänen RSVP:nsä — jolloin sivusto virheilee kun hän yrittää tallentaa.

### Vaihda tilinumerot (Muistaminen-osio)

`public/index.html` → etsi `<div class="accounts">` ja korvaa `FI00 0000 0000 0000 00` oikeilla IBAN-tunnuksilla. Voit lisätä/poistaa `.account`-blokkeja.

### Vaihda kuva

Hero-kuva on CSS-taustakuva: `public/styles.css` → `.hero { background: url('...'); }`. Vaihda URL tai lataa kuva `public/`-kansioon ja viittaa suhteellisesti (`url('oma-kuva.jpg')`).

---

## Tietoturva / yksityisyys

- Kyseessä on yksityinen perhesivusto. Ei salasanaa eikä autentikointia — URL on se jakoavain.
- **Firestore-säännöt** (`firestore.rules`) rajoittavat asiakaskirjoitukset:
  - Dokumentin ID:n on oltava yksi 66 whitelistatusta nimestä (`allowedName`-funktio).
  - `request.resource.data.name` on vastattava doc-ID:tä (estää spoofingin).
  - `attending ∈ {yes, maybe, no}`, `notes < 500`, `guess < 100` merkkiä.
  - `audit`-kokoelma: vain create. Ei luku-, muokkaus- eikä poisto-oikeutta clientille.
  - Muita kokoelmia ei sallita.
- Käytännössä: devtoolsin kautta ei pääse luomaan roskarivejä — vain olemassa olevien vieraiden rivejä voi muokata.
- Kotiosoite (Joensuunmutka 40) ja juhla-aika (24.7.2026) näkyvät kirjautumisen jälkeen. Jos URL vuotaa, huomioi että poissaolopäivä kotoa on potentiaalinen riski.

---

## Tehtävien tila (live-projekti)

- ✅ Firebase-projekti luotu: `ristiaiset-2026`
- ✅ Web-sovellus rekisteröity
- ✅ Firestore aktivoitu (EU-multi-region `eur3`)
- ✅ Hosting + rules deployattu
- ✅ Tilinumerot oikeat (Jami, Ellen, Iivo, Mustikka/Heidin tili)
- ✅ **Kutsulista (`PEOPLE`)** täytetty CSV:n mukaan (66 henkilöä, 21 perheryhmää)
- ✅ Audit-loki + WhatsApp- ja kalenterilinkit ilmoittautumismodaalissa

---

## Yhteyshenkilö

Kimmo Louhelainen · kimmo.louhelainen@gmail.com
