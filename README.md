# Phoenix Arcade

Browser-Spielesammlung (Tetris, Snake, Schach, Tower Defense u. v. m.) – gebaut mit **HTML, CSS, JavaScript und PHP**.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Übersicht / Dashboard (Aktivitätschart, Kennzahlen, Bibliothek, Verteilung, Entdecken) |
| `konto.html` | Konto-Seite (Phoenixmagie-Profil + lokale Statistiken) |
| `login.html` | Startet den OAuth-Login |
| `api/callback.php` | OAuth-Callback: tauscht den Code gegen Tokens (PHP) |
| `assets/css/app.css` | Design-System (Farben, Komponenten, Responsive) |
| `assets/js/games.js` | **Spielkatalog** – neue Spiele hier eintragen |
| `assets/js/core.js` | Sidebar, Einstellungen, Favoriten/Sessions-Speicher, Auth |
| `assets/js/hub.js` / `konto.js` / `login.js` | Seitenlogik |
| `games/*` | Die einzelnen Spiele |

## Neues Spiel hinzufügen

In `assets/js/games.js` ein Objekt ergänzen:

```js
{ id: "mein-spiel", name: "Mein Spiel", category: "Arcade", path: "/games/mein-spiel/index.html", icon: "/pictures/icons/mein-spiel.png", color: "#e24fd4", description: "Kurzbeschreibung." }
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
