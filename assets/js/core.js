/* ==========================================================================
   GAMEHUB – Core (Icons, Speicher, Helfer)
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- Icons (inline SVG, Lucide-Stil) ---------- */
  const ICONS = {
    library: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    arrowUp: '<path d="M6 15l6-6 6 6"/>',
    arrowLeft: '<path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>',
    minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/>',
    reload: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
    gamepad: '<path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  /* ---------- Helfer ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function lsGet(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw == null ? fallback : JSON.parse(raw); } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* Speicher nicht verfügbar */ }
  }

  const nf = new Intl.NumberFormat("de-DE");
  const fmt = (n) => nf.format(n || 0);

  function relTime(ts) {
    if (!ts) return "–";
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60) return "gerade eben";
    if (diff < 3600) return "vor " + Math.floor(diff / 60) + " Min.";
    if (diff < 86400) return "vor " + Math.floor(diff / 3600) + " Std.";
    const d = Math.floor(diff / 86400);
    if (d === 1) return "gestern";
    if (d < 30) return "vor " + d + " Tagen";
    return new Date(ts).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
  }

  function duration(ms) {
    const m = Math.round((ms || 0) / 60000);
    if (!ms) return "–";
    if (m < 1) return "< 1 Min.";
    if (m < 60) return m + " Min.";
    const h = Math.floor(m / 60);
    return h + " Std. " + (m % 60 ? (m % 60) + " Min." : "");
  }

  function initials(name) {
    return String(name).split(/[\s'’-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function gameIcon(game) {
    const fallback = '<div class="game-icon" style="background:linear-gradient(135deg,' + esc(game.color) + "," + esc(game.color) + '55)">' + esc(initials(game.name)) + "</div>";
    if (!game.icon) return fallback;
    return '<img class="game-icon" src="' + esc(game.icon) + '" alt="" draggable="false" data-fallback="' + esc(fallback) + '">';
  }

  // Fehlende Icon-Bilder durch Farbsymbol ersetzen
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG" && el.dataset.fallback) el.outerHTML = el.dataset.fallback;
  }, true);

  /* ---------- Speicher: Sessions, Spielzeit, Favoriten, Einstellungen ---------- */
  /* Alte Spiel-IDs auf neue (= Ordnername) umschreiben */
  (function migrateIds() {
    const RENAME = { cookie_clicker: "cookie-clicker" };
    const fix = (id) => RENAME[id] || id;
    const plays = lsGet("gh_plays", null);
    if (plays && plays.some((p) => RENAME[p.id])) lsSet("gh_plays", plays.map((p) => ({ id: fix(p.id), t: p.t })));
    const favs = lsGet("gh_favs", null);
    if (favs && favs.some((f) => RENAME[f])) lsSet("gh_favs", favs.map(fix));
    const time = lsGet("gh_time", null);
    if (time && Object.keys(time).some((k) => RENAME[k])) {
      const t = {};
      Object.keys(time).forEach((k) => { t[fix(k)] = (t[fix(k)] || 0) + time[k]; });
      lsSet("gh_time", t);
    }
  })();

  const Store = {
    plays: () => lsGet("gh_plays", []),
    favs: () => lsGet("gh_favs", []),
    time: () => lsGet("gh_time", {}),
    settings: () => Object.assign({ fullscreen: true }, lsGet("gh_settings", {})),
    setSetting(key, value) { const s = this.settings(); s[key] = value; lsSet("gh_settings", s); },
    recordPlay(id) {
      const plays = this.plays();
      plays.push({ id: id, t: Date.now() });
      lsSet("gh_plays", plays.slice(-5000));
    },
    addTime(id, ms) {
      const t = this.time();
      t[id] = (t[id] || 0) + Math.max(0, ms);
      lsSet("gh_time", t);
    },
    toggleFav(id) {
      const favs = this.favs();
      const i = favs.indexOf(id);
      if (i >= 0) favs.splice(i, 1); else favs.push(id);
      lsSet("gh_favs", favs);
      return i < 0;
    },
    perGame() {
      const map = {};
      const time = this.time();
      this.plays().forEach((p) => {
        const m = map[p.id] || (map[p.id] = { count: 0, last: 0, time: 0 });
        m.count++;
        if (p.t > m.last) m.last = p.t;
      });
      Object.keys(time).forEach((id) => { (map[id] || (map[id] = { count: 0, last: 0, time: 0 })).time = time[id]; });
      return map;
    },
    reset() {
      ["gh_plays", "gh_favs", "gh_time"].forEach((k) => { try { localStorage.removeItem(k); } catch (e) { /* egal */ } });
    }
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  function toast(msg) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 2400);
  }

  window.GH = { icon, esc, fmt, relTime, duration, initials, gameIcon, Store, toast, lsGet, lsSet };
})();
