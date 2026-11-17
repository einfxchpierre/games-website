/* ==========================================================================
   GAMEHUB – OAuth-Weiterleitung
   ========================================================================== */
(function () {
  "use strict";

  const ISSUER = "https://phoenixmagie.vercel.app";
  const CLIENT_ID = "px_client_3c7d0248f285a54a00679acb";
  const REDIRECT_URI = "https://games-phoenixmagie.vercel.app/api/callback";
  const SCOPES = [
    "read:username", "read:level", "read:xp", "read:beschreibung",
    "read:avatar", "read:aurum", "read:visual_name", "read:mana"
  ];

  function fail(msg) {
    document.getElementById("loginMsg").textContent = msg;
    setTimeout(() => { window.location.href = "/"; }, 2500);
  }

  function randomState() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  window.addEventListener("DOMContentLoaded", () => {
    let config;
    try { config = JSON.parse(localStorage.getItem("oauth_config")); } catch (e) { config = null; }
    if (!config || !config.authorization_endpoint) {
      fail("OAuth-Konfiguration nicht gefunden. Zurück zur Übersicht …");
      return;
    }

    const state = randomState();
    localStorage.setItem("oauth_state", state);

    const base = config.authorization_endpoint.indexOf("http") === 0
      ? config.authorization_endpoint
      : ISSUER + config.authorization_endpoint;

    const url = new URL(base);
    url.searchParams.append("response_type", "code");
    url.searchParams.append("client_id", CLIENT_ID);
    url.searchParams.append("redirect_uri", REDIRECT_URI);
    url.searchParams.append("scope", SCOPES.join(" "));
    url.searchParams.append("state", state);

    window.location.href = url.toString();
  });
})();
