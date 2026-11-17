/* ==========================================================================
   Phoenix Arcade – Spielkatalog
   Neues Spiel hinzufügen: Objekt ergänzen. "icon" ist optional – ohne Bild
   wird automatisch ein Farbsymbol aus "color" und den Initialen erzeugt.
   ========================================================================== */
window.GAMES_DATA = [
  { id: "cookie_clicker", name: "Cookie Clicker", category: "Idle",       path: "/games/cookie-clicker/index.html", icon: "/pictures/icons/cookie.png",        color: "#e0913a", description: "Klicken, kaufen, skalieren." },
  { id: "tetris",         name: "Tetris",         category: "Puzzle",     path: "/games/tetris/index.html",         icon: "/pictures/icons/tetris.png",        color: "#9b5cf6", description: "Reihen stapeln und auflösen." },
  { id: "tower-defense",  name: "Tower Defense",  category: "Strategie",  path: "/games/tower-defense/index.html",  icon: "/pictures/icons/tower-defense.png", color: "#2fbf71", description: "Verteidige deine Basis." },
  { id: "snake",          name: "Snake",          category: "Arcade",     path: "/games/snake/index.html",          icon: "/pictures/icons/snake.png",         color: "#f5c518", description: "Fressen, wachsen, ausweichen." },
  { id: "flappy-bird",    name: "Flappy Bird",    category: "Geschick",   path: "/games/flappy-bird/index.html",    icon: "/pictures/icons/flappy-bird.png",   color: "#38bdf8", description: "Durch die Röhren fliegen." },
  { id: "jumpnrun",       name: "Jump'n Run",     category: "Plattformer",path: "/games/jumpnrun/index.html",       icon: "/pictures/icons/jumpnrun.png",      color: "#4ade80", description: "Sieben Level inkl. Editor." },
  { id: "chess",          name: "Schach",         category: "Strategie",  path: "/games/chess/index.html",          icon: "/pictures/icons/chess.png",         color: "#e5e7eb", description: "3D-Schach gegen die KI." },
  { id: "runner",         name: "Neon Runner",    category: "Geschick",   path: "/games/runner/index.html",         icon: "/pictures/icons/runner.png",        color: "#22d3ee", description: "Endlos rennen im Neonlicht." },
  { id: "drawacircle",    name: "Draw a Circle",  category: "Geschick",   path: "/games/drawacircle/index.html",    icon: "",                                  color: "#3b82f6", description: "Zeichne den perfekten Kreis." },
  { id: "pacman",         name: "Pac Man",        category: "Arcade",     path: "/games/pacman/index.html",         icon: "",                                  color: "#facc15", description: "Punkte fressen, Geistern entkommen." },
  { id: "minesweeper",    name: "Minesweeper",    category: "Puzzle",     path: "/games/minesweeper/index.html",    icon: "",                                  color: "#6366f1", description: "Minen finden mit Logik." }
];

window.CATEGORY_COLORS = {
  Arcade: "#e24fd4",
  Puzzle: "#9b5cf6",
  Strategie: "#2fbf71",
  Geschick: "#38bdf8",
  Plattformer: "#f59e0b",
  Idle: "#fb7185"
};
