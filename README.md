# GAMEHUB

Vollbild-Desktop-Launcher für Browser-Spiele (Tetris, Snake, Schach, Tower Defense u. v. m.) – gebaut mit **HTML, CSS, JavaScript und PHP**.

* **Nur PC & Laptop:** Smartphones und Tablets sehen einen Hinweis (`assets/js/device-guard.js`, auf jeder Seite inkl. Spielen eingebunden).
* **Spiele starten im Launcher** (Vollbild-Player mit Timer, `Shift`+`Esc` beendet).
* **Steuerung:** `←`/`→` auswählen, `Enter` starten, `F` Favorit, `R` Zufallsspiel, `Strg`+`K` Suche.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Launcher (Bibliothek, Konto-Ansicht `#konto`, Spiel-Player) |
| `konto.html` | Leitet auf `/#konto` weiter |
| `login.html` | Startet den OAuth-Login |
| `api/callback.php` | OAuth-Callback: tauscht den Code gegen Tokens (PHP) |
| `assets/css/app.css` | Design-System (Farben, Komponenten, Responsive) |
| `assets/js/games.js` | **Spielkatalog** – neue Spiele hier eintragen |
| `assets/js/core.js` | Icons, lokaler Speicher (Sessions, Spielzeit, Favoriten), Auth |
| `assets/js/launcher.js` | Launcher-Oberfläche & Player |
| `assets/js/device-guard.js` | Sperre für Mobilgeräte |
| `assets/js/login.js` | OAuth-Weiterleitung |
| `games/*` | Die einzelnen Spiele |

## Neues Spiel hinzufügen

In `assets/js/games.js` ein Objekt ergänzen:

```js
{ id: "mein-spiel", name: "Mein Spiel", category: "Arcade", controls: "Tastatur", path: "/games/mein-spiel/index.html", icon: "/pictures/icons/mein-spiel.png", color: "#e254d6", description: "Kurzbeschreibung." }
```

`icon` ist optional – ohne Bild wird ein Farbsymbol mit Initialen erzeugt. Neue Kategorien bekommen ihre Farbe in `CATEGORY_COLORS`.

## Deployment

* **Vercel:** `vercel.json` nutzt die Community-Runtime `vercel-php` für `api/*.php`; `/api/callback` wird auf `callback.php` umgeschrieben.
* **Klassisches PHP-Hosting (Apache):** `.htaccess` liefert saubere URLs und die Callback-Route.

Umgebungsvariablen (siehe `.env.example`): `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`.

## Lokal starten

```bash
php -S localhost:8000
```
