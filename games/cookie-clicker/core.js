/* ==========================================================================
   Cookie Clicker – gemeinsame Spiellogik (2D + 3D nutzen denselben Spielstand)
   Speicherort: localStorage "myWebGames" → "cookie-clicker"
   ========================================================================== */
(function () {
  "use strict";

  const BUILDINGS = [
    { id: "cursor",  name: "Cursor",       icon: "👆", base: 15,         cps: 0.1 },
    { id: "grandma", name: "Oma",          icon: "👵", base: 100,        cps: 1 },
    { id: "farm",    name: "Farm",         icon: "🌾", base: 1100,       cps: 8 },
    { id: "mine",    name: "Mine",         icon: "⛏️", base: 12000,      cps: 47 },
    { id: "factory", name: "Fabrik",       icon: "🏭", base: 130000,     cps: 260 },
    { id: "bank",    name: "Bank",         icon: "🏦", base: 1400000,    cps: 1400 },
    { id: "temple",  name: "Tempel",       icon: "🛕", base: 20000000,   cps: 7800 },
    { id: "wizard",  name: "Zauberturm",   icon: "🔮", base: 330000000,  cps: 44000 },
    { id: "rocket",  name: "Raumschiff",   icon: "🚀", base: 5100000000, cps: 260000 }
  ];

  // Upgrades: Klickkraft und Gebäude-Verdopplungen
  const UPGRADES = [
    { id: "click1", name: "Verstärkter Finger", desc: "Klicks bringen doppelt so viel", cost: 100,      type: "click", req: (s) => s.clicks >= 50 },
    { id: "click2", name: "Titan-Finger",       desc: "Klicks ×2",                     cost: 10000,    type: "click", req: (s) => s.clicks >= 500 },
    { id: "click3", name: "Cookie-Handschuh",   desc: "Klicks ×2",                     cost: 1000000,  type: "click", req: (s) => s.clicks >= 2000 },
    { id: "clickcps", name: "Goldene Maus",     desc: "+1 % der Produktion pro Klick", cost: 5000000,  type: "clickcps", req: (s) => s.total >= 1e6 }
  ];
  BUILDINGS.forEach((b, i) => {
    [[10, 10], [50, 100], [100, 1000]].forEach(([need, mult], k) => {
      UPGRADES.push({
        id: b.id + "x" + (k + 1),
        name: b.name + " " + ["Plus", "Pro", "Max"][k],
        desc: b.name + "-Produktion ×2 (ab " + need + " Stück)",
        cost: Math.round(b.base * mult * 5),
        type: "building", building: i,
        req: (s) => s.buildings[i] >= need
      });
    });
  });

  const ACHIEVEMENTS = [
    { id: "c100",   name: "Erste Krümel",     desc: "100 Cookies gebacken",      test: (s) => s.total >= 100 },
    { id: "c1k",    name: "Bäckerlehrling",   desc: "1.000 Cookies gebacken",    test: (s) => s.total >= 1e3 },
    { id: "c100k",  name: "Konditor",         desc: "100.000 Cookies gebacken",  test: (s) => s.total >= 1e5 },
    { id: "c1m",    name: "Keks-Millionär",   desc: "1 Mio. Cookies gebacken",   test: (s) => s.total >= 1e6 },
    { id: "c1b",    name: "Keks-Imperium",    desc: "1 Mrd. Cookies gebacken",   test: (s) => s.total >= 1e9 },
    { id: "k100",   name: "Fleißig",          desc: "100 Mal geklickt",          test: (s) => s.clicks >= 100 },
    { id: "k1000",  name: "Klick-Maschine",   desc: "1.000 Mal geklickt",        test: (s) => s.clicks >= 1000 },
    { id: "b10",    name: "Unternehmer",      desc: "10 Gebäude besitzen",       test: (s) => s.buildings.reduce((a, b) => a + b, 0) >= 10 },
    { id: "b100",   name: "Großkonzern",      desc: "100 Gebäude besitzen",      test: (s) => s.buildings.reduce((a, b) => a + b, 0) >= 100 },
    { id: "all",    name: "Sammler",          desc: "Jedes Gebäude einmal",      test: (s) => s.buildings.every((n) => n > 0) },
    { id: "cps100", name: "Fließband",        desc: "100 Cookies pro Sekunde",   test: () => Core.cps() >= 100 },
    { id: "cps10k", name: "Keks-Fusion",      desc: "10.000 Cookies pro Sekunde", test: () => Core.cps() >= 1e4 }
  ];

  const state = { cookies: 0, total: 0, clicks: 0, buildings: BUILDINGS.map(() => 0), bought: [], ach: [] };
  const listeners = [];

  const Core = {
    BUILDINGS, UPGRADES, ACHIEVEMENTS, state,

    load() {
      try {
        const all = JSON.parse(localStorage.getItem("myWebGames")) || {};
        const f = all["cookie-clicker"] && all["cookie-clicker"].fullState;
        if (f) {
          state.cookies = f.cookies || 0;
          state.total = f.total || f.cookies || 0;
          state.clicks = f.clicks || 0;
          // v1: "upgrades" waren die Gebäude-Anzahlen
          const amounts = f.buildings || (f.upgrades || []).map((u) => u.amount || 0);
          amounts.forEach((n, i) => { if (i < state.buildings.length) state.buildings[i] = n || 0; });
          state.bought = f.bought || [];
          state.ach = f.ach || [];
        }
      } catch (e) { /* neuer Spielstand */ }
    },

    save() {
      try {
        const all = JSON.parse(localStorage.getItem("myWebGames")) || {};
        all["cookie-clicker"] = {
          highscore: Math.floor(state.total),
          fullState: { v: 2, cookies: state.cookies, total: state.total, clicks: state.clicks, buildings: state.buildings, bought: state.bought, ach: state.ach }
        };
        localStorage.setItem("myWebGames", JSON.stringify(all));
      } catch (e) { /* egal */ }
      if (window.GHStats) {
        GHStats.setBest("cookie-clicker", Math.floor(state.total));
        GHStats.setBest("cookie-clicker-3d", Math.floor(state.total));
      }
    },

    cost(i) { return Math.ceil(BUILDINGS[i].base * Math.pow(1.15, state.buildings[i])); },
    buildingMult(i) { return UPGRADES.filter((u) => u.type === "building" && u.building === i && state.bought.includes(u.id)).reduce((m) => m * 2, 1); },
    buildingCps(i) { return BUILDINGS[i].cps * this.buildingMult(i); },
    cps() { return BUILDINGS.reduce((sum, b, i) => sum + state.buildings[i] * this.buildingCps(i), 0); },
    clickValue() {
      let v = UPGRADES.filter((u) => u.type === "click" && state.bought.includes(u.id)).reduce((m) => m * 2, 1);
      if (state.bought.includes("clickcps")) v += this.cps() * 0.01;
      return v;
    },

    click() {
      const v = this.clickValue();
      state.cookies += v;
      state.total += v;
      state.clicks++;
      this.check();
      emit("change");
      return v;
    },
    buy(i) {
      const c = this.cost(i);
      if (state.cookies < c) return false;
      state.cookies -= c;
      state.buildings[i]++;
      this.check();
      this.save();
      emit("change");
      return true;
    },
    availableUpgrades() { return UPGRADES.filter((u) => !state.bought.includes(u.id) && u.req(state)); },
    buyUpgrade(id) {
      const u = UPGRADES.find((x) => x.id === id);
      if (!u || state.bought.includes(id) || state.cookies < u.cost) return false;
      state.cookies -= u.cost;
      state.bought.push(id);
      this.check();
      this.save();
      emit("change");
      return true;
    },
    tick(dt) {
      const add = this.cps() * dt;
      if (add > 0) { state.cookies += add; state.total += add; }
      this.check();
    },
    check() {
      ACHIEVEMENTS.forEach((a) => {
        if (!state.ach.includes(a.id) && a.test(state)) {
          state.ach.push(a.id);
          emit("achievement", a);
        }
      });
    },
    on(fn) { listeners.push(fn); },

    format(n) {
      n = Math.floor(n);
      if (n < 1e6) return n.toLocaleString("de-DE");
      const units = [[1e12, "Bio."], [1e9, "Mrd."], [1e6, "Mio."]];
      for (const [v, u] of units) if (n >= v) return (n / v).toLocaleString("de-DE", { maximumFractionDigits: 2 }) + " " + u;
      return String(n);
    },

    start() {
      this.load();
      this.check();
      let last = performance.now();
      setInterval(() => {
        const now = performance.now();
        this.tick((now - last) / 1000);
        last = now;
        emit("tick");
      }, 100);
      setInterval(() => this.save(), 15000);
      addEventListener("beforeunload", () => this.save());
      addEventListener("pagehide", () => this.save());
      document.addEventListener("visibilitychange", () => { if (document.hidden) this.save(); });
    }
  };

  function emit(type, data) { listeners.forEach((fn) => fn(type, data)); }
  window.CookieCore = Core;
})();
