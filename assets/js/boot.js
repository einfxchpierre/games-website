/* ==========================================================================
   GAMEHUB – Boot (wird von JEDER Seite als erstes Script geladen)
   - erkennt, ob ein Spiel im GAMEHUB-Player eingebettet ist
   - erkennt Touch-Geräte (Klasse "gh-touch" auf <html>)
   - registriert den Service Worker (PWA / Offline)
   - GHStats: Spielstatistik im localStorage des Browsers
   ========================================================================== */
(function () {
  "use strict";
  var html = document.documentElement;

  // Eingebettet im Player? → Spiele blenden ihren eigenen "Bibliothek"-Link aus
  try { if (window.self !== window.top) html.classList.add("gh-embedded"); } catch (e) { html.classList.add("gh-embedded"); }

  // Touch-Gerät (Handy/Tablet) → Spiele zeigen Bildschirm-Steuerung
  var coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (coarse || ("ontouchstart" in window && navigator.maxTouchPoints > 0 && !window.matchMedia("(any-pointer: fine)").matches)) {
    html.classList.add("gh-touch");
  }
  window.GH_TOUCH = html.classList.contains("gh-touch");

  // Service Worker (nur oberste Ebene, nur über https oder localhost)
  if ("serviceWorker" in navigator && window.self === window.top &&
      (location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1")) {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(function () {});
    });
  }

  /* ------------------------------------------------------------------------
     GHStats – alle Spielstände lokal im Browser (localStorage "gh_stats")
     {
       "<spiel-id>": {
         best: Zahl, plays: Anzahl Runden, last: Zeitstempel, lastScore: Zahl,
         history: [{ s: Punkte, t: Zeit }], progress: { level: 3, … }
       }
     }
     ------------------------------------------------------------------------ */
  var KEY = "gh_stats";
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* voll/blockiert */ } }
  function entry(d, id) { return d[id] || (d[id] = { best: null, plays: 0, last: 0, lastScore: null, history: [], progress: {} }); }

  // Alte Highscores ("myWebGames") einmalig übernehmen
  (function migrate() {
    try {
      if (localStorage.getItem("gh_stats_migrated")) return;
      var old = JSON.parse(localStorage.getItem("myWebGames") || "{}");
      var map = { flappybird: "flappy-bird" };
      var d = read();
      Object.keys(old).forEach(function (k) {
        var hs = old[k] && old[k].highscore;
        if (typeof hs !== "number") return;
        var e = entry(d, map[k] || k);
        if (e.best == null || hs > e.best) e.best = hs;
      });
      var runnerBest = parseInt(localStorage.getItem("highscore"), 10);
      if (runnerBest > 0) { var r = entry(d, "runner"); if (r.best == null || runnerBest > r.best) r.best = runnerBest; }
      var jnr = parseInt(localStorage.getItem("jumper_unlocked"), 10);
      if (jnr > 1) entry(d, "jumpnrun").progress.unlocked = jnr;
      write(d);
      localStorage.setItem("gh_stats_migrated", "1");
    } catch (e) { /* egal */ }
  })();

  window.GHStats = {
    /** Ergebnis einer Runde speichern. lowerIsBetter z. B. für Zeiten. */
    record: function (id, score, opts) {
      opts = opts || {};
      var d = read(), e = entry(d, id);
      var better = e.best == null || (opts.lowerIsBetter ? score < e.best : score > e.best);
      if (better) e.best = score;
      e.plays++;
      e.last = Date.now();
      e.lastScore = score;
      e.history.push({ s: score, t: e.last });
      if (e.history.length > 20) e.history = e.history.slice(-20);
      if (opts.lowerIsBetter) e.lowerIsBetter = true;
      write(d);
      return { best: e.best, isNewBest: better, plays: e.plays };
    },
    /** Nur den Bestwert aktualisieren (ohne neue Runde zu zählen), z. B. Idle-Spiele */
    setBest: function (id, score, lowerIsBetter) {
      var d = read(), e = entry(d, id);
      var better = e.best == null || (lowerIsBetter ? score < e.best : score > e.best);
      if (better) { e.best = score; e.last = Date.now(); write(d); }
      return better;
    },
    best: function (id) { var e = read()[id]; return e ? e.best : null; },
    get: function (id) { return read()[id] || null; },
    all: function () { return read(); },
    /** Fortschritt (z. B. freigeschaltete Level) lesen/schreiben */
    progress: function (id, key, value) {
      var d = read(), e = entry(d, id);
      if (value === undefined) return e.progress[key];
      e.progress[key] = value;
      write(d);
      return value;
    },
    /** Höchstes freigeschaltetes Level erhöhen (nie verringern) */
    unlock: function (id, level) {
      var cur = this.progress(id, "unlocked") || 1;
      if (level > cur) this.progress(id, "unlocked", level);
      return Math.max(cur, level);
    },
    unlocked: function (id) { return this.progress(id, "unlocked") || 1; },
    replaceAll: function (data) { write(data || {}); },
    reset: function () { try { localStorage.removeItem(KEY); } catch (e) { /* egal */ } }
  };
})();
