/* ==========================================================================
   Phoenix Arcade – Konto
   ========================================================================== */
(function () {
  "use strict";

  const { esc, fmt, relTime, initials, Store, Auth, lsGet, lsSet, renderSidebar } = window.PA;
  const $ = (id) => document.getElementById(id);

  function renderLocalStats() {
    const plays = Store.plays();
    const per = Store.perGame();
    const games = window.GAMES_DATA || [];
    const played = games.filter((g) => per[g.id]).length;
    const last = plays.length ? plays[plays.length - 1].t : 0;
    const cell = (l, v) => '<div class="stat"><div class="stat-label">' + l + '</div><div class="stat-value">' + v + "</div></div>";
    $("localStats").innerHTML =
      cell("Sessions", fmt(plays.length)) +
      cell("Gespielte Spiele", fmt(played) + ' <small class="muted">/ ' + fmt(games.length) + "</small>") +
      cell("Favoriten", fmt(Store.favs().length)) +
      cell("Letzte Session", relTime(last));
  }

  function userinfoEndpoint() {
    const cfg = lsGet("oauth_config", null);
    if (cfg && cfg.userinfo_endpoint) {
      return cfg.userinfo_endpoint.indexOf("http") === 0 ? cfg.userinfo_endpoint : Auth.issuer + cfg.userinfo_endpoint;
    }
    return Auth.issuer + "/api/example.js";
  }

  function fillProfile(data) {
    const name = data.visual_name || data.username || "Unbekannt";
    $("visualName").textContent = name;
    $("username").textContent = "@" + (data.username || "user");
    $("beschreibung").textContent = data.beschreibung || "Keine Beschreibung angegeben.";
    $("valLevel").textContent = fmt(data.level ?? 0);
    $("valXP").textContent = fmt(data.xp ?? 0);
    $("valAurum").textContent = fmt(data.aurum ?? 0);
    $("valMana").textContent = fmt(data.mana ?? 0);
    const xp = Number(data.xp) || 0;
    setTimeout(() => { $("xpBar").style.width = Math.min(100, (xp % 1000) / 10) + "%"; }, 50);

    const av = $("userAvatar");
    if (data.avatar) {
      av.outerHTML = '<img class="avatar" id="userAvatar" src="' + esc(data.avatar) + '" alt="">';
    } else {
      av.textContent = initials(name);
    }
  }

  async function loadProfile() {
    const token = Auth.token();
    $("accountActions").innerHTML = token
      ? '<a class="btn" href="/">Zur Übersicht</a><button class="btn btn-primary" type="button" data-logout>Abmelden</button>'
      : '<a class="btn" href="/">Zur Übersicht</a><button class="btn btn-primary" type="button" data-login>Anmelden</button>';

    if (!token) {
      $("guestCard").hidden = false;
      return;
    }
    $("profileCard").hidden = false;

    const cached = Auth.profile();
    if (cached) fillProfile(cached);

    try {
      const res = await fetch(userinfoEndpoint(), { headers: { Authorization: "Bearer " + token } });
      if (!res.ok) throw new Error("Token ungültig");
      const data = await res.json();
      lsSet("pa_profile", {
        username: data.username, visual_name: data.visual_name, avatar: data.avatar,
        level: data.level, xp: data.xp, aurum: data.aurum, mana: data.mana, beschreibung: data.beschreibung
      });
      fillProfile(data);
      renderSidebar("account");
    } catch (err) {
      alert("Sitzung abgelaufen. Bitte erneut anmelden.");
      Auth.logout();
    }
  }

  function init() {
    renderSidebar("account");
    renderLocalStats();
    loadProfile();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
