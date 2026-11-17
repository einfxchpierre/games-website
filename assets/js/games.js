/* ==========================================================================
   GAMEHUB – Spielkatalog
   Jedes Spiel hat eine eigene ID = Ordnername unter /games/<id>/
     /games/<id>            → Spiel im GAMEHUB-Player (eigene URL)
     /games/<id>/play.html  → das eigentliche Spiel
   "icon" ist optional – ohne Bild wird ein Farbsymbol erzeugt.
   controls: "Tastatur" | "Maus" | "Tastatur & Maus"
   ========================================================================== */
window.GAMES_DATA = [
  { id: "cookie-clicker",   name: "Cookie Clicker",   category: "Idle",        controls: "Maus",            icon: "/pictures/icons/cookie.png",        color: "#e0913a", description: "Klicke Cookies, kaufe Upgrades und lass deine Produktion explodieren." },
  { id: "tetris",           name: "Tetris",           category: "Puzzle",      controls: "Tastatur",        icon: "/pictures/icons/tetris.png",        color: "#9b5cf6", description: "Stapel fallende Blöcke und räume volle Reihen ab, bevor es eng wird." },
  { id: "tower-defense",    name: "Tower Defense",    category: "Strategie",   controls: "Maus",            icon: "/pictures/icons/tower-defense.png", color: "#2fbf71", description: "Platziere Türme klug und halte jede Welle von deiner Basis fern." },
  { id: "tower-defense-3d", name: "Tower Defense 3D", category: "Strategie",   controls: "Maus",            icon: "/pictures/icons/tower-defense.png", color: "#e254d6", description: "Die 3D-Version: drei Turmtypen, Upgrades, Bossgegner – frei drehbares Schlachtfeld." },
  { id: "snake",            name: "Snake",            category: "Arcade",      controls: "Tastatur",        icon: "/pictures/icons/snake.png",         color: "#f5c518", description: "Der Klassiker: fressen, wachsen und bloß nicht in dich selbst fahren." },
  { id: "flappy-bird",      name: "Flappy Bird",      category: "Geschick",    controls: "Tastatur & Maus", icon: "/pictures/icons/flappy-bird.png",   color: "#38bdf8", description: "Ein Tipp, ein Flügelschlag – fliege so weit du kannst durch die Röhren." },
  { id: "jumpnrun",         name: "Jump'n Run",       category: "Plattformer", controls: "Tastatur",        icon: "/pictures/icons/jumpnrun.png",      color: "#4ade80", description: "Sieben Level voller Münzen und Abgründe – plus eigener Level-Editor." },
  { id: "chess",            name: "Schach",           category: "Strategie",   controls: "Maus",            icon: "/pictures/icons/chess.png",         color: "#d4d4d8", description: "3D-Schach gegen eine adaptive KI mit flüssigen Animationen." },
  { id: "runner",           name: "Neon Runner",      category: "Geschick",    controls: "Tastatur",        icon: "/pictures/icons/runner.png",        color: "#22d3ee", description: "Endlos rennen, springen und ausweichen im Neonlicht." },
  { id: "drawacircle",      name: "Draw a Circle",    category: "Geschick",    controls: "Maus",            icon: "",                                  color: "#3b82f6", description: "Wie ruhig ist deine Hand? Zeichne den perfekten Kreis." },
  { id: "pacman",           name: "Pac Man",          category: "Arcade",      controls: "Tastatur",        icon: "",                                  color: "#facc15", description: "Friss alle Punkte im Labyrinth und entkomme den Geistern." },
  { id: "minesweeper",      name: "Minesweeper",      category: "Puzzle",      controls: "Maus",            icon: "",                                  color: "#6366f1", description: "Decke das Feld auf und finde alle Minen – nur mit Logik." }
];

// Spiel-Adressen
window.GAMES_DATA.forEach(function (g) {
  g.url = "/games/" + g.id;              // öffentliche Adresse
  g.path = "/games/" + g.id + "/play.html"; // Spiel-Datei (im Player geladen)
});

window.CATEGORY_COLORS = {
  Arcade: "#e254d6",
  Puzzle: "#9b5cf6",
  Strategie: "#2fbf71",
  Geschick: "#38bdf8",
  Plattformer: "#f59e0b",
  Idle: "#ff5470"
};
