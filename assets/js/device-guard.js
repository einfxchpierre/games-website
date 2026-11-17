/* ==========================================================================
   GAMEHUB – Nur Desktop: blockiert Smartphones & Tablets.
   Muss als erstes Script im <head> eingebunden werden.
   ========================================================================== */
(function () {
  // Im GAMEHUB-Player eingebettet? → Spiel blendet eigene "Bibliothek"-Links aus
  try { if (window.self !== window.top) document.documentElement.classList.add("gh-embedded"); } catch (e) { document.documentElement.classList.add("gh-embedded"); }

  var ua = navigator.userAgent || "";
  var mobileUA = /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle|BlackBerry|Opera Mini|IEMobile/i.test(ua);
  // iPadOS meldet sich als "Macintosh" – an Touchpunkten erkennbar
  var iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  var touchOnly = window.matchMedia && window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
  if (!(mobileUA || iPadOS || touchOnly)) return;

  try { window.stop(); } catch (e) {}
  document.documentElement.innerHTML =
    '<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GAMEHUB – nur am PC</title>' +
    '<style>html,body{margin:0;height:100%;background:#06020a;color:#f6f2f9;font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif}' +
    'body{display:grid;place-items:center;padding:24px;box-sizing:border-box;text-align:center;' +
    'background:radial-gradient(120% 60% at 0% 100%,#3a0d41 0%,rgba(58,13,65,0) 70%),#06020a}' +
    '.b{max-width:340px}.i{width:64px;height:64px;margin:0 auto 22px;border-radius:18px;display:grid;place-items:center;background:#1b1023;border:1px solid #322f34}' +
    'svg{width:30px;height:30px;stroke:#e254d6;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}' +
    'h1{font-size:22px;margin:0 0 10px;letter-spacing:-.02em}p{margin:0;color:#b9afc4;line-height:1.5;font-size:15px}' +
    '.l{margin-top:26px;font-weight:700;letter-spacing:-.02em;font-size:17px}</style></head>' +
    '<body><div class="b"><div class="i"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/></svg></div>' +
    '<h1>Nur auf PC &amp; Laptop</h1><p>GAMEHUB ist ein Desktop-Launcher. Öffne die Seite bitte auf deinem Computer, um zu spielen.</p>' +
    '<div class="l">GAMEHUB</div></div></body>';
})();
