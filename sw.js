/* ==========================================================================
   GAMEHUB – Service Worker (PWA, Offline-Betrieb)
   - App-Hülle und alle Spielseiten werden beim Installieren vorgeladen
   - Seiten: zuerst Netzwerk (immer aktuell), offline aus dem Cache
   - Dateien (JS/CSS/Bilder/three.js-CDN/Schriften): Cache sofort, im
     Hintergrund aktualisieren ("stale-while-revalidate")
   Bei größeren Änderungen VERSION erhöhen.
   ========================================================================== */
const VERSION = "gamehub-v3";
importScripts("/assets/js/games.js");

const SHELL = [
  "/", "/index.html", "/manifest.json",
  "/assets/css/app.css", "/assets/css/game.css",
  "/assets/js/boot.js", "/assets/js/touch.js", "/assets/js/games.js", "/assets/js/core.js",
  "/assets/js/launcher.js", "/assets/js/player.js", "/assets/js/gh3d.js",
  "/assets/img/favicon.svg", "/assets/icons/icon-192.png", "/assets/icons/icon-512.png",
  "/assets/icons/maskable-512.png", "/assets/icons/apple-touch-icon.png"
];
const GAME_PAGES = (self.GAMES_DATA || []).flatMap((g) => ["/games/" + g.id + "/", "/games/" + g.id + "/play.html"].concat(g.icon ? [g.icon] : []));

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Einzeln laden: ein fehlender Eintrag soll die Installation nicht abbrechen
    await Promise.all(SHELL.concat(GAME_PAGES).map((url) => cache.add(new Request(url, { cache: "reload" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

const CDN = /^(https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com))\//;

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !CDN.test(req.url)) return;

  // Seitenaufrufe: Netzwerk zuerst, offline Cache, sonst Launcher
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        if (res.ok) (await caches.open(VERSION)).put(req, res.clone());
        return res;
      } catch (e) {
        const cache = await caches.open(VERSION);
        return (await cache.match(req, { ignoreSearch: true })) ||
               (await cache.match(url.pathname.replace(/\/?$/, "/"))) ||
               (await cache.match("/"));
      }
    })());
    return;
  }

  // Alles andere: sofort aus dem Cache, im Hintergrund aktualisieren
  event.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const cached = await cache.match(req, { ignoreSearch: sameOrigin });
    const network = fetch(req).then((res) => {
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    return cached || network;
  })());
});
