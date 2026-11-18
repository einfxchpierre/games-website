/* ==========================================================================
   GAMEHUB – Spielkatalog
   Jedes Spiel hat eine eigene ID = Ordnername unter /games/<id>/
     /games/<id>            → Spiel im GAMEHUB-Player (eigene URL)
     /games/<id>/play.html  → das eigentliche Spiel
   dim:      "2D" oder "3D"
   variant:  ID der jeweils anderen Version (2D ↔ 3D)
   score:    Einheit des Bestwerts (GHStats), lowerIsBetter für Zeiten
   "icon" ist optional – ohne Bild wird ein Farbsymbol erzeugt.
   Wird auch vom Service Worker geladen → "self" statt "window".
   ========================================================================== */
self.GAMES_DATA = [
  { id: "cookie-clicker",    dim: "2D", variant: "cookie-clicker-3d", name: "Cookie Clicker",    category: "Idle",        controls: "Maus / Touch",     score: "Cookies",  icon: "/pictures/icons/cookie.png",        color: "#e0913a", description: "Klicke Cookies, kaufe Gebäude und Upgrades und sammle Erfolge." },
  { id: "cookie-clicker-3d", dim: "3D", variant: "cookie-clicker",    name: "Cookie Clicker 3D", category: "Idle",        controls: "Maus / Touch",     score: "Cookies",  icon: "/pictures/icons/cookie.png",        color: "#e0913a", description: "Derselbe Spielstand in 3D – deine Gebäude wachsen rund um den Keks." },
  { id: "tetris",            dim: "2D", variant: "tetris-3d",         name: "Tetris",            category: "Puzzle",      controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/tetris.png",        color: "#9b5cf6", description: "Marathon, Sprint oder Ultra – räume Reihen ab, bevor es eng wird." },
  { id: "tetris-3d",         dim: "3D", variant: "tetris",            name: "Tetris 3D",         category: "Puzzle",      controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/tetris.png",        color: "#9b5cf6", description: "Leuchtende Glasblöcke in einem drehbaren 3D-Schacht." },
  { id: "tower-defense",     dim: "2D", variant: "tower-defense-3d",  name: "Tower Defense",     category: "Strategie",   controls: "Maus / Touch",     score: "Wellen",   icon: "/pictures/icons/tower-defense.png", color: "#2fbf71", description: "Drei Karten und drei Schwierigkeitsstufen – halte jede Welle auf." },
  { id: "tower-defense-3d",  dim: "3D", variant: "tower-defense",     name: "Tower Defense 3D",  category: "Strategie",   controls: "Maus / Touch",     score: "Wellen",   icon: "/pictures/icons/tower-defense.png", color: "#e254d6", description: "Drei Turmtypen, Upgrades, Bossgegner und mehrere Karten in 3D." },
  { id: "snake",             dim: "2D", variant: "snake-3d",          name: "Snake",             category: "Arcade",      controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/snake.png",         color: "#f5c518", description: "Zehn Level mit Hindernissen – oder endlos im Klassik-Modus." },
  { id: "snake-3d",          dim: "3D", variant: "snake",             name: "Snake 3D",          category: "Arcade",      controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/snake.png",         color: "#f5c518", description: "Die Schlange als Neon-Kette auf einem schwebenden 3D-Spielfeld." },
  { id: "flappy-bird",       dim: "2D", variant: "flappy-bird-3d",    name: "Flappy Bird",       category: "Geschick",    controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/flappy-bird.png",   color: "#38bdf8", description: "Drei Schwierigkeitsstufen – fliege so weit du kannst." },
  { id: "flappy-bird-3d",    dim: "3D", variant: "flappy-bird",       name: "Flappy Bird 3D",    category: "Geschick",    controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/flappy-bird.png",   color: "#38bdf8", description: "Durch leuchtende Röhren in einer 3D-Nachtlandschaft." },
  { id: "jumpnrun",          dim: "2D", variant: "jumpnrun-3d",       name: "Jump'n Run",        category: "Plattformer", controls: "Tastatur / Touch", score: "Level",    icon: "/pictures/icons/jumpnrun.png",      color: "#4ade80", description: "Zwölf Level voller Münzen und Abgründe – plus eigener Level-Editor." },
  { id: "jumpnrun-3d",       dim: "3D", variant: "jumpnrun",          name: "Jump'n Run 3D",     category: "Plattformer", controls: "Tastatur / Touch", score: "Level",    icon: "/pictures/icons/jumpnrun.png",      color: "#4ade80", description: "Alle Level als 2,5D-Welt mit Tiefe, Licht und Schatten." },
  { id: "chess",             dim: "3D", variant: null,                name: "Schach",            category: "Strategie",   controls: "Maus / Touch",     score: "Siege",    icon: "/pictures/icons/chess.png",         color: "#d4d4d8", description: "3D-Schach gegen eine KI in drei Stärken." },
  { id: "runner",            dim: "2D", variant: "runner-3d",         name: "Neon Runner",       category: "Geschick",    controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/runner.png",        color: "#22d3ee", description: "Endlos rennen durch immer schnellere Neon-Zonen." },
  { id: "runner-3d",         dim: "3D", variant: "runner",            name: "Neon Runner 3D",    category: "Geschick",    controls: "Tastatur / Touch", score: "Punkte",   icon: "/pictures/icons/runner.png",        color: "#22d3ee", description: "Aus der Verfolger-Perspektive durch einen 3D-Neontunnel." },
  { id: "drawacircle",       dim: "2D", variant: "drawacircle-3d",    name: "Draw a Circle",     category: "Geschick",    controls: "Maus / Touch",     score: "%",        icon: "",                                  color: "#3b82f6", description: "Fünf Herausforderungen: Wie perfekt ist dein Kreis?" },
  { id: "drawacircle-3d",    dim: "3D", variant: "drawacircle",       name: "Draw a Circle 3D",  category: "Geschick",    controls: "Maus / Touch",     score: "%",        icon: "",                                  color: "#3b82f6", description: "Zeichne mit einem Lichtstrahl auf eine schwebende Scheibe." },
  { id: "pacman",            dim: "2D", variant: "pacman-3d",         name: "Pac Man",           category: "Arcade",      controls: "Tastatur / Touch", score: "Punkte",   icon: "",                                  color: "#facc15", description: "Drei Labyrinthe, immer schnellere Geister – wie weit kommst du?" },
  { id: "pacman-3d",         dim: "3D", variant: "pacman",            name: "Pac Man 3D",        category: "Arcade",      controls: "Tastatur / Touch", score: "Punkte",   icon: "",                                  color: "#facc15", description: "Das Labyrinth als leuchtende 3D-Arena." },
  { id: "minesweeper",       dim: "2D", variant: "minesweeper-3d",    name: "Minesweeper",       category: "Puzzle",      controls: "Maus / Touch",     score: "Sekunden", lowerIsBetter: true, icon: "", color: "#6366f1", description: "Vier Schwierigkeitsstufen – finde alle Minen nur mit Logik." },
  { id: "minesweeper-3d",    dim: "3D", variant: "minesweeper",       name: "Minesweeper 3D",    category: "Puzzle",      controls: "Maus / Touch",     score: "Sekunden", lowerIsBetter: true, icon: "", color: "#6366f1", description: "Kippe Platten auf einem 3D-Minenfeld um." }
];

// Spiel-Adressen
self.GAMES_DATA.forEach(function (g) {
  g.url = "/games/" + g.id;                  // öffentliche Adresse
  g.path = "/games/" + g.id + "/play.html";  // Spiel-Datei (im Player geladen)
  g.is3d = g.dim === "3D";
});

self.CATEGORY_COLORS = {
  Arcade: "#e254d6",
  Puzzle: "#9b5cf6",
  Strategie: "#2fbf71",
  Geschick: "#38bdf8",
  Plattformer: "#f59e0b",
  Idle: "#ff5470"
};
