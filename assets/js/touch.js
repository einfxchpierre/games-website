/* ==========================================================================
   GAMEHUB – Touch-Steuerung für Handys & Tablets
   Erzeugt Bildschirm-Tasten, die echte Tastatur-Ereignisse auslösen.
   Dadurch funktionieren die vorhandenen Tastatur-Steuerungen der Spiele
   unverändert auch per Touch.

   GHTouch.dpad({ up: "ArrowUp", down: "ArrowDown", left: "ArrowLeft", right: "ArrowRight" }, { side: "left" })
   GHTouch.buttons([{ label: "Springen", key: " " }], { side: "right" })
   GHTouch.swipe(element, { up: "ArrowUp", ... })   // Wischgesten
   ========================================================================== */
(function () {
  "use strict";

  const CODES = {
    ArrowUp: ["ArrowUp", 38], ArrowDown: ["ArrowDown", 40], ArrowLeft: ["ArrowLeft", 37], ArrowRight: ["ArrowRight", 39],
    " ": ["Space", 32], Enter: ["Enter", 13], Escape: ["Escape", 27], Shift: ["ShiftLeft", 16]
  };
  function info(key) {
    if (CODES[key]) return CODES[key];
    if (/^[a-z0-9]$/i.test(key)) return [(/\d/.test(key) ? "Digit" : "Key") + key.toUpperCase(), key.toUpperCase().charCodeAt(0)];
    return [key, 0];
  }

  function send(type, key) {
    const [code, keyCode] = info(key);
    const ev = new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true });
    try {
      Object.defineProperty(ev, "keyCode", { get: () => keyCode });
      Object.defineProperty(ev, "which", { get: () => keyCode });
    } catch (e) { /* egal */ }
    (document.activeElement && document.activeElement !== document.body ? document.activeElement : document).dispatchEvent(ev);
  }

  const held = new Map();
  function press(key, repeat) {
    send("keydown", key);
    if (repeat) {
      clearInterval(held.get(key));
      held.set(key, setInterval(() => send("keydown", key), 110));
    }
  }
  function release(key) {
    clearInterval(held.get(key));
    held.delete(key);
    send("keyup", key);
  }

  function container(side) {
    let el = document.querySelector(".gh-pad-" + side);
    if (!el) {
      el = document.createElement("div");
      el.className = "gh-pad gh-pad-" + side;
      document.body.appendChild(el);
    }
    return el;
  }

  function makeButton(label, key, opts) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "gh-pad-btn" + (opts.cls ? " " + opts.cls : "");
    b.innerHTML = label;
    b.setAttribute("aria-label", opts.aria || label);
    const down = (e) => { e.preventDefault(); b.classList.add("on"); press(key, opts.repeat); if (navigator.vibrate) navigator.vibrate(8); };
    const up = (e) => { if (e) e.preventDefault(); if (!b.classList.contains("on")) return; b.classList.remove("on"); release(key); };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("pointerleave", up);
    b.addEventListener("contextmenu", (e) => e.preventDefault());
    return b;
  }

  window.GHTouch = {
    active: () => !!window.GH_TOUCH,

    /** Steuerkreuz. keys: { up, down, left, right } – fehlende Richtungen werden ausgelassen */
    dpad(keys, opts) {
      opts = opts || {};
      if (!window.GH_TOUCH && !opts.always) return null;
      const wrap = container(opts.side || "left");
      const pad = document.createElement("div");
      pad.className = "gh-dpad";
      const arrows = { up: "▲", left: "◀", right: "▶", down: "▼" };
      Object.keys(arrows).forEach((dir) => {
        if (!keys[dir]) return;
        const b = makeButton(arrows[dir], keys[dir], { repeat: opts.repeat, cls: "d-" + dir, aria: dir });
        pad.appendChild(b);
      });
      wrap.appendChild(pad);
      return pad;
    },

    /** Einzelne Knöpfe, z. B. [{ label: "Springen", key: " ", big: true }] */
    buttons(list, opts) {
      opts = opts || {};
      if (!window.GH_TOUCH && !opts.always) return null;
      const wrap = container(opts.side || "right");
      const group = document.createElement("div");
      group.className = "gh-btns";
      list.forEach((b) => group.appendChild(makeButton(b.label, b.key, { repeat: b.repeat, cls: b.big ? "big" : "" })));
      wrap.appendChild(group);
      return group;
    },

    /** Wischgesten auf einem Element → Tastendruck oder Callback */
    swipe(el, map, opts) {
      opts = opts || {};
      let sx = 0, sy = 0, st = 0;
      el.addEventListener("touchstart", (e) => { const t = e.touches[0]; sx = t.clientX; sy = t.clientY; st = Date.now(); }, { passive: true });
      el.addEventListener("touchend", (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        const min = opts.min || 28;
        let dir = null;
        if (Math.abs(dx) < min && Math.abs(dy) < min) dir = Date.now() - st < 300 ? "tap" : null;
        else dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        if (!dir || !map[dir]) return;
        if (typeof map[dir] === "function") map[dir]();
        else { send("keydown", map[dir]); setTimeout(() => send("keyup", map[dir]), 60); }
      }, { passive: true });
    },

    key: (k) => { send("keydown", k); setTimeout(() => send("keyup", k), 60); }
  };
})();
