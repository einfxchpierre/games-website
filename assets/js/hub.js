/* ==========================================================================
   Phoenix Arcade – Übersicht (Dashboard)
   ========================================================================== */
(function () {
  "use strict";

  const { icon, esc, fmt, relTime, gameIcon, Store, renderSidebar, toast } = window.PA;
  const GAMES = window.GAMES_DATA || [];
  const COLORS = window.CATEGORY_COLORS || {};
  const DAY = 86400000;

  const state = { view: "all", category: "", sort: "popular", query: "", range: "30" };

  const $ = (id) => document.getElementById(id);

  /* ---------- Hash-Routing (Sidebar-Links) ---------- */
  function readHash() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    state.view = "all";
    if (h === "favoriten") state.view = "favs";
    else if (h === "zuletzt") state.view = "recent";
    else if (h.indexOf("kategorie=") === 0) state.category = h.slice(10);
    else if (h.indexOf("q=") === 0) state.query = h.slice(2);
    else if (h === "") state.category = state.category || "";
  }

  function activeNav() {
    if (state.view === "favs") return "favs";
    if (state.view === "recent") return "recent";
    if (state.category) return "cat:" + state.category;
    return "home";
  }

  /* ---------- Daten ---------- */
  function startOfDay(t) { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); }

  function buckets(range) {
    const plays = Store.plays();
    const today = startOfDay(Date.now());
    let days;
    if (range === "max") {
      const first = plays.length ? startOfDay(Math.min.apply(null, plays.map((p) => p.t))) : today - 29 * DAY;
      days = Math.max(7, Math.round((today - first) / DAY) + 1);
    } else {
      days = parseInt(range, 10);
    }
    const start = today - (days - 1) * DAY;
    const values = new Array(days).fill(0);
    let prev = 0;
    plays.forEach((p) => {
      const i = Math.floor((startOfDay(p.t) - start) / DAY);
      if (i >= 0 && i < days) values[i]++;
      else if (i < 0 && i >= -days) prev++;
    });
    return { start, days, values, prev };
  }

  function filteredGames(opts) {
    const per = Store.perGame();
    const favs = Store.favs();
    const q = state.query.trim().toLowerCase();
    let list = GAMES.filter((g) =>
      (!state.category || g.category === state.category) &&
      (!q || g.name.toLowerCase().includes(q) || g.category.toLowerCase().includes(q))
    );
    if (opts && opts.useView) {
      if (state.view === "favs") list = list.filter((g) => favs.indexOf(g.id) >= 0);
      if (state.view === "recent") list = list.filter((g) => per[g.id]);
    }
    const stat = (g) => per[g.id] || { count: 0, last: 0 };
    const sort = state.view === "recent" && opts && opts.useView ? "recent" : state.sort;
    list.sort((a, b) => {
      if (sort === "az") return a.name.localeCompare(b.name, "de");
      if (sort === "recent") return stat(b).last - stat(a).last || a.name.localeCompare(b.name, "de");
      return stat(b).count - stat(a).count || a.name.localeCompare(b.name, "de");
    });
    return { list, per, favs };
  }

  /* ---------- Hero & Chart ---------- */
  function renderHero(b) {
    const total = b.values.reduce((a, v) => a + v, 0);
    $("metricValue").innerHTML = fmt(total) + "<small>" + (total === 1 ? "Session" : "Sessions") + "</small>";
    const label = { "7": "7 Tage", "30": "30 Tage", "90": "90 Tage", "365": "12 Monate", max: "Gesamt" }[state.range];
    let sub = "";
    if (state.range !== "max" && (total || b.prev)) {
      const d = total - b.prev;
      const pct = b.prev ? Math.round((d / b.prev) * 100) : 100;
      const cls = d >= 0 ? "pos" : "neg";
      const arrow = '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" style="transform:rotate(' + (d >= 0 ? 0 : 180) + 'deg)"><path d="M6 15l6-6 6 6"/></svg>';
      sub = '<span class="delta ' + cls + '">' + arrow + (d >= 0 ? "+" : "") + fmt(d) + " (" + (d >= 0 ? "+" : "") + pct + " %)</span>";
    } else if (!total) {
      sub = '<span class="delta pos">Noch keine Sessions</span>';
    }
    $("metricSub").innerHTML = sub + '<span class="muted">' + label + "</span>";
  }

  // Obergrenze = 4 × "schöner" Schritt, damit alle Achsenwerte ganzzahlig sind
  function niceMax(m) {
    let mag = 1;
    for (;;) {
      for (const s of [1, 2, 5]) {
        if (4 * s * mag >= m) return 4 * s * mag;
      }
      mag *= 10;
    }
  }

  function renderChart(b) {
    const host = $("chart");
    const W = Math.max(280, host.clientWidth);
    const H = host.clientHeight || 320;
    const pad = { l: 8, r: 46, t: 12, b: 30 };
    const iw = W - pad.l - pad.r;
    const ih = H - pad.t - pad.b;
    const max = niceMax(Math.max.apply(null, b.values));
    const n = b.values.length;
    const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    const y = (v) => pad.t + ih - (v / max) * ih;

    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const v = (max / 4) * i;
      const yy = y(v);
      grid += '<line class="grid-line" x1="' + pad.l + '" x2="' + (W - pad.r + 6) + '" y1="' + yy + '" y2="' + yy + '"/>';
      grid += '<text class="axis-label" x="' + (W - pad.r + 12) + '" y="' + (yy + 4) + '">' + fmt(v) + "</text>";
    }

    const fmtDate = (i) => new Date(b.start + i * DAY).toLocaleDateString("de-DE", { day: "numeric", month: "short" });
    const labelCount = W < 520 ? 3 : 5;
    let xl = "";
    for (let k = 0; k < labelCount; k++) {
      const i = Math.round((k / (labelCount - 1)) * (n - 1));
      const anchor = k === 0 ? "start" : k === labelCount - 1 ? "end" : "middle";
      xl += '<text class="axis-label" text-anchor="' + anchor + '" x="' + x(i) + '" y="' + (H - 8) + '">' + fmtDate(i) + "</text>";
    }

    const pts = b.values.map((v, i) => [x(i), y(v)]);
    const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
    const area = line + " L" + x(n - 1) + " " + y(0) + " L" + x(0) + " " + y(0) + " Z";

    const svg =
      '<svg viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="none" role="img" aria-label="Sessions pro Tag">' +
      '<defs><linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#e24fd4" stop-opacity="0.32"/><stop offset="100%" stop-color="#e24fd4" stop-opacity="0"/></linearGradient></defs>' +
      grid + xl +
      '<path class="area" d="' + area + '"/><path class="line" d="' + line + '"/>' +
      '<line class="hover-line" id="hoverLine" y1="' + pad.t + '" y2="' + (pad.t + ih) + '" style="display:none"/>' +
      '<circle class="hover-dot" id="hoverDot" r="4.5" style="display:none"/>' +
      '<rect id="hoverZone" x="' + pad.l + '" y="0" width="' + iw + '" height="' + H + '" fill="transparent"/>' +
      "</svg>";

    const tip = $("chartTip");
    host.innerHTML = svg;
    host.appendChild(tip);

    const zone = $("hoverZone");
    const hl = $("hoverLine");
    const hd = $("hoverDot");
    const move = (clientX) => {
      const r = host.getBoundingClientRect();
      const px = clientX - r.left;
      const i = Math.max(0, Math.min(n - 1, Math.round(((px - pad.l) / iw) * (n - 1))));
      const [cx, cy] = pts[i];
      hl.setAttribute("x1", cx); hl.setAttribute("x2", cx); hl.style.display = "";
      hd.setAttribute("cx", cx); hd.setAttribute("cy", cy); hd.style.display = "";
      tip.innerHTML = "<strong>" + fmt(b.values[i]) + " " + (b.values[i] === 1 ? "Session" : "Sessions") + '</strong><span class="muted">' +
        new Date(b.start + i * DAY).toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "long" }) + "</span>";
      tip.style.left = cx + "px";
      tip.style.top = cy + "px";
      tip.style.opacity = 1;
    };
    const leave = () => { hl.style.display = "none"; hd.style.display = "none"; tip.style.opacity = 0; };
    zone.addEventListener("mousemove", (e) => move(e.clientX));
    zone.addEventListener("touchmove", (e) => move(e.touches[0].clientX), { passive: true });
    zone.addEventListener("mouseleave", leave);
    zone.addEventListener("touchend", leave);
  }

  /* ---------- Kennzahlen ---------- */
  function renderStats() {
    const per = Store.perGame();
    const plays = Store.plays();
    const favs = Store.favs();
    const byId = {};
    GAMES.forEach((g) => { byId[g.id] = g; });

    let top = null, last = null;
    Object.keys(per).forEach((id) => {
      if (!byId[id]) return;
      if (!top || per[id].count > per[top].count) top = id;
      if (!last || per[id].last > per[last].last) last = id;
    });
    const today = startOfDay(Date.now());
    const todayCount = plays.filter((p) => p.t >= today).length;
    const yCount = plays.filter((p) => p.t >= today - DAY && p.t < today).length;
    const diff = todayCount - yCount;

    const cell = (label, value) => '<div class="stat"><div class="stat-label">' + label + '</div><div class="stat-value">' + value + "</div></div>";
    $("stats").innerHTML =
      cell("Spiele", fmt(GAMES.length)) +
      cell("Sessions gesamt", plays.length ? fmt(plays.length) : "–") +
      cell("Heute", plays.length ? fmt(todayCount) + ' <small class="delta ' + (diff >= 0 ? "pos" : "neg") + '">' + (diff >= 0 ? "+" : "") + fmt(diff) + "</small>" : "–") +
      cell("Favoriten", favs.length ? fmt(favs.length) : "–") +
      cell("Meistgespielt", top ? esc(byId[top].name) + ' <small class="delta pos">' + fmt(per[top].count) + "×</small>" : "–") +
      cell("Zuletzt gespielt", last ? esc(byId[last].name) + ' <small class="muted">' + relTime(per[last].last) + "</small>" : "–");
  }

  /* ---------- Bibliothek ---------- */
  function renderLibrary() {
    const { list, per, favs } = filteredGames({ useView: true });
    $("libCount").textContent = list.length + (list.length === 1 ? " Spiel" : " Spiele");
    if (!list.length) {
      const msg = state.view === "favs" ? "Noch keine Favoriten – markiere Spiele mit dem Stern."
        : state.view === "recent" ? "Noch nichts gespielt. Zeit für eine Runde!"
        : 'Kein Spiel für „' + esc(state.query) + '“ gefunden.';
      $("library").innerHTML = '<div class="empty">' + msg + "</div>";
      return;
    }
    $("library").innerHTML = list.map((g) => {
      const s = per[g.id] || { count: 0, last: 0 };
      const fav = favs.indexOf(g.id) >= 0;
      return '<div class="row">' +
        '<div class="game-cell">' + gameIcon(g) +
          '<div style="min-width:0"><div class="game-name">' + esc(g.name) + '</div><div class="game-sub">' + esc(g.description) + "</div></div></div>" +
        '<div class="col-cat"><span class="chip" style="margin:0">' + esc(g.category) + "</span></div>" +
        '<div class="r col-plays"><span class="num">' + fmt(s.count) + "</span></div>" +
        '<div class="r col-last"><span class="num-sub">' + relTime(s.last) + "</span></div>" +
        '<div class="row-actions">' +
          '<button class="icon-btn fav-btn' + (fav ? " on" : "") + '" type="button" data-fav="' + esc(g.id) + '" aria-pressed="' + fav + '" aria-label="Favorit">' + icon("star") + "</button>" +
          '<a class="btn btn-sm" href="' + esc(g.path) + '" data-play="' + esc(g.id) + '">Spielen</a>' +
        "</div></div>";
    }).join("");
  }

  /* ---------- Verteilung (Donut) ---------- */
  function renderDonut() {
    const per = Store.perGame();
    const totals = {};
    let sum = 0;
    const hasPlays = Object.keys(per).length > 0;
    GAMES.forEach((g) => {
      const v = hasPlays ? (per[g.id] ? per[g.id].count : 0) : 1;
      if (!v) return;
      totals[g.category] = (totals[g.category] || 0) + v;
      sum += v;
    });
    const entries = Object.keys(totals).map((k) => [k, totals[k]]).sort((a, b) => b[1] - a[1]);
    $("distMeta").textContent = hasPlays ? "nach Sessions" : "nach Katalog";

    const r = 42, C = 2 * Math.PI * r;
    const gap = entries.length > 1 ? 2.2 : 0;
    let offset = 0;
    const segs = entries.map(([cat, v]) => {
      const len = (v / sum) * C;
      const seg = '<circle cx="50" cy="50" r="' + r + '" fill="none" stroke="' + (COLORS[cat] || "#888") + '" stroke-width="9" ' +
        'stroke-dasharray="' + Math.max(0.01, len - gap).toFixed(2) + " " + C.toFixed(2) + '" stroke-dashoffset="' + (-offset).toFixed(2) + '"/>';
      offset += len;
      return seg;
    }).join("");

    const topEntry = entries[0];
    const pct = (v) => ((v / sum) * 100).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
    $("donut").innerHTML =
      '<svg viewBox="0 0 100 100" role="img" aria-label="Verteilung nach Kategorie">' + segs + "</svg>" +
      '<div class="donut-center">' + (topEntry ? "<strong>" + pct(topEntry[1]) + "</strong><span>" + esc(topEntry[0]) + "</span>" : "<strong>–</strong>") + "</div>";

    $("legend").innerHTML = entries.map(([cat, v]) =>
      '<div class="legend-row"><span class="name"><span class="dot" style="background:' + (COLORS[cat] || "#888") + '"></span>' + esc(cat) + "</span>" +
      '<span class="val">' + fmt(v) + (hasPlays ? "" : v === 1 ? " Spiel" : " Spiele") + '</span><span class="pct">' + pct(v) + "</span></div>"
    ).join("");
  }

  /* ---------- Entdecken (Kacheln) ---------- */
  function renderTiles() {
    const { list, per } = filteredGames({ useView: false });
    $("tilesMeta").textContent = state.category ? state.category : "Alle Kategorien";
    $("tiles").innerHTML = list.map((g) =>
      '<a class="tile" href="' + esc(g.path) + '" data-play="' + esc(g.id) + '" style="--tile-color:' + esc(g.color) + '">' +
      gameIcon(g) +
      '<span class="game-name">' + esc(g.name) + "</span>" +
      '<span class="game-sub">' + esc(g.category) + (per[g.id] ? " · " + fmt(per[g.id].count) + "×" : "") + "</span>" +
      '<span class="tile-foot"><span class="game-sub">' + esc(g.description) + '</span><span class="play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg></span></span>' +
      "</a>"
    ).join("") || '<div class="empty" style="grid-column:1/-1">Keine Spiele gefunden.</div>';
  }

  /* ---------- Render ---------- */
  function renderAll() {
    const b = buckets(state.range);
    renderHero(b);
    renderChart(b);
    renderStats();
    renderLibrary();
    renderDonut();
    renderTiles();
    document.querySelectorAll("#viewTabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.view === state.view));
    document.querySelectorAll("#rangeSeg button").forEach((t) => t.classList.toggle("active", t.dataset.range === state.range));
    $("categorySelect").value = state.category;
    document.querySelectorAll(".sidebar .nav-item[data-nav]").forEach((a) => a.classList.toggle("active", a.dataset.nav === activeNav()));
  }

  function play(id) {
    Store.recordPlay(id);
  }

  function randomGame() {
    const pool = filteredGames({ useView: false }).list;
    const list = pool.length ? pool : GAMES;
    const g = list[Math.floor(Math.random() * list.length)];
    if (!g) return;
    play(g.id);
    toast("Viel Spaß mit " + g.name + "!");
    setTimeout(() => { window.location.href = g.path; }, 350);
  }

  /* ---------- Init ---------- */
  function init() {
    try { state.sort = localStorage.getItem("pa_sort") || state.sort; } catch (e) { /* egal */ }
    try { state.range = localStorage.getItem("pa_range") || state.range; } catch (e) { /* egal */ }
    readHash();
    renderSidebar(activeNav());

    const cats = Array.from(new Set(GAMES.map((g) => g.category))).sort();
    $("categorySelect").innerHTML += cats.map((c) => '<option value="' + esc(c) + '">' + esc(c) + "</option>").join("");
    $("sortSelect").value = state.sort;

    const search = $("globalSearch");
    if (search) {
      search.value = state.query;
      search.addEventListener("input", () => { state.query = search.value; renderLibrary(); renderTiles(); });
    }

    $("categorySelect").addEventListener("change", (e) => {
      state.category = e.target.value;
      history.replaceState(null, "", state.category ? "#kategorie=" + encodeURIComponent(state.category) : location.pathname);
      renderAll();
    });
    $("sortSelect").addEventListener("change", (e) => {
      state.sort = e.target.value;
      try { localStorage.setItem("pa_sort", state.sort); } catch (err) { /* egal */ }
      renderLibrary(); renderTiles();
    });
    $("rangeSeg").addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-range]");
      if (!btn) return;
      state.range = btn.dataset.range;
      try { localStorage.setItem("pa_range", state.range); } catch (err) { /* egal */ }
      renderAll();
    });
    $("viewTabs").addEventListener("click", (e) => {
      const btn = e.target.closest("[data-view]");
      if (!btn) return;
      state.view = btn.dataset.view;
      renderAll();
    });

    document.addEventListener("click", (e) => {
      const fav = e.target.closest("[data-fav]");
      if (fav) {
        const on = Store.toggleFav(fav.dataset.fav);
        toast(on ? "Zu Favoriten hinzugefügt" : "Aus Favoriten entfernt");
        renderLibrary(); renderStats();
        return;
      }
      const p = e.target.closest("[data-play]");
      if (p) play(p.dataset.play);
      if (e.target.closest("[data-random]")) randomGame();
    });

    window.addEventListener("hashchange", () => { state.category = ""; state.query = ""; readHash(); if (search) search.value = state.query; renderAll(); });
    document.addEventListener("pa:data-changed", renderAll);
    // Beim Zurückkehren aus einem Spiel (bfcache) aktualisieren
    window.addEventListener("pageshow", (e) => { if (e.persisted) renderAll(); });

    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => renderChart(buckets(state.range)), 120); });

    const clock = $("liveClock");
    const tick = () => { clock.textContent = "Lokal gespeichert · " + new Date().toLocaleTimeString("de-DE"); };
    tick();
    setInterval(tick, 1000);

    renderAll();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
