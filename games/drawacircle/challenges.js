/* Draw a Circle – Herausforderungen (gemeinsam für 2D und 3D)
   r = Radius im Verhältnis zur halben Feldbreite (1 = Kreis füllt das Feld) */
window.CIRCLE_CHALLENGES = [
  { name: "Aufwärmen",        desc: "Erreiche mindestens 70 %.",                         min: 70 },
  { name: "Sauber",           desc: "Erreiche mindestens 80 %.",                         min: 80 },
  { name: "Groß",             desc: "80 % mit einem großen Kreis (fast feldfüllend).",   min: 80, minR: 0.7 },
  { name: "Schnell",          desc: "85 % in weniger als 1,5 Sekunden.",                 min: 85, maxTime: 1500 },
  { name: "Klein & präzise",  desc: "85 % mit einem kleinen Kreis.",                     min: 85, maxR: 0.35 },
  { name: "Meister",          desc: "Erreiche mindestens 92 %.",                         min: 92 }
];
window.checkCircleChallenge = function (c, res) {
  if (!c) return { ok: true, why: "" };
  if (res.score < c.min) return { ok: false, why: "Mindestens " + c.min + " % nötig." };
  if (c.minR && res.r < c.minR) return { ok: false, why: "Der Kreis war zu klein." };
  if (c.maxR && res.r > c.maxR) return { ok: false, why: "Der Kreis war zu groß." };
  if (c.maxTime && res.time > c.maxTime) return { ok: false, why: "Zu langsam (" + (res.time / 1000).toFixed(2).replace(".", ",") + " s)." };
  return { ok: true, why: "" };
};
