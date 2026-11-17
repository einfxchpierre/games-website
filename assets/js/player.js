/* ==========================================================================
   GAMEHUB – Spielseite /games/<id>
   Zeigt das Spiel (play.html) mit der GAMEHUB-Player-Leiste unter seiner
   eigenen Adresse. Die ID wird aus der URL gelesen.
   ========================================================================== */
(function () {
  "use strict";

  const { icon, esc, gameIcon, Store } = window.GH;
  const id = (location.pathname.split("/")[2] || "").toLowerCase();
  const game = (window.GAMES_DATA || []).find((g) => g.id === id) || {
    id: id,
    name: id.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    color: "#e254d6",
    icon: "",
    path: "/games/" + id + "/play.html"
  };

  document.title = game.name + " · GAMEHUB";

  const $ = (sel) => document.querySelector(sel);
  $("#playerName").innerHTML = gameIcon(game) + esc(game.name);
  $("#closePlayerBtn").innerHTML = icon("arrowLeft") + "Bibliothek";
  $("#reloadBtn").innerHTML = icon("reload");

  const frame = $("#playerFrame");
  frame.contentWindow.location.replace(game.path);

  // Session & Spielzeit zählen (wie im Launcher)
  const started = Date.now();
  if (window.GAMES_DATA && window.GAMES_DATA.some((g) => g.id === id)) {
    Store.recordPlay(id);
    let saved = false;
    const saveTime = () => { if (!saved) { saved = true; Store.addTime(id, Date.now() - started); } };
    addEventListener("pagehide", saveTime);
    addEventListener("beforeunload", saveTime);
  }

  const tick = () => {
    const s = Math.floor((Date.now() - started) / 1000);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    $("#playerTimer").textContent = (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
  };
  tick();
  setInterval(tick, 1000);

  const fsBtn = $("#playerFsBtn");
  const updateFs = () => { fsBtn.innerHTML = icon(document.fullscreenElement ? "minimize" : "maximize"); };
  updateFs();
  document.addEventListener("fullscreenchange", updateFs);
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  });

  const toLibrary = () => { location.href = "/"; };
  $("#closePlayerBtn").addEventListener("click", toLibrary);
  $("#reloadBtn").addEventListener("click", () => {
    $("#playerLoading").classList.remove("hidden");
    frame.contentWindow.location.reload();
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && e.shiftKey) toLibrary(); });

  frame.addEventListener("load", () => {
    let path = null;
    try { path = frame.contentWindow.location.pathname; } catch (e) { /* egal */ }
    if (path === "blank") return; // leerer Platzhalter, Spiel lädt noch
    // Spiel-interner Link zur Startseite → zurück zum Launcher
    if (path === "/" || path === "/index.html" || path === "/index") return toLibrary();
    $("#playerLoading").classList.add("hidden");
    try {
      frame.contentWindow.focus();
      frame.contentWindow.addEventListener("keydown", (e) => { if (e.key === "Escape" && e.shiftKey) toLibrary(); });
    } catch (e) { /* egal */ }
  });
})();
