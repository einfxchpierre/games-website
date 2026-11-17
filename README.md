# GAMEHUB

Vollbild-Desktop-Launcher für Browser-Spiele – gebaut mit **HTML, CSS und JavaScript**, ohne Login und ohne Server-Code.

* **Nur PC & Laptop:** Smartphones und Tablets sehen einen Hinweis (`assets/js/device-guard.js`, auf jeder Seite inkl. Spielen eingebunden).
* **Spiele starten im Launcher** (Vollbild-Player mit Timer, `Shift`+`Esc` beendet).
* **Lokales Profil:** Spielername, Sessions, Spielzeit und Favoriten werden im Browser gespeichert.
* **Steuerung:** `←`/`→` auswählen, `Enter` starten, `F` Favorit, `R` Zufallsspiel, `Strg`+`K` Suche.

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Launcher (Bibliothek, Profil `#profil`, Spiel-Player) |
| `assets/css/app.css` | Design-System des Launchers |
| `assets/css/game.css` | Gemeinsames Theme für alle Spiele (Farben, Schrift, Buttons, Overlays) |
| `assets/js/games.js` | **Spielkatalog** – neue Spiele hier eintragen |
| `assets/js/core.js` | Icons, lokaler Speicher (Sessions, Spielzeit, Favoriten, Einstellungen) |
| `assets/js/launcher.js` | Launcher-Oberfläche & Player |
| `assets/js/device-guard.js` | Sperre für Mobilgeräte |
| `games/*` | Die einzelnen Spiele (Schach in 3D mit three.js) |

## Neues Spiel hinzufügen

1. Spiel unter `games/mein-spiel/index.html` ablegen und im `<head>` einbinden:
   ```html
   <script src="/assets/js/device-guard.js"></script>
   <link rel="stylesheet" href="/assets/css/game.css">
   ```
   Danach stehen Farben (`--gh-accent`, `--gh-card` …) und Bausteine (`.gh-btn`, `.gh-back`, `.gh-overlay`) zur Verfügung.
2. In `assets/js/games.js` eintragen:
   ```js
   { id: "mein-spiel", name: "Mein Spiel", category: "Arcade", controls: "Tastatur", path: "/games/mein-spiel/index.html", icon: "/pictures/icons/mein-spiel.png", color: "#e254d6", description: "Kurzbeschreibung." }
   ```
   `icon` ist optional – ohne Bild wird ein Farbsymbol mit Initialen erzeugt.

## Farben

| Token | Wert |
| --- | --- |
| Hintergrund | `#06020a` (Verlauf `#3a0d41`) |
| Akzent | `#e254d6` |
| Karten | `#1b1023` |
| Text | `#f6f2f9` / `#b9afc4` / `#857a91` |
| Negativ | `#ff5470` |

## Lokal starten

```bash
python3 -m http.server 8000
```
