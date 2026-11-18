/* ==========================================================================
   GAMEHUB – Launcher
   ========================================================================== */
(function () {
  "use strict";

  const { icon, esc, fmt, relTime, duration, initials, gameIcon, Store, toast, lsSet } = window.GH;
  const GAMES = window.GAMES_DATA || [];
  const COLORS = window.CATEGORY_COLORS || {};
  const BY_ID = Object.fromEntries(GAMES.map((g) => [g.id, g]));
  const DAY = 86400000;
  const $ = (id) => document.getElementById(id);

  const state = {
    view: "library",
    filter: "all",
    category: "",
    sort: "popular",
    query: "",
    selected: null
  };

  /* ==========================================================================
     Routing (Hash)
     ========================================================================== */
  function readHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    state.view = h === "profil" || h === "konto" ? "account" : "library";
    state.filter = h === "favoriten" ? "favs" : h === "zuletzt" ? "recent" : h === "3d" ? "3d" : "all";
    state.category = h.indexOf("kategorie=") === 0 ? h.slice(10) : "";
  }

  function navKey() {
    if (state.view === "account") return "account";
    if (state.category) return "cat:" + state.category;
    return state.filter;
  }

  /* ==========================================================================
     Daten
     ========================================================================== */
  function list() {
    const per = Store.perGame();
    const favs = Store.favs();
    const q = state.query.trim().toLowerCase();
    let games = GAMES.filter((g) =>
      (!state.category || g.category === state.category) &&
      (!q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
    );
    if (state.filter === "favs") games = games.filter((g) => favs.includes(g.id));
    if (state.filter === "recent") games = games.filter((g) => per[g.id] && per[g.id].last);
    if (state.filter === "3d") games = games.filter((g) => g.is3d);
    const s = (g) => per[g.id] || { count: 0, last: 0 };
    const sort = state.filter === "recent" ? "recent" : state.sort;
    games.sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name, "de");
      if (sort === "recent") return s(b).last - s(a).last || a.name.localeCompare(b.name, "de");
      return s(b).count - s(a).count || a.name.localeCompare(b.name, "de");
    });
    return games;
  }

  function bestText(g) {
    const b = window.GHStats ? GHStats.best(g.id) : null;
    if (b == null) return null;
    const v = g.score === "%" ? fmt(Math.round(b * 10) / 10) + " %" : fmt(b) + (g.score ? " " + g.score : "");
    return v;
  }

  function sessionsIn(id, from, to) {
    return Store.plays().filter((p) => p.id === id && p.t >= from && p.t < to).length;
  }

  /* ==========================================================================
     Sidebar
     ========================================================================== */
  function renderSidebar() {
    const cats = {};
    GAMES.forEach((g) => { cats[g.category] = (cats[g.category] || 0) + 1; });
    const favCount = Store.favs().length;
    const item = (key, href, ic, label, extra) =>
      '<a class="nav-item" href="' + href + '" data-nav="' + key + '">' + icon(ic) + "<span>" + label + "</span>" + (extra || "") + "</a>";

    const name = playerName();
    const sessions = Store.plays().length;
    const sub = sessions ? fmt(sessions) + (sessions === 1 ? " Session" : " Sessions") : "Lokales Profil";
    const avatar = '<span class="avatar">' + esc(initials(name) || "S") + "</span>";

    $("sidebar").innerHTML =
      '<a class="brand" href="#">' + '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h4M8 10v4"/><path d="M15 13h.01M18 11h.01"/><rect x="2" y="6" width="20" height="12" rx="5"/></svg>' + "GAMEHUB</a>" +
      '<label class="search"><span class="sr-only">Spiele suchen</span>' + icon("search") +
      '<input id="search" type="search" placeholder="Suchen" autocomplete="off" spellcheck="false"><kbd>Strg K</kbd></label>' +
      '<div class="nav-scroll"><nav class="nav">' +
      item("all", "#", "library", "Bibliothek", '<span class="count">' + GAMES.length + "</span>") +
      item("favs", "#favoriten", "star", "Favoriten", favCount ? '<span class="count">' + favCount + "</span>" : "") +
      item("recent", "#zuletzt", "clock", "Zuletzt gespielt") +
      item("3d", "#3d", "cube", "3D-Spiele", '<span class="count">' + GAMES.filter((g) => g.is3d).length + "</span>") +
      item("account", "#profil", "user", "Profil") +
      '<div class="nav-divider"></div><div class="nav-label">Kategorien</div>' +
      Object.keys(cats).sort().map((c) =>
        '<a class="nav-item" href="#kategorie=' + encodeURIComponent(c) + '" data-nav="cat:' + esc(c) + '">' +
        '<span class="nav-dot" style="background:' + esc(COLORS[c] || "#888") + '"></span><span>' + esc(c) + '</span><span class="count">' + cats[c] + "</span></a>"
      ).join("") +
      "</nav></div>" +
      '<div class="sidebar-foot">' +
      (canInstall() ? '<button class="nav-item install" type="button" data-install>' + icon("download") + "<span>App installieren</span></button>" : "") +
      '<button class="nav-item" type="button" data-settings>' + icon("settings") + "<span>Einstellungen</span></button>" +
      '<div class="user">' + avatar +
      '<a class="user-meta" href="#profil"><strong>' + esc(name) + "</strong><small>" + esc(sub) + "</small></a>" +
      '<a class="icon-btn" href="#profil" aria-label="Profil">' + icon("eye") + "</a>" +
      "</div></div>";

    const search = $("search");
    search.value = state.query;
    search.addEventListener("input", () => {
      state.query = search.value;
      if (state.view !== "library") { location.hash = ""; }
      renderShelf(true);
    });
    search.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { const g = list()[0]; if (g) { select(g.id); search.blur(); } }
      if (e.key === "Escape") { search.value = ""; state.query = ""; search.blur(); renderShelf(true); }
    });
    markNav();
  }

  function markNav() {
    document.querySelectorAll(".sidebar [data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === navKey()));
  }

  /* ==========================================================================
     Bibliothek
     ========================================================================== */
  function renderHero() {
    const g = BY_ID[state.selected];
    if (!g) {
      $("hero").innerHTML = '<div><p class="hero-name">Keine Spiele</p><p class="hero-desc">Für diese Auswahl gibt es keine Spiele.</p></div>';
      $("stats").innerHTML = "";
      return;
    }
    const per = Store.perGame()[g.id] || { count: 0, last: 0, time: 0 };
    const fav = Store.favs().includes(g.id);
    const now = Date.now();
    const cur = sessionsIn(g.id, now - 30 * DAY, now + 1);
    const prev = sessionsIn(g.id, now - 60 * DAY, now - 30 * DAY);
    const d = cur - prev;

    let sub;
    if (per.count) {
      const arrow = '<svg class="icon" viewBox="0 0 24 24" style="transform:rotate(' + (d >= 0 ? 0 : 180) + 'deg)"><path d="M6 15l6-6 6 6"/></svg>';
      sub = '<span class="delta' + (d < 0 ? " neg" : "") + '">' + arrow + fmt(cur) + (cur === 1 ? " Session (" : " Sessions (") + (d >= 0 ? "+" : "") + fmt(d) + ")</span>" +
        '<span class="muted">30 Tage · zuletzt ' + relTime(per.last) + "</span>";
    } else {
      sub = '<span class="delta">Neu für dich</span><span class="muted">noch nicht gespielt</span>';
    }

    $("hero").innerHTML =
      '<div class="fade-in" style="min-width:0">' +
        '<div class="hero-kicker"><span class="chip"><span class="dot" style="background:' + esc(COLORS[g.category] || "#888") + '"></span>' + esc(g.category) + "</span>" +
        (g.is3d ? '<span class="chip dim">3D</span>' : '<span class="chip">2D</span>') +
        "<span>" + esc(g.controls) + "</span></div>" +
        '<h2 class="hero-name">' + esc(g.name) + "</h2>" +
        '<div class="hero-sub">' + sub + "</div>" +
        '<p class="hero-desc">' + esc(g.description) + "</p>" +
        '<div class="hero-actions">' +
          '<button class="btn btn-white btn-lg btn-play" type="button" data-launch="' + esc(g.id) + '">' + icon("play") + "Spielen</button>" +
          (g.variant && BY_ID[g.variant] ? '<button class="btn btn-lg" type="button" data-launch="' + esc(g.variant) + '">' + icon(BY_ID[g.variant].is3d ? "cube" : "library") + (BY_ID[g.variant].is3d ? "3D-Version" : "2D-Version") + "</button>" : "") +
          '<button class="btn btn-lg' + (fav ? " on" : "") + '" type="button" data-fav="' + esc(g.id) + '">' + icon("star") + (fav ? "Favorit" : "Merken") + "</button>" +
          '<span class="hero-hint"><kbd>Enter</kbd> starten</span>' +
        "</div>" +
      "</div>" +
      '<div class="cover fade-in" style="--cover-color:' + esc(g.color) + '">' + gameIcon(g) + "</div>";

    const best = bestText(g);

    const cell = (label, value) => '<div class="stat"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + "</div></div>";
    $("stats").innerHTML =
      cell("Kategorie", esc(g.category)) +
      cell("Sessions", per.count ? fmt(per.count) : "–") +
      cell("Spielzeit", duration(per.time)) +
      cell("Zuletzt gespielt", per.last ? relTime(per.last) : "–") +
      cell("Bestwert", best ? esc(best) : "–") +
      cell("Favorit", fav ? 'Ja <small class="delta">★</small>' : "–");
  }

  function renderShelf(keepSelection) {
    const games = list();
    if (!keepSelection || !games.some((g) => g.id === state.selected)) {
      if (!games.some((g) => g.id === state.selected)) state.selected = games.length ? games[0].id : null;
    }
    const favs = Store.favs();
    const per = Store.perGame();

    const title = state.category || { all: "Alle Spiele", favs: "Favoriten", recent: "Zuletzt gespielt", "3d": "3D-Spiele" }[state.filter];
    $("shelfTitle").innerHTML = esc(title) + ' <span class="muted" style="font-weight:500">· ' + games.length + "</span>";
    $("libTitle").textContent = state.category ? state.category : { favs: "Favoriten", recent: "Zuletzt gespielt", "3d": "3D-Spiele" }[state.filter] || "Bibliothek";

    $("shelf").innerHTML = games.length
      ? games.map((g) =>
          '<button class="game-card' + (g.id === state.selected ? " selected" : "") + '" type="button" role="option" data-select="' + esc(g.id) + '" aria-selected="' + (g.id === state.selected) + '">' +
          '<span class="art" style="--c:' + esc(g.color) + '">' + gameIcon(g) + "</span>" +
          (g.is3d ? '<span class="dim-badge">3D</span>' : "") +
          '<span class="play" data-launch="' + esc(g.id) + '" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></span>' +
          (favs.includes(g.id) ? '<svg class="fav" viewBox="0 0 24 24" aria-label="Favorit"><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/></svg>' : "") +
          '<span class="name">' + esc(g.name) + "</span>" +
          '<span class="meta">' + esc(g.category) + (per[g.id] && per[g.id].count ? " · " + fmt(per[g.id].count) + "×" : "") + "</span>" +
          "</button>"
        ).join("")
      : '<div class="empty">' + (state.filter === "favs" ? "Noch keine Favoriten – drücke <kbd>F</kbd> bei einem Spiel." : state.filter === "recent" ? "Du hast noch nichts gespielt." : "Keine Spiele gefunden.") + "</div>";

    renderHero();
    $("filterTabs").querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.filter === state.filter));
    $("categorySelect").value = state.category;
  }

  function select(id, scroll) {
    if (!BY_ID[id]) return;
    state.selected = id;
    document.querySelectorAll(".game-card").forEach((c) => {
      const on = c.dataset.select === id;
      c.classList.toggle("selected", on);
      c.setAttribute("aria-selected", on);
      if (on && scroll !== false) c.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    });
    renderHero();
  }

  function moveSelection(step) {
    const games = list();
    if (!games.length) return;
    const i = games.findIndex((g) => g.id === state.selected);
    const next = games[(i + step + games.length) % games.length];
    select(next.id);
  }

  /* ==========================================================================
     Profil (lokal, ohne Login)
     ========================================================================== */
  function playerName() {
    const n = (Store.settings().name || "").trim();
    return n || "Spieler";
  }

  function renderAccount() {
    const name = playerName();
    const plays = Store.plays();
    const since = plays.length ? new Date(plays[0].t).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }) : null;
    $("accountActions").innerHTML = '<a class="btn" href="#">Zur Bibliothek</a><button class="btn btn-white" type="button" data-random>' + icon("shuffle") + "Zufallsspiel</button>";

    $("profileCard").innerHTML =
      '<div class="profile"><span class="avatar">' + esc(initials(name) || "S") + "</span>" +
      '<div style="min-width:0;flex:1"><h2>' + esc(name) + "</h2><p>" + (since ? "Spielt seit " + since : "Noch keine Sessions") + " · Lokales Profil</p></div></div>" +
      '<form class="name-form" id="nameForm"><label class="sr-only" for="nameInput">Spielername</label>' +
      '<input id="nameInput" maxlength="24" placeholder="Spielername" value="' + esc(Store.settings().name || "") + '" autocomplete="off" spellcheck="false">' +
      '<button class="btn" type="submit">Speichern</button></form>';
    $("nameForm").addEventListener("submit", (e) => {
      e.preventDefault();
      Store.setSetting("name", $("nameInput").value.trim().slice(0, 24));
      toast("Name gespeichert");
      renderSidebar();
      renderAccount();
    });

    // Lokale Aktivität
    const per = Store.perGame();
    const totalTime = Object.values(Store.time()).reduce((a, b) => a + b, 0);
    const played = GAMES.filter((g) => per[g.id] && per[g.id].count).length;
    const cell = (l, v) => '<div class="stat"><div class="stat-label">' + l + '</div><div class="stat-value">' + v + "</div></div>";
    $("activityStats").innerHTML =
      cell("Sessions", fmt(plays.length)) +
      cell("Spielzeit", duration(totalTime)) +
      cell("Gespielt", fmt(played) + ' <small class="muted">/ ' + GAMES.length + "</small>") +
      cell("Favoriten", fmt(Store.favs().length));

    // Bestwerte aller Spiele (GHStats, im Browser gespeichert)
    const stats = window.GHStats ? GHStats.all() : {};
    $("bestList").innerHTML = GAMES.map((g) => {
      const st = stats[g.id] || {};
      const b = bestText(g);
      return '<div class="best-row" data-goto="' + esc(g.id) + '">' + gameIcon(g) +
        '<div class="n">' + esc(g.name.replace(/ 3D$/, "")) + (g.is3d ? "<small>3D</small>" : "") + "</div>" +
        '<div class="v">' + (b ? esc(b) : '<span class="muted">–</span>') + "<small>" + (st.plays ? fmt(st.plays) + (st.plays === 1 ? " Runde" : " Runden") : "noch nicht gespielt") + "</small></div></div>";
    }).join("");

    const top = GAMES.filter((g) => per[g.id] && per[g.id].count).sort((a, b) => per[b.id].count - per[a.id].count).slice(0, 6);
    $("topMeta").textContent = top.length ? "nach Sessions" : "";
    $("topList").innerHTML = top.length
      ? top.map((g) =>
          '<div class="list-row" data-goto="' + esc(g.id) + '">' + gameIcon(g) +
          '<div><div style="font-weight:600">' + esc(g.name) + "</div><small>" + esc(g.category) + " · " + relTime(per[g.id].last) + "</small></div>" +
          '<div class="num">' + fmt(per[g.id].count) + "×<small>" + duration(per[g.id].time) + "</small></div></div>"
        ).join("")
      : '<div class="empty" style="padding:8px 22px 24px">Starte ein Spiel – deine Lieblingsspiele tauchen dann hier auf.</div>';
  }

  /* ==========================================================================
     Player – Spiel startet im Launcher (Vollbild)
     ========================================================================== */
  const player = { id: null, started: 0, timer: null, enteredFs: false, histLen: 0 };

  // history: true = neue URL /games/<id> anlegen, false = URL nicht anfassen (z. B. bei Zurück/Vor)
  function launch(id, history) {
    const g = BY_ID[id];
    if (!g) return;
    const switching = !!player.id;
    if (switching) closePlayer(false);
    if (history !== false) {
      const st = { gh: "game", id: id };
      if (switching) window.history.replaceState(st, "", g.url);
      else window.history.pushState(st, "", g.url);
    }
    player.histLen = window.history.length;
    Store.recordPlay(id);
    player.id = id;
    player.started = Date.now();

    if (Store.settings().fullscreen && !document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => { player.enteredFs = true; }).catch(() => {});
    }

    $("playerName").innerHTML = gameIcon(g) + esc(g.name);
    const vb = $("variantBtn"), other = g.variant && BY_ID[g.variant];
    vb.hidden = !other;
    if (other) { vb.textContent = other.is3d ? "3D-Version" : "2D-Version"; vb.dataset.launch = other.id; }
    $("playerLoading").classList.remove("hidden");
    // replace() statt src: erzeugt keinen zusätzlichen Verlaufseintrag
    $("playerFrame").contentWindow.location.replace(g.path);
    const el = $("player");
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");

    const tick = () => {
      const s = Math.floor((Date.now() - player.started) / 1000);
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      $("playerTimer").textContent = (h ? h + ":" : "") + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    };
    tick();
    player.timer = setInterval(tick, 1000);
  }

  function closePlayer(history) {
    if (!player.id) return;
    if (history !== false) {
      // Spiel-URL verlassen: per Zurück, wenn wir sie selbst angelegt haben
      // Auch Navigationen innerhalb des Spiels (z. B. Editor) mit überspringen
      if (window.history.state && window.history.state.gh === "game") window.history.go(-Math.max(1, window.history.length - player.histLen + 1));
      else window.history.replaceState(null, "", "/");
    }
    Store.addTime(player.id, Date.now() - player.started);
    clearInterval(player.timer);
    const id = player.id;
    player.id = null;
    $("playerFrame").contentWindow.location.replace("about:blank");
    const el = $("player");
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    if (player.enteredFs && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    player.enteredFs = false;
    renderSidebar();
    if (state.view === "library") { renderShelf(true); select(id); }
    else renderAccount();
  }

  // Wenn ein Spiel seinen eigenen "Zurück zum Hub"-Link nutzt → Player schließen
  $("playerFrame").addEventListener("load", () => {
    const frame = $("playerFrame");
    let path = null;
    try { path = frame.contentWindow.location.pathname; } catch (e) { /* fremde Herkunft */ }
    if (path === "blank") return; // leerer Platzhalter, Spiel lädt noch
    if (!player.id) return;
    if (path === "/" || path === "/index.html" || path === "/index") { closePlayer(); return; }
    $("playerLoading").classList.add("hidden");
    try {
      frame.contentWindow.focus();
      frame.contentWindow.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && e.shiftKey) closePlayer();
      });
    } catch (e) { /* egal */ }
  });

  /* ==========================================================================
     Vollbild, Einstellungen
     ========================================================================== */
  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => toast("Vollbild nicht verfügbar"));
  }

  function updateFsButtons() {
    const fs = !!document.fullscreenElement;
    $("fsBtn").innerHTML = icon(fs ? "minimize" : "maximize") + (fs ? "Fenster" : "Vollbild");
    $("playerFsBtn").innerHTML = icon(fs ? "minimize" : "maximize");
  }

  function openSettings() {
    const modal = $("settingsModal");
    const s = Store.settings();
    modal.innerHTML =
      '<div class="modal-card">' +
      '<div class="modal-head"><h2 id="settingsTitle">Einstellungen</h2><button class="icon-btn" type="button" data-close-modal aria-label="Schließen">' + icon("x") + "</button></div>" +
      '<div class="setting"><div><strong>Spiele im Vollbild starten</strong><span>Launcher wechselt beim Start automatisch ins Vollbild</span></div>' +
      '<label class="switch"><input type="checkbox" id="setFs"' + (s.fullscreen ? " checked" : "") + '><i></i></label></div>' +
      '<div class="setting"><div><strong>Spielername</strong><span>' + esc(playerName()) + "</span></div>" +
      '<a class="btn btn-sm" href="#profil" data-close-modal>Ändern</a></div>' +
      '<div class="setting"><div><strong>App installieren</strong><span>' + (isStandalone() ? "GAMEHUB läuft bereits als App" : "Auf PC, Handy oder Tablet wie eine App nutzen – auch offline") + "</span></div>" +
      (isStandalone() ? "" : '<button class="btn btn-sm btn-accent" type="button" data-install>Installieren</button>') + "</div>" +
      '<div class="setting"><div><strong>Statistik sichern</strong><span>Alle Bestwerte und Sessions als Datei</span></div>' +
      '<button class="btn btn-sm" type="button" data-export>Exportieren</button></div>' +
      '<div class="setting"><div><strong>Lokale Daten</strong><span>Sessions, Spielzeit, Favoriten und Bestwerte löschen</span></div>' +
      '<button class="btn btn-sm" type="button" data-reset style="color:var(--neg)">' + icon("trash") + "Zurücksetzen</button></div>" +
      "</div>";
    modal.classList.add("open");
    $("setFs").addEventListener("change", (e) => Store.setSetting("fullscreen", e.target.checked));
  }
  const closeModal = () => $("settingsModal").classList.remove("open");

  function randomGame() {
    const pool = list().length ? list() : GAMES;
    const g = pool[Math.floor(Math.random() * pool.length)];
    if (g) { select(g.id); launch(g.id); }
  }

  /* ==========================================================================
     Render & Events
     ========================================================================== */
  function render() {
    $("view-library").classList.toggle("active", state.view === "library");
    $("view-account").classList.toggle("active", state.view === "account");
    if (state.view === "library") renderShelf(true);
    else renderAccount();
    markNav();
  }

  /* ==========================================================================
     PWA-Installation & Statistik-Export
     ========================================================================== */
  let deferredInstall = null;
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isStandalone = () => (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  function canInstall() { return !isStandalone() && (!!deferredInstall || isIOS()); }

  async function install() {
    if (deferredInstall) {
      deferredInstall.prompt();
      const choice = await deferredInstall.userChoice.catch(() => null);
      if (choice && choice.outcome === "accepted") deferredInstall = null;
      renderSidebar();
      return;
    }
    const modal = $("settingsModal");
    const steps = isIOS()
      ? '<ol class="ios-steps"><li>Tippe in Safari auf <b>Teilen</b> (Quadrat mit Pfeil).</li><li>Wähle <b>Zum Home-Bildschirm</b>.</li><li>Bestätige mit <b>Hinzufügen</b>.</li></ol>'
      : '<ol class="ios-steps"><li>Öffne GAMEHUB in <b>Chrome</b> oder <b>Edge</b>.</li><li>Klicke in der Adressleiste auf das <b>Installieren-Symbol</b> (Bildschirm mit Pfeil) bzw. im Menü auf <b>App installieren</b>.</li><li>Auf Android: Menü <b>⋮</b> → <b>App installieren</b>.</li></ol>';
    modal.innerHTML = '<div class="modal-card"><div class="modal-head"><h2 id="settingsTitle">App installieren</h2><button class="icon-btn" type="button" data-close-modal aria-label="Schließen">' + icon("x") + "</button></div>" +
      '<p class="muted" style="margin:0 0 14px">GAMEHUB lässt sich wie eine App installieren – mit eigenem Symbol, im Vollbild und auch offline.</p>' + steps + "</div>";
    modal.classList.add("open");
  }

  function exportStats() {
    const data = {
      app: "GAMEHUB", version: 1, exported: new Date().toISOString(),
      stats: window.GHStats ? GHStats.all() : {},
      plays: Store.plays(), time: Store.time(), favs: Store.favs(), settings: Store.settings()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "gamehub-statistik-" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    toast("Statistik exportiert");
  }

  function importStats(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d || d.app !== "GAMEHUB") throw new Error("keine GAMEHUB-Datei");
        if (!confirm("Statistik aus der Datei übernehmen? Die aktuelle Statistik in diesem Browser wird ersetzt.")) return;
        if (window.GHStats && d.stats) GHStats.replaceAll(d.stats);
        lsSet("gh_plays", d.plays || []);
        lsSet("gh_time", d.time || {});
        lsSet("gh_favs", d.favs || []);
        if (d.settings) lsSet("gh_settings", d.settings);
        toast("Statistik importiert");
        renderSidebar();
        render();
      } catch (err) {
        toast("Datei konnte nicht gelesen werden");
      }
    };
    reader.readAsText(file);
  }

  function init() {
    try { state.sort = localStorage.getItem("gh_sort") || state.sort; } catch (e) { /* egal */ }
    readHash();
    renderSidebar();

    const cats = Array.from(new Set(GAMES.map((g) => g.category))).sort();
    $("categorySelect").insertAdjacentHTML("beforeend", cats.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join(""));
    $("sortSelect").value = state.sort;
    $("randomBtn").innerHTML = icon("shuffle") + "Zufallsspiel";
    $("closePlayerBtn").innerHTML = icon("arrowLeft") + "Bibliothek";
    $("reloadBtn").innerHTML = icon("reload");
    updateFsButtons();

    $("categorySelect").addEventListener("change", (e) => {
      location.hash = e.target.value ? "kategorie=" + encodeURIComponent(e.target.value) : "";
    });
    $("sortSelect").addEventListener("change", (e) => {
      state.sort = e.target.value;
      try { localStorage.setItem("gh_sort", state.sort); } catch (err) { /* egal */ }
      renderShelf(true);
    });
    $("filterTabs").addEventListener("click", (e) => {
      const t = e.target.closest("[data-filter]");
      if (!t) return;
      location.hash = { all: "", favs: "favoriten", recent: "zuletzt", "3d": "3d" }[t.dataset.filter];
    });

    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-open-nav]")) { document.body.classList.add("nav-open"); return; }
      if (e.target.closest("[data-close-nav]") || (e.target.closest(".sidebar a") && document.body.classList.contains("nav-open"))) document.body.classList.remove("nav-open");
      if (e.target.closest("[data-install]")) { e.preventDefault(); document.body.classList.remove("nav-open"); install(); return; }
      if (e.target.closest("[data-export]")) { exportStats(); return; }
      const t = e.target.closest("[data-launch],[data-select],[data-fav],[data-random],[data-fullscreen],[data-settings],[data-close-modal],[data-reset],[data-close-player],[data-reload-player],[data-goto]");
      if (e.target === $("settingsModal")) closeModal();
      if (!t) return;
      if (t.matches("[data-launch]")) { e.stopPropagation(); document.body.classList.remove("nav-open"); select(t.dataset.launch, false); launch(t.dataset.launch); }
      else if (t.matches("[data-select]")) {
        // Auf Touch-Geräten: zweites Antippen derselben Karte startet das Spiel
        if (window.GH_TOUCH && state.selected === t.dataset.select) launch(t.dataset.select);
        else if (e.detail < 2) { select(t.dataset.select); if (window.GH_TOUCH) $("hero").scrollIntoView({ behavior: "smooth", block: "start" }); }
      }
      else if (t.matches("[data-fav]")) {
        const on = Store.toggleFav(t.dataset.fav);
        toast(on ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt");
        renderSidebar(); renderShelf(true);
      }
      else if (t.matches("[data-random]")) randomGame();
      else if (t.matches("[data-fullscreen]")) toggleFullscreen();
      else if (t.matches("[data-settings]")) { document.body.classList.remove("nav-open"); openSettings(); }
      else if (t.matches("[data-close-modal]")) closeModal();
      else if (t.matches("[data-reset]")) {
        if (confirm("Alle lokalen Sessions, Spielzeiten, Favoriten und Bestwerte löschen?")) {
          Store.reset(); if (window.GHStats) GHStats.reset(); closeModal(); toast("Lokale Daten zurückgesetzt"); renderSidebar(); render();
        }
      }
      else if (t.matches("[data-close-player]")) closePlayer();
      else if (t.matches("[data-reload-player]")) { $("playerLoading").classList.remove("hidden"); $("playerFrame").contentWindow.location.reload(); }
      else if (t.matches("[data-goto]")) { state.selected = t.dataset.goto; location.hash = ""; }
    });

    // Doppelklick auf Karte startet das Spiel
    $("shelf").addEventListener("dblclick", (e) => {
      const c = e.target.closest("[data-select]");
      if (c) launch(c.dataset.select);
    });

    // Mausrad scrollt das Regal horizontal
    $("shelf").addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { $("shelf").scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });

    document.addEventListener("keydown", (e) => {
      const typing = e.target.matches && e.target.matches("input, select, textarea");
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (player.id) return;
        $("search").focus(); $("search").select();
        return;
      }
      if (player.id) {
        if (e.key === "Escape" && e.shiftKey) closePlayer();
        return;
      }
      if (e.key === "Escape") { closeModal(); return; }
      if (typing || $("settingsModal").classList.contains("open") || state.view !== "library") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); moveSelection(1); }
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); moveSelection(-1); }
      else if (e.key === "Enter" && state.selected) { e.preventDefault(); launch(state.selected); }
      else if (e.key.toLowerCase() === "f" && state.selected) {
        const on = Store.toggleFav(state.selected);
        toast(on ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt");
        renderSidebar(); renderShelf(true);
      }
      else if (e.key.toLowerCase() === "r") randomGame();
    });

    $("importFile").addEventListener("change", (e) => { if (e.target.files[0]) importStats(e.target.files[0]); e.target.value = ""; });
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; renderSidebar(); });
    window.addEventListener("appinstalled", () => { deferredInstall = null; toast("GAMEHUB wurde installiert"); renderSidebar(); });

    window.addEventListener("hashchange", () => { readHash(); render(); });

    // Browser-Zurück/Vor zwischen Bibliothek und /games/<id>
    window.addEventListener("popstate", () => {
      const id = gameIdFromPath();
      if (id) { if (player.id !== id) launch(id, false); }
      else if (player.id) closePlayer(false);
      else { readHash(); render(); }
    });
    document.addEventListener("fullscreenchange", updateFsButtons);
    window.addEventListener("beforeunload", () => { if (player.id) Store.addTime(player.id, Date.now() - player.started); });

    const clock = $("clock");
    const tick = () => { clock.textContent = "Lokal · GAMEHUB · " + new Date().toLocaleTimeString("de-DE"); };
    tick();
    setInterval(tick, 1000);

    render();

    // Direktaufruf mit Spiel-Adresse (falls der Server /games/<id> auf den Launcher leitet)
    const deep = gameIdFromPath();
    if (deep) { select(deep, false); launch(deep, false); }
  }

  function gameIdFromPath() {
    const m = location.pathname.match(/^\/games\/([^/]+)\/?$/);
    return m && BY_ID[m[1]] ? m[1] : null;
  }

  init();
})();
