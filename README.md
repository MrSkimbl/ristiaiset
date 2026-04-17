# Ristiäiset & Lasten juhlat — 24.7.2026

Yksityinen staattinen juhlasivusto, jossa kutsutut voivat kirjautua yksinkertaisella salasanalla, nähdä ohjelman ja ilmoittautua. Sivusto hostataan Firebase Hostingissa ja RSVP-tiedot tallentuvat Firestoreen.

**Live:** https://ristiaiset-2026.web.app
**Firebase-projekti:** `ristiaiset-2026`
**Omistaja:** kimmo.louhelainen@gmail.com

---

## Arkkitehtuuri

- **Frontend:** puhdas HTML + CSS + ES-moduuli-JS. Ei rakennusvaihetta.
- **Hosting:** Firebase Hosting (`public/` -kansio juurena).
- **Tietokanta:** Firestore (yksi kokoelma `rsvps`).
- **Autentikointi:** jaettu salasana UI-tasolla — ei Firebase Authia.
- **Fontit:** Google Fonts (Cormorant Garamond + Inter).
- **Kuvat:** embed Wikimedia Commons (Petäjäveden vanha kirkko).

```
.
├── firebase.json         # Hosting + Firestore rules config
├── firestore.rules       # Firestoren suojaus
├── .firebaserc           # projekti-alias
├── public/
│   ├── index.html        # koko sivu (login + juhla-näkymä)
│   ├── styles.css        # tyyli (dusty rose + cream + plum)
│   ├── app.js            # kirjautuminen, ilmoittautuminen, lista
│   └── firebase-config.js # web-SDK config (julkiset avaimet)
└── README.md
```

---

## Keskeiset käyttäjälähtöiset säännöt

Seuraa näitä kun teet muutoksia — nämä on sovittu käyttäjän (Kimmo) kanssa:

1. **Kieli:** kaikki UI-teksti on suomea.
2. **Salasana:** `heinakuu2026` (vertailussa poistetaan diakriitit ja case → `heinäkuu2026` toimii myös). Määritelty `app.js`-tiedostossa `SHARED_PASSWORD`-vakiossa.
3. **Vieraat rakenteessa `HOUSEHOLDS`** (`app.js`):
   - `primary` = kirjautuva henkilö (näkyy login-dropdownissa).
   - `members` = lisähenkilöt, joita primary voi ilmoittaa (näkyy chipeissä login jälkeen, eivät kirjaudu itse).
4. **RSVP-logiikka:**
   - Dokumentin ID = henkilön nimi (yksi rivi per henkilö, uusi tallennus ylikirjoittaa).
   - Multi-select: yksi submit voi luoda / päivittää usean henkilön RSVP:n samoilla tiedoilla.
   - Edit-moodi: yhdelle henkilölle kerrallaan, `editingName` hallitsee tilaa.
   - **Muokkaus/poisto-oikeus** rivillä: `row.name === currentUser || row.submittedBy === currentUser`.
5. **Firestore-säännöt** ovat löysät (UI-taso gatea sisäänpääsyä). Dokumenttien datan muoto kuitenkin validoidaan säännöissä.
6. **Kuohun osoite:** Joensuunmutka 40, 41930 Kuohu.
7. **Kirkko:** Petäjäveden vanha kirkko, Vanhankirkontie 9, 41900 Petäjävesi, klo 14.
8. **Muistaminen-osio:** tilinumerot placeholder-muodossa (`FI00 0000 0000 0000 00`). Oikeat IBANit käyttäjän päätettävissä.

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

### Lisää uusi vieras tai muokkaa ryhmiä

`public/app.js`:

```js
const HOUSEHOLDS = [
  { primary: "Maire",   members: ["Vesa"] },
  { primary: "Heidi",   members: [] },
  ...
];
```

- Lisää uusi primary → näkyy login-dropdownissa.
- Lisää `members`-listaan → näkyy primaryn chip-valinnoissa, ei kirjaudu itse.

Muista bump-ata `?v=N` parametri HTML:ssä ja deployata.

### Vaihda salasana

`public/app.js` → `const SHARED_PASSWORD = "uusi"`. Normalisointi poistaa diakriitit ja laskee case:n, joten käyttäjä voi kirjoittaa esim. "Uusi" tai "uüsi".

### Vaihda tilinumerot (Muistaminen-osio)

`public/index.html` → etsi `<div class="accounts">` ja korvaa `FI00 0000 0000 0000 00` oikeilla IBAN-tunnuksilla. Voit lisätä/poistaa `.account`-blokkeja.

### Vaihda kuva

Hero-kuva on CSS-taustakuva: `public/styles.css` → `.hero { background: url('...'); }`. Vaihda URL tai lataa kuva `public/`-kansioon ja viittaa suhteellisesti (`url('oma-kuva.jpg')`).

---

## Tietoturva / yksityisyys

- Kyseessä on yksityinen perhesivusto → jaettu salasana on UX-tason lukko, ei oikeaa turvaa.
- Firestore-säännöt sallivat kaikkien luku-, luonti-, muokkaus- ja poisto-operaatiot `rsvps`-kokoelmassa. Valotteko:
  - Luodun/muokatun dokumentin **muoto** validoidaan (name string, attending bool, notes max 500 merk.).
  - Mitään muuta kokoelmaa ei sallita.
- Jos sivusto vuotaa (URL tai salasana), tietoina ovat vain vieraiden nimet + tulemista koskevat vastaukset. Ei sensitiivisiä kenttiä.

---

## Tehtävien tila (live-projekti)

- ✅ Firebase-projekti luotu: `ristiaiset-2026`
- ✅ Web-sovellus rekisteröity
- ✅ Firestore aktivoitu (EU-multi-region `eur3`)
- ✅ Hosting + rules deployattu
- ⏳ **Tilinumerot** täytyy vaihtaa placeholderista oikeiksi
- ⏳ **Kutsulistat / household-ryhmät** täytyy täydentää oikeiksi

---

## Yhteyshenkilö

Kimmo Louhelainen · kimmo.louhelainen@gmail.com
