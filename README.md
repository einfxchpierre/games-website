# GAMEHUB

Spiele-Launcher mit **21 Spielen in 2D und 3D** – gebaut mit HTML, CSS und JavaScript (three.js für 3D), ohne Login und ohne Server-Code.

* **Als App installierbar (PWA)** auf PC, Handy und Tablet – mit eigenem Symbol, Vollbild und Offline-Betrieb (`manifest.json`, `sw.js`).
* **Läuft auf PC, Laptop, Handy und Tablet.** Auf Touch-Geräten erscheinen automatisch Steuerkreuz/Knöpfe und Wischgesten (`assets/js/touch.js`).
* **Jedes Spiel hat eine eigene Adresse:** `/games/<id>` (z. B. `/games/tetris`, `/games/snake-3d`).
* **Jedes Spiel gibt es auch in 3D** (Schach ist von Haus aus 3D). Im Launcher führt der Knopf „3D-Version“ / „2D-Version“ zur jeweils anderen Fassung.
* **Statistik im Browser (localStorage):** Bestwerte, Runden, freigeschaltete Level, Sessions, Spielzeit und Favoriten. Im Profil lässt sich alles als Datei exportieren und wieder importieren.

## Spiele, Level & Modi

| Spiel | 2D | 3D | Level / Modi |
| --- | --- | --- | --- |
| Cookie Clicker | `cookie-clicker` | `cookie-clicker-3d` | 9 Gebäude, Upgrades, 12 Erfolge – Spielstand von 2D und 3D geteilt |
| Tetris | `tetris` | `tetris-3d` | Marathon, Sprint (40 Reihen), Ultra (2 Minuten) |
| Tower Defense | `tower-defense` | `tower-defense-3d` | je 3 Karten × 3 Schwierigkeitsstufen; 3D: 3 Turmtypen, Upgrades, Bosse |
| Snake | `snake` | `snake-3d` | Klassik + 10 Level mit Hindernissen |
| Flappy Bird | `flappy-bird` | `flappy-bird-3d` | Leicht, Normal, Schwer |
| Jump'n Run | `jumpnrun` | `jumpnrun-3d` | 12 Level + Level-Editor (2D) |
| Schach | – | `chess` | KI in 3 Stärken |
| Neon Runner | `runner` | `runner-3d` | Zonen alle 25 Punkte; 3D mit Springen über Barrieren |
| Draw a Circle | `drawacircle` | `drawacircle-3d` | Freies Zeichnen + 6 Herausforderungen |
| Pac Man | `pacman` | `pacman-3d` | 3 Labyrinthe, Level mit steigendem Tempo |
| Minesweeper | `minesweeper` | `minesweeper-3d` | Anfänger, Normal, Profi, Experte |

## Struktur

| Pfad | Inhalt |
| --- | --- |
| `index.html` | Launcher (Bibliothek, 3D-Filter, Profil `#profil`, Spiel-Player) |
| `manifest.json`, `sw.js` | PWA: Installation & Offline-Cache (bei größeren Änderungen `VERSION` in `sw.js` erhöhen) |
| `assets/css/app.css` | Design des Launchers (inkl. Handy-Layout) |
| `assets/css/game.css` | Gemeinsames Theme aller Spiele (Farben, Buttons, Overlays, Touch-Tasten, 3D-HUD) |
| `assets/js/games.js` | **Spielkatalog** – neue Spiele hier eintragen |
| `assets/js/boot.js` | Wird von jeder Seite zuerst geladen: Touch-Erkennung, Service Worker, **GHStats** (Statistik-API) |
| `assets/js/touch.js` | Bildschirm-Steuerung & Wischgesten (löst echte Tastendrücke aus) |
| `assets/js/gh3d.js` | 3D-Baukasten: Renderer, Licht, Reflexionen, Schatten, Glow, Partikel |
| `assets/js/core.js`, `launcher.js`, `player.js` | Launcher-Logik und Spielseite `/games/<id>` |
| `assets/game-shell.html` | Vorlage für `games/<id>/index.html` |
| `games/<id>/play.html` | Das eigentliche Spiel |
| `games/tetris/core.js`, `games/pacman/core.js`, `games/cookie-clicker/core.js` | Gemeinsame Spiellogik für 2D und 3D |
| `games/snake/levels.js`, `games/jumpnrun/level/`, `games/drawacircle/challenges.js` | Level-Daten (2D und 3D) |

## Neues Spiel hinzufügen

1. Ordner `games/mein-spiel/` anlegen (Ordnername = ID), `assets/game-shell.html` als `index.html` hineinkopieren und das Spiel als `play.html` ablegen. Im `<head>` von `play.html`:
   ```html
   <script src="/assets/js/boot.js"></script>
   <link rel="stylesheet" href="/assets/css/game.css">
   ```
2. In `assets/js/games.js` eintragen:
   ```js
   { id: "mein-spiel", dim: "2D", variant: null, name: "Mein Spiel", category: "Arcade", controls: "Tastatur / Touch", score: "Punkte", icon: "", color: "#e254d6", description: "Kurzbeschreibung." }
   ```
3. Ergebnisse speichern: `GHStats.record("mein-spiel", punkte)` (bei Zeiten `{ lowerIsBetter: true }`), Level freischalten: `GHStats.unlock("mein-spiel", level)`.
4. Touch-Steuerung: `<script src="/assets/js/touch.js">` und z. B. `GHTouch.dpad({ left: "ArrowLeft", right: "ArrowRight" })`.

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

Der Service Worker läuft nur über `https://` oder `localhost`.
