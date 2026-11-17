/* ==========================================================================
   Phoenix Arcade – Core (Sidebar, Store, Auth, UI-Helfer)
   ========================================================================== */
(function () {
  "use strict";

  const BRAND = { name: "Phoenix", accent: "Arcade" };
  const OAUTH_ISSUER = "https://phoenixmagie.vercel.app";

  /* ---------- Icons (Lucide-Stil, inline SVG) ---------- */
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    arrowUp: '<path d="M6 15l6-6 6 6"/>',
    shuffle: '<path d="M16 3h5v5"/><path d="M4 20L21 3"/><path d="M21 16v5h-5"/><path d="M15 15l6 6"/><path d="M4 4l5 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    play: '<path d="M7 4.5v15l12-7.5z"/>',
    bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
    login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/>',
    menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
    x: '<path d="M18 6L6 18M6 6l12 12"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    trophy: '<path d="M8 21h8M12 17v4"/><path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
    gamepad: '<path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/>'
  };

  function icon(name, cls) {
    return '<svg class="icon ' + (cls || "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || "") + "</svg>";
  }

  const LOGO = '<span class="brand-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/></svg></span>';

  function brandHTML() {
    return '<a class="brand" href="/">' + LOGO + "<span>" + BRAND.name + " <b>" + BRAND.accent + "</b></span></a>";
  }

  /* ---------- Helfer ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function lsGet(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* Speicher nicht verfügbar */ }
  }

  const nf = new Intl.NumberFormat("de-DE");
  function fmt(n) { return nf.format(n || 0); }

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

  function initials(name) {
    return String(name).split(/[\s'’-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  }

  function gameIcon(game, cls) {
    const fallback = '<div class="game-icon ' + (cls || "") + '" style="background:linear-gradient(135deg,' + esc(game.color) + ',' + esc(game.color) + '66)">' + esc(initials(game.name)) + "</div>";
    if (!game.icon) return fallback;
    return '<img class="game-icon ' + (cls || "") + '" src="' + esc(game.icon) + '" alt="" loading="lazy" data-fallback="' + esc(fallback) + '">';
  }

  // Bild-Fallback für fehlende Icons
  document.addEventListener("error", (e) => {
    const el = e.target;
    if (el.tagName === "IMG" && el.dataset.fallback) {
      el.outerHTML = el.dataset.fallback;
    }
  }, true);

  /* ---------- Store: Sessions & Favoriten ---------- */
  const Store = {
    plays() { return lsGet("pa_plays", []); },
    favs() { return lsGet("pa_favs", []); },
    recordPlay(id) {
      const plays = this.plays();
      plays.push({ id: id, t: Date.now() });
      lsSet("pa_plays", plays.slice(-3000));
    },
    toggleFav(id) {
      const favs = this.favs();
      const i = favs.indexOf(id);
      if (i >= 0) favs.splice(i, 1); else favs.push(id);
      lsSet("pa_favs", favs);
      return i < 0;
    },
    isFav(id) { return this.favs().indexOf(id) >= 0; },
    perGame() {
      const map = {};
      this.plays().forEach((p) => {
        const m = map[p.id] || (map[p.id] = { count: 0, last: 0 });
        m.count++;
        if (p.t > m.last) m.last = p.t;
      });
      return map;
    },
    reset() {
      try {
        localStorage.removeItem("pa_plays");
        localStorage.removeItem("pa_favs");
      } catch (e) { /* ignorieren */ }
    }
  };

  /* ---------- Auth ---------- */
  const Auth = {
    token() { try { return localStorage.getItem("access_token"); } catch (e) { return null; } },
    profile() { return lsGet("pa_profile", null); },
    async login() {
      try {
        const res = await fetch(OAUTH_ISSUER + "/.well-known/oauth.json");
        if (!res.ok) throw new Error("HTTP " + res.status);
        const cfg = await res.json();
        localStorage.setItem("oauth_config", JSON.stringify(cfg));
        window.location.href = "/login.html";
      } catch (err) {
        toast("Anmeldung derzeit nicht verfügbar.");
      }
    },
    logout() {
      try {
        ["access_token", "refresh_token", "pa_profile", "oauth_state"].forEach((k) => localStorage.removeItem(k));
      } catch (e) { /* ignorieren */ }
      window.location.href = "/";
    },
    issuer: OAUTH_ISSUER
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
    toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  /* ---------- Sidebar ---------- */
  function renderSidebar(active) {
    const host = document.getElementById("sidebar");
    if (!host) return;

    const games = window.GAMES_DATA || [];
    const cats = {};
    games.forEach((g) => { cats[g.category] = (cats[g.category] || 0) + 1; });
    const colors = window.CATEGORY_COLORS || {};

    const item = (key, href, ic, label, extra) =>
      '<a class="nav-item' + (active === key ? " active" : "") + '" href="' + href + '" data-nav="' + key + '">' + icon(ic) + "<span>" + label + "</span>" + (extra || "") + "</a>";

    const profile = Auth.profile();
    const loggedIn = !!Auth.token();
    const name = loggedIn ? (profile && (profile.visual_name || profile.username)) || "Angemeldet" : "Gast";
    const sub = loggedIn ? (profile && profile.username ? "@" + profile.username : "Konto verbunden") : "Nicht angemeldet";
    const avatar = loggedIn && profile && profile.avatar
      ? '<img class="avatar" src="' + esc(profile.avatar) + '" alt="">'
      : '<span class="avatar">' + esc(initials(name) || "G") + "</span>";

    host.innerHTML =
      brandHTML() +
      '<label class="search"><span class="sr-only">Spiele suchen</span>' + icon("search") +
      '<input id="globalSearch" type="search" placeholder="Suchen" autocomplete="off"><kbd>Strg K</kbd></label>' +
      '<div class="sidebar-scroll"><nav class="nav">' +
      item("home", "/", "grid", "Übersicht") +
      item("favs", "/#favoriten", "star", "Favoriten") +
      item("recent", "/#zuletzt", "clock", "Zuletzt gespielt") +
      item("account", "/konto.html", "user", "Konto") +
      '<div class="nav-divider"></div><div class="nav-label">Kategorien</div>' +
      Object.keys(cats).sort().map((c) =>
        '<a class="nav-item' + (active === "cat:" + c ? " active" : "") + '" href="/#kategorie=' + encodeURIComponent(c) + '" data-nav="cat:' + esc(c) + '">' +
        '<span class="nav-dot" style="background:' + esc(colors[c] || "#888") + '"></span><span>' + esc(c) + '</span><span class="count">' + cats[c] + "</span></a>"
      ).join("") +
      "</nav></div>" +
      '<div class="sidebar-footer">' +
      '<button class="nav-item" type="button" data-open-settings>' + icon("settings") + "<span>Einstellungen</span></button>" +
      '<div class="user">' + avatar +
      '<a class="user-meta" href="/konto.html"><strong>' + esc(name) + "</strong><small>" + esc(sub) + "</small></a>" +
      (loggedIn
        ? '<a class="icon-btn" href="/konto.html" aria-label="Konto">' + icon("bell") + "</a>"
        : '<button class="icon-btn" type="button" data-login aria-label="Anmelden">' + icon("login") + "</button>") +
      "</div></div>";

    // Mobile Topbar
    const top = document.getElementById("topbar");
    if (top) {
      top.innerHTML = brandHTML() + '<button class="icon-btn" type="button" data-nav-toggle aria-label="Menü öffnen">' + icon("menu", "icon-lg") + "</button>";
    }
  }

  /* ---------- Einstellungen-Modal ---------- */
  function ensureSettingsModal() {
    let modal = document.getElementById("settingsModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.className = "modal";
    modal.id = "settingsModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "settingsTitle");
    document.body.appendChild(modal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeModal(); });
    return modal;
  }

  function openSettings() {
    const modal = ensureSettingsModal();
    const loggedIn = !!Auth.token();
    modal.innerHTML =
      '<div class="modal-card">' +
      '<div class="modal-head"><h2 id="settingsTitle">Einstellungen</h2><button class="icon-btn" type="button" data-close-modal aria-label="Schließen">' + icon("x") + "</button></div>" +
      '<div class="setting"><div class="setting-text"><strong>Konto</strong><span>' + (loggedIn ? "Mit Phoenixmagie verbunden" : "Mit Phoenixmagie anmelden") + "</span></div>" +
      (loggedIn
        ? '<a class="btn btn-sm" href="/konto.html">Öffnen</a>'
        : '<button class="btn btn-sm btn-accent" type="button" data-login>Anmelden</button>') +
      "</div>" +
      '<div class="setting"><div class="setting-text"><strong>Lokale Daten</strong><span>Sessions & Favoriten in diesem Browser</span></div>' +
      '<button class="btn btn-sm btn-danger" type="button" data-reset>' + icon("trash") + "Zurücksetzen</button></div>" +
      (loggedIn
        ? '<div class="setting"><div class="setting-text"><strong>Abmelden</strong><span>Token von diesem Gerät entfernen</span></div><button class="btn btn-sm" type="button" data-logout>' + icon("logout") + "Abmelden</button></div>"
        : "") +
      "</div>";
    requestAnimationFrame(() => modal.classList.add("open"));
  }

  function closeModal() {
    const modal = document.getElementById("settingsModal");
    if (modal) modal.classList.remove("open");
  }

  /* ---------- Globale Events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open-settings],[data-close-modal],[data-login],[data-logout],[data-reset],[data-nav-toggle],.scrim,.sidebar a");
    if (!t) return;
    if (t.matches("[data-open-settings]")) { document.body.classList.remove("nav-open"); openSettings(); }
    else if (t.matches("[data-close-modal]")) closeModal();
    else if (t.matches("[data-login]")) { e.preventDefault(); Auth.login(); }
    else if (t.matches("[data-logout]")) Auth.logout();
    else if (t.matches("[data-reset]")) {
      if (confirm("Alle lokalen Sessions und Favoriten löschen?")) {
        Store.reset();
        closeModal();
        toast("Lokale Daten zurückgesetzt");
        document.dispatchEvent(new CustomEvent("pa:data-changed"));
      }
    }
    else if (t.matches("[data-nav-toggle]")) document.body.classList.toggle("nav-open");
    else document.body.classList.remove("nav-open");
  });

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      const s = document.getElementById("globalSearch");
      if (s) {
        e.preventDefault();
        if (window.matchMedia("(max-width: 900px)").matches) document.body.classList.add("nav-open");
        s.focus();
        s.select();
      }
    }
    if (e.key === "Escape") { closeModal(); document.body.classList.remove("nav-open"); }
    // Auf Unterseiten: Suche per Enter an die Übersicht übergeben
    if (e.key === "Enter" && e.target.id === "globalSearch" && document.body.dataset.page !== "hub") {
      window.location.href = "/#q=" + encodeURIComponent(e.target.value.trim());
    }
  });

  window.PA = { icon, esc, fmt, relTime, initials, gameIcon, Store, Auth, toast, renderSidebar, lsGet, lsSet };
})();
