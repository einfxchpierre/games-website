/* Cookie Clicker 2D – Oberfläche (Logik in core.js, Spielstand geteilt mit 3D) */
(function () {
  const C = window.CookieCore;
  const $ = (id) => document.getElementById(id);
  let tab = "buildings";

  function render() {
    const s = C.state;
    $("cookie-count").textContent = C.format(s.cookies);
    $("cps-display").textContent = C.format(C.cps() * 10) === "0" ? "0 pro Sekunde" : (C.cps() < 10 ? C.cps().toLocaleString("de-DE", { maximumFractionDigits: 1 }) : C.format(C.cps())) + " pro Sekunde";
    $("click-value").textContent = "+" + (C.clickValue() < 10 ? C.clickValue().toLocaleString("de-DE", { maximumFractionDigits: 1 }) : C.format(C.clickValue()));
    $("total").textContent = C.format(s.total);
    const up = C.availableUpgrades();
    $("upBadge").textContent = up.filter((u) => s.cookies >= u.cost).length || "";
    $("achCount").textContent = s.ach.length + "/" + C.ACHIEVEMENTS.length;
    updateShop();
  }

  function renderShop() {
    const box = $("shop-items");
    const s = C.state;
    if (tab === "buildings") {
      box.innerHTML = C.BUILDINGS.map((b, i) => {
        const hidden = i > 0 && s.buildings[i - 1] === 0 && s.buildings[i] === 0 && s.total < b.base * 0.5;
        return '<div class="upgrade-item" data-buy="' + i + '">' +
          '<span class="b-icon">' + (hidden ? "❔" : b.icon) + '</span>' +
          '<div class="b-text"><span class="item-name">' + (hidden ? "???" : b.name) + '</span>' +
          '<span class="item-price" data-cost="' + i + '"></span>' +
          '<span class="item-sub">' + (hidden ? "" : "+" + fmtSmall(C.buildingCps(i)) + "/s pro Stück") + '</span></div>' +
          '<span class="item-amount">' + s.buildings[i] + '</span></div>';
      }).join("");
    } else if (tab === "upgrades") {
      const list = C.availableUpgrades();
      box.innerHTML = list.length ? list.map((u) =>
        '<div class="upgrade-item" data-up="' + u.id + '"><span class="b-icon">⬆️</span><div class="b-text"><span class="item-name">' + u.name + '</span>' +
        '<span class="item-price">' + C.format(u.cost) + ' Cookies</span><span class="item-sub">' + u.desc + '</span></div></div>'
      ).join("") : '<p class="empty">Noch keine Upgrades verfügbar – klicke mehr und kaufe Gebäude.</p>';
      const bought = C.UPGRADES.filter((u) => s.bought.includes(u.id));
      if (bought.length) box.innerHTML += '<p class="sec">Gekauft (' + bought.length + ')</p><div class="chips">' + bought.map((u) => '<span class="ach-chip">' + u.name + '</span>').join("") + '</div>';
    } else {
      box.innerHTML = C.ACHIEVEMENTS.map((a) => {
        const got = s.ach.includes(a.id);
        return '<div class="upgrade-item ach' + (got ? " got" : " locked") + '"><span class="b-icon">' + (got ? "🏆" : "🔒") + '</span><div class="b-text"><span class="item-name">' + a.name + '</span><span class="item-sub">' + a.desc + '</span></div></div>';
      }).join("");
    }
    updateShop();
  }

  function fmtSmall(n) { return n < 10 ? n.toLocaleString("de-DE", { maximumFractionDigits: 1 }) : C.format(n); }

  function updateShop() {
    const s = C.state;
    document.querySelectorAll("[data-buy]").forEach((el) => {
      const i = +el.dataset.buy, cost = C.cost(i);
      el.classList.toggle("locked", s.cookies < cost);
      el.querySelector("[data-cost]").textContent = C.format(cost) + " Cookies";
    });
    document.querySelectorAll("[data-up]").forEach((el) => {
      const u = C.UPGRADES.find((x) => x.id === el.dataset.up);
      el.classList.toggle("locked", s.cookies < u.cost);
    });
  }

  // Klick auf den Keks (Pointer → funktioniert mit Maus und Touch)
  const cookie = $("cookie-container");
  cookie.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    const v = C.click();
    floatText(e.clientX, e.clientY, "+" + fmtSmall(v));
    cookie.classList.remove("pop"); void cookie.offsetWidth; cookie.classList.add("pop");
    render();
  });

  function floatText(x, y, txt) {
    const el = document.createElement("div");
    el.className = "float";
    el.textContent = txt;
    el.style.left = x + "px";
    el.style.top = y + "px";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  $("shop-items").addEventListener("click", (e) => {
    const b = e.target.closest("[data-buy]");
    if (b) { if (C.buy(+b.dataset.buy)) renderShop(); return; }
    const u = e.target.closest("[data-up]");
    if (u && C.buyUpgrade(u.dataset.up)) renderShop();
  });
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => {
    tab = t.dataset.tab;
    document.querySelectorAll(".tab").forEach((x) => x.classList.toggle("active", x === t));
    renderShop();
  }));

  let toastTimer;
  C.on((type, data) => {
    if (type === "tick") render();
    if (type === "achievement") {
      const t = $("toast");
      t.innerHTML = "🏆 Erfolg: <b>" + data.name + "</b>";
      t.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => t.classList.remove("show"), 2800);
      if (tab === "ach") renderShop();
    }
  });

  C.start();
  renderShop();
  render();
})();
