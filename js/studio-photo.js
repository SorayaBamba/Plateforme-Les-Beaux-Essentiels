/* =========================================================
   Studio PHOTO : retouche pro, détourage IA, fonds réalistes,
   textes & logo, modèles de publications, export HD
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, q } = LBE;
  const ST = LBE.studio;

  const FORMATS = {
    post: { nom: "Publication 4:5", w: 1080, h: 1350 },
    carre: { nom: "Carré 1:1", w: 1080, h: 1080 },
    story: { nom: "Story / TikTok 9:16", w: 1080, h: 1920 },
    paysage: { nom: "Paysage 16:9", w: 1920, h: 1080 },
  };
  const R0 = { exposition: 0, luminosite: 0, contraste: 0, hautesLumieres: 0, ombres: 0, saturation: 0, vibrance: 0, temperature: 0, teinte: 0, nettete: 0, douceur: 0, vignette: 0, grain: 0 };
  const REGLAGES = [
    ["Lumière", [["exposition", "Exposition"], ["luminosite", "Luminosité"], ["contraste", "Contraste"], ["hautesLumieres", "Hautes lumières"], ["ombres", "Ombres"]]],
    ["Couleur", [["saturation", "Saturation"], ["vibrance", "Vibrance"], ["temperature", "Température"], ["teinte", "Teinte (rosé)"]]],
    ["Finition", [["nettete", "Netteté", 0, 100], ["douceur", "Halo lumineux", 0, 100], ["vignette", "Vignette", 0, 100], ["grain", "Grain film", 0, 100]]],
  ];
  const FILTRES = {
    original: { nom: "Original", r: {} },
    nacre: { nom: "Nacre", r: { luminosite: 6, contraste: -6, saturation: -8, temperature: 4, teinte: 8, ombres: 15, douceur: 30 } },
    matin: { nom: "Lumière du matin", r: { exposition: 10, ombres: 25, hautesLumieres: -15, temperature: 10, teinte: 6, douceur: 35, vignette: 12 } },
    lagon: { nom: "Lagon", r: { temperature: -20, saturation: 10, contraste: 8, vibrance: 15, hautesLumieres: -10 } },
    sable: { nom: "Sable doré", r: { temperature: 22, vibrance: 12, saturation: 4, ombres: 10, douceur: 12 } },
    eclat: { nom: "Éclat produit", r: { contraste: 16, nettete: 45, vibrance: 22, hautesLumieres: -12, ombres: 8 } },
    couchant: { nom: "Coucher de soleil", r: { temperature: 32, teinte: 12, saturation: 8, contraste: 6, vignette: 28, douceur: 15 } },
    ivoire: { nom: "Ivoire vintage", r: { saturation: -30, temperature: 10, contraste: -8, luminosite: 8, grain: 12, douceur: 20 } },
    nb: { nom: "Noir & blanc chic", r: { saturation: -100, contraste: 18, grain: 18, vignette: 15 } },
  };
  const POLICES = [["Cormorant Garamond", "Cormorant (titres)"], ["Jost", "Jost (moderne)"], ["Playfair Display", "Playfair (élégant)"], ["Great Vibes", "Great Vibes (manuscrit)"], ["Montserrat", "Montserrat (impact)"]];
  const COULEURS = ["#2b3743", "#ffffff", "#355f7d", "#b08d5b", "#e2b4a6", "#f3dcd4", "#d9bf98", "#1d2630"];

  /* ---------- État de l'éditeur (conservé tant que la page est ouverte) ---------- */
  const E = {
    format: "post", mode: "photo", fond: "nacre", fondCouleur: "#f6efe8", flouFond: 18, fondImg: null, voile: 0, cadre: false,
    reglages: { ...R0 }, filtre: "original",
    img: { zoom: 1, x: 0, y: 0, miroir: false, rotation: 0 },
    ombre: 55, reflet: false,
    calques: [], sel: null, outil: "photo",
    src: null, srcMini: null, sujet: null, traite: null, sujetTraite: null, bornes: null,
    produitId: "", pinceau: null, taillePinceau: 40,
    historique: [], nomFichier: "visuel",
  };
  let canvas, ctx, root, rafId = 0, avant = false, cacheFlou = {};

  /* ---------- Traitement d'image (pixels) ---------- */
  function appliquer(src, r) {
    const w = src.width, h = src.height;
    const out = ST.canvas(w, h); const x = out.getContext("2d");
    x.drawImage(src, 0, 0);
    const actifs = ["exposition", "luminosite", "contraste", "hautesLumieres", "ombres", "saturation", "vibrance", "temperature", "teinte", "nettete"].some((k) => r[k]);
    if (!actifs) return out;
    let flou = null;
    if (r.nettete > 0) flou = ST.flou(src, Math.max(2, Math.min(w, h) / 500)).getContext("2d").getImageData(0, 0, w, h).data;
    const id = x.getImageData(0, 0, w, h), d = id.data;
    const lut = new Float32Array(256);
    const expo = Math.pow(2, r.exposition / 60), c = r.contraste * 1.28, cf = (259 * (c + 255)) / (255 * (259 - c));
    for (let i = 0; i < 256; i++) lut[i] = (i * expo + r.luminosite * 0.7 - 128) * cf + 128;
    const sh = r.ombres / 100 * 75, hl = r.hautesLumieres / 100 * 75, sat = 1 + r.saturation / 100, vib = r.vibrance / 100 * 1.3;
    const temp = r.temperature * 0.45, tint = r.teinte * 0.35, sharp = r.nettete / 100 * 1.8;
    const cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v | 0);
    for (let p = 0; p < d.length; p += 4) {
      if (d[p + 3] === 0) continue;
      let R = d[p], G = d[p + 1], B = d[p + 2];
      if (flou) { R += (R - flou[p]) * sharp; G += (G - flou[p + 1]) * sharp; B += (B - flou[p + 2]) * sharp; }
      R = lut[cl(R)]; G = lut[cl(G)]; B = lut[cl(B)];
      if (sh || hl) { const L = Math.min(1, Math.max(0, (0.299 * R + 0.587 * G + 0.114 * B) / 255)); const a = sh * (1 - L) * (1 - L) + hl * L * L; R += a; G += a; B += a; }
      if (temp || tint) { R += temp + tint * 0.4; G -= tint; B += tint * 0.4 - temp; }
      if (sat !== 1 || vib) {
        const g = 0.299 * R + 0.587 * G + 0.114 * B;
        let s = sat;
        if (vib) { const mx = Math.max(R, G, B), mn = Math.min(R, G, B); s *= 1 + vib * (1 - Math.min(1, Math.max(0, (mx - mn) / 255))); }
        R = g + (R - g) * s; G = g + (G - g) * s; B = g + (B - g) * s;
      }
      d[p] = R; d[p + 1] = G; d[p + 2] = B;
    }
    x.putImageData(id, 0, 0);
    return out;
  }
  let traitementPrevu = 0;
  function traiter(rapide) {
    cancelAnimationFrame(traitementPrevu);
    traitementPrevu = requestAnimationFrame(() => {
      try {
        if (rapide && E.srcMini) {
          E.traite = appliquer(E.srcMini, E.reglages);
          if (E.sujet) E.sujetTraite = appliquer(reduire(E.sujet, 800), E.reglages);
        } else {
          E.traite = E.src ? appliquer(E.src, E.reglages) : null;
          E.sujetTraite = E.sujet ? appliquer(E.sujet, E.reglages) : null;
        }
        cacheFlou = {};
      } catch (e) { console.error(e); ui.toast("Cette photo est protégée par son site d'origine : importez-la depuis votre appareil.", true); }
      dessinerApercu();
    });
  }
  function reduire(src, max) {
    const s = Math.min(1, max / Math.max(src.width, src.height));
    if (s === 1) return src;
    const c = ST.canvas(src.width * s, src.height * s); const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(src, 0, 0, c.width, c.height); return c;
  }
  function bornesAlpha(c) {
    const s = Math.min(1, 300 / Math.max(c.width, c.height));
    const m = reduire(c, 300); const d = m.getContext("2d").getImageData(0, 0, m.width, m.height).data;
    let x0 = m.width, y0 = m.height, x1 = 0, y1 = 0;
    for (let y = 0; y < m.height; y++) for (let x = 0; x < m.width; x++) if (d[(y * m.width + x) * 4 + 3] > 40) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    if (x1 < x0) return { x0: 0, y0: 0, x1: c.width, y1: c.height };
    return { x0: x0 / s, y0: y0 / s, x1: (x1 + 1) / s, y1: (y1 + 1) / s };
  }

  /* ---------- Composition ---------- */
  function geometrie(W, H) {
    const ref = E.src; if (!ref) return null;
    const detoure = E.mode === "detoure" && E.sujet;
    const fit = detoure ? Math.min(W / ref.width, H / ref.height) * 0.74 : Math.max(W / ref.width, H / ref.height);
    const k = W / FORMATS[E.format].w;
    const s = fit * E.img.zoom;
    return { s, dw: ref.width * s, dh: ref.height * s, cx: W / 2 + E.img.x * k, cy: H / 2 + E.img.y * k, rot: E.img.rotation * Math.PI / 180, mir: E.img.miroir ? -1 : 1, detoure };
  }
  function dessinerImage(x, pic, g) {
    x.save(); x.translate(g.cx, g.cy); x.rotate(g.rot); x.scale(g.mir, 1);
    x.imageSmoothingQuality = "high";
    x.drawImage(pic, -g.dw / 2, -g.dh / 2, g.dw, g.dh);
    x.restore();
  }
  function couvrir(x, img, W, H) { const s = Math.max(W / img.width, H / img.height); x.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); }

  function dessinerFond(x, W, H, k) {
    if (E.fond === "uni") { x.fillStyle = E.fondCouleur; x.fillRect(0, 0, W, H); return; }
    if ((E.fond === "maphoto" && (E.traite || E.src)) || (E.fond === "image" && E.fondImg)) {
      const src = E.fond === "image" ? E.fondImg : E.traite || E.src;
      const cle = E.fond + "_" + W + "_" + E.flouFond + "_" + (E.fond === "maphoto" ? E.img.zoom + "_" + E.img.x + "_" + E.img.y : "");
      if (!cacheFlou[cle]) {
        const c = ST.canvas(W, H); const cx = c.getContext("2d");
        if (E.fond === "maphoto") { const g = geometrie(W, H); const s2 = Math.max(W / src.width, H / src.height) * 1.08; dessinerImage(cx, src, { ...g, s: s2, dw: src.width * s2, dh: src.height * s2, cx: W / 2, cy: H / 2 }); }
        else couvrir(cx, src, W, H);
        cacheFlou = {}; cacheFlou[cle] = E.flouFond > 0 ? ST.flou(c, E.flouFond * k * 1.4) : c;
      }
      x.drawImage(cacheFlou[cle], 0, 0, W, H);
      return;
    }
    (ST.FONDS[E.fond] || ST.FONDS.nacre).dessin(x, W, H);
  }

  function dessiner(x, W, H, opts) {
    opts = opts || {};
    const k = W / FORMATS[E.format].w;
    const r = E.reglages;
    x.save();
    x.clearRect(0, 0, W, H);
    const g = geometrie(W, H);
    if (!g || g.detoure) dessinerFond(x, W, H, k);
    if (g) {
      if (g.detoure) {
        const pic = opts.avant ? E.sujet : E.sujetTraite || E.sujet;
        const b = E.bornes || { x0: 0, y0: 0, x1: E.sujet.width, y1: E.sujet.height };
        const rs = g.s;
        const bas = g.cy - g.dh / 2 + b.y1 * rs, gx0 = g.cx - g.dw / 2 + b.x0 * rs, gx1 = g.cx - g.dw / 2 + b.x1 * rs;
        const largeurSujet = Math.max(10, gx1 - gx0), mx = (gx0 + gx1) / 2;
        const ombre = E.ombre / 100;
        // Reflet sur surface brillante
        if (E.reflet) {
          const hRef = Math.min(g.dh * 0.45, H - bas);
          if (hRef > 4) {
            const c = ST.canvas(W, H); const cx = c.getContext("2d");
            cx.save(); cx.translate(0, bas * 2); cx.scale(1, -1); dessinerImage(cx, pic, g); cx.restore();
            cx.globalCompositeOperation = "destination-in";
            const gr = cx.createLinearGradient(0, bas, 0, bas + hRef); gr.addColorStop(0, "rgba(0,0,0,.32)"); gr.addColorStop(1, "rgba(0,0,0,0)");
            cx.fillStyle = gr; cx.fillRect(0, bas, W, hRef);
            x.drawImage(ST.flou(c, 1.5 * k), 0, 0);
          }
        }
        // Ombre de contact (au sol)
        if (ombre > 0) {
          x.save();
          x.translate(mx, bas - 2 * k); x.scale(1, 0.13);
          const rr = largeurSujet * 0.62;
          const gr = x.createRadialGradient(0, 0, 0, 0, 0, rr);
          gr.addColorStop(0, "rgba(40,32,24," + 0.55 * ombre + ")"); gr.addColorStop(0.45, "rgba(40,32,24," + 0.22 * ombre + ")"); gr.addColorStop(1, "rgba(40,32,24,0)");
          x.fillStyle = gr; x.beginPath(); x.arc(0, 0, rr, 0, Math.PI * 2); x.fill();
          x.restore();
        }
        // Sujet avec ombre portée douce
        x.save();
        if (ombre > 0) { x.shadowColor = "rgba(45,38,30," + 0.32 * ombre + ")"; x.shadowBlur = 46 * k; x.shadowOffsetY = 22 * k; x.shadowOffsetX = 6 * k; }
        dessinerImage(x, pic, g);
        x.restore();
      } else {
        dessinerImage(x, opts.avant ? E.src : E.traite || E.src, g);
      }
    }
    if (!opts.avant) {
      if (r.douceur > 0) {
        const snap = ST.canvas(W, H); snap.getContext("2d").drawImage(x.canvas, 0, 0);
        const halo = ST.flou(snap, W / 45);
        x.save(); x.globalAlpha = r.douceur / 100 * 0.6; x.globalCompositeOperation = "screen"; x.drawImage(halo, 0, 0); x.restore();
      }
      if (E.voile > 0) {
        const gr = x.createLinearGradient(0, H * 0.35, 0, H);
        gr.addColorStop(0, "rgba(20,24,30,0)"); gr.addColorStop(1, "rgba(20,24,30," + E.voile / 100 * 0.75 + ")");
        x.fillStyle = gr; x.fillRect(0, 0, W, H);
      }
      if (r.vignette > 0) {
        const rad = Math.hypot(W, H) / 2;
        const gr = x.createRadialGradient(W / 2, H / 2, rad * 0.45, W / 2, H / 2, rad);
        gr.addColorStop(0, "rgba(30,24,20,0)"); gr.addColorStop(1, "rgba(30,24,20," + r.vignette / 100 * 0.65 + ")");
        x.fillStyle = gr; x.fillRect(0, 0, W, H);
      }
      if (r.grain > 0) {
        x.save(); x.globalAlpha = r.grain / 100 * 0.45; x.globalCompositeOperation = "overlay";
        x.fillStyle = x.createPattern(tuileGrain(), "repeat"); x.fillRect(0, 0, W, H); x.restore();
      }
    }
    if (E.cadre) { x.strokeStyle = "rgba(255,255,255,.9)"; x.lineWidth = 3 * k; x.strokeRect(40 * k, 40 * k, W - 80 * k, H - 80 * k); x.strokeStyle = "rgba(176,141,91,.55)"; x.lineWidth = 1.2 * k; x.strokeRect(52 * k, 52 * k, W - 104 * k, H - 104 * k); }
    for (const c of E.calques) dessinerCalque(x, c, k);
    if (opts.selection && E.sel && E.sel !== "image") {
      const c = E.calques.find((z) => z.id === E.sel);
      if (c && c._bb) { x.save(); x.strokeStyle = "#5f8eac"; x.setLineDash([8 * k, 6 * k]); x.lineWidth = 2 * k; const p = 10; x.strokeRect((c._bb.x - p) * k, (c._bb.y - p) * k, (c._bb.w + p * 2) * k, (c._bb.h + p * 2) * k); x.restore(); }
    }
    x.restore();
  }
  let grainTuile;
  function tuileGrain() {
    if (grainTuile) return grainTuile;
    grainTuile = ST.canvas(160, 160); const x = grainTuile.getContext("2d"); const id = x.createImageData(160, 160);
    for (let i = 0; i < id.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 190; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    x.putImageData(id, 0, 0); return grainTuile;
  }

  /* ---------- Calques (textes, badges, pastilles, logo) ---------- */
  function nouveauCalque(type, o) {
    const F = FORMATS[E.format];
    const base = { id: LBE.util.uid(), type, x: F.w / 2, y: F.h / 2, taille: 72, couleur: "#2b3743", police: "Cormorant Garamond", poids: "600", italique: false, majuscules: false, espacement: 0, align: "center", fond: "", ombre: false, opacite: 1, rotation: 0, texte: "Votre texte" };
    return Object.assign(base, o || {});
  }
  function dessinerCalque(x, c, k) {
    x.save();
    x.globalAlpha = c.opacite == null ? 1 : c.opacite;
    x.translate(c.x * k, c.y * k);
    if (c.rotation) x.rotate(c.rotation * Math.PI / 180);
    let bb;
    if (c.type === "logo") {
      if (c.ombre) { x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = c.taille * 0.2 * k; }
      const r = ST.dessinerLogo(x, 0, 0, c.taille * k, c.couleur, c.accent || c.couleur);
      bb = { x: r.x / k, y: r.y / k, w: r.w / k, h: r.h / k };
    } else if (c.type === "pastille") {
      const R = c.taille * 1.25 * k;
      if (c.ombre !== false) { x.shadowColor = "rgba(0,0,0,.18)"; x.shadowBlur = 20 * k; x.shadowOffsetY = 6 * k; }
      x.fillStyle = c.fond || "#355f7d"; x.beginPath(); x.arc(0, 0, R, 0, Math.PI * 2); x.fill();
      x.shadowColor = "transparent";
      x.strokeStyle = "rgba(255,255,255,.55)"; x.lineWidth = 2 * k; x.beginPath(); x.arc(0, 0, R * 0.86, 0, Math.PI * 2); x.stroke();
      const lignes = String(c.texte).split("\n");
      x.fillStyle = c.couleur; x.textAlign = "center"; x.textBaseline = "middle";
      lignes.forEach((l, i) => { const t = i === 0 ? c.taille * 0.62 : c.taille * 0.3; x.font = (i === 0 ? "600 " : "500 ") + t * k + 'px "' + (i === 0 ? c.police : "Jost") + '", serif'; x.fillText(l, 0, (i - (lignes.length - 1) / 2) * c.taille * 0.55 * k); });
      bb = { x: -R / k, y: -R / k, w: (R * 2) / k, h: (R * 2) / k };
    } else {
      const txt = c.majuscules ? String(c.texte).toUpperCase() : String(c.texte);
      const lignes = txt.split("\n");
      const t = c.taille * k, esp = c.espacement * k;
      x.font = (c.italique ? "italic " : "") + c.poids + " " + t + 'px "' + c.police + '", Georgia, serif';
      x.textBaseline = "alphabetic";
      const lh = t * (c.police === "Great Vibes" ? 1.25 : 1.15);
      const largeurs = lignes.map((l) => ST.largeurEspace(x, l, esp));
      const W = Math.max(...largeurs, 1), Ht = lh * lignes.length;
      const top = -Ht / 2, asc = t * 0.8;
      const xAlign = c.align === "left" ? -W / 2 : c.align === "right" ? W / 2 : 0;
      if (c.fond) {
        const px = t * 0.55, py = t * 0.32;
        x.save(); if (c.ombre) { x.shadowColor = "rgba(0,0,0,.18)"; x.shadowBlur = 18 * k; x.shadowOffsetY = 5 * k; }
        x.fillStyle = c.fond; ST.roundRect(x, -W / 2 - px, top - py, W + px * 2, Ht + py * 2, (Ht + py * 2) / 2 > t * 1.4 ? t * 0.5 : (Ht + py * 2) / 2); x.fill(); x.restore();
        bb = { x: (-W / 2 - px) / k, y: (top - py) / k, w: (W + px * 2) / k, h: (Ht + py * 2) / k };
      } else bb = { x: -W / 2 / k, y: top / k, w: W / k, h: Ht / k };
      if (c.ombre && !c.fond) { x.shadowColor = "rgba(0,0,0,.4)"; x.shadowBlur = t * 0.18; x.shadowOffsetY = t * 0.04; }
      x.fillStyle = c.couleur;
      lignes.forEach((l, i) => ST.texteEspace(x, l, xAlign, top + asc + i * lh + (lh - t) / 2, esp, c.align));
    }
    c._bb = { x: c.x + bb.x, y: c.y + bb.y, w: bb.w, h: bb.h };
    x.restore();
  }

  /* ---------- Aperçu & interactions ---------- */
  function dimensionnerCanvas() {
    if (!canvas) return;
    const F = FORMATS[E.format];
    const dispo = canvas.parentElement.clientWidth || 500;
    const maxH = window.innerWidth <= 860 ? window.innerHeight * 0.42 : window.innerHeight - 210;
    const wCss = Math.min(dispo, (maxH * F.w) / F.h);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.min(F.w, Math.round(wCss * dpr));
    canvas.width = w; canvas.height = Math.round((w * F.h) / F.w);
    canvas.style.width = wCss + "px"; canvas.style.height = (wCss * F.h) / F.w + "px";
    cacheFlou = {};
  }
  function dessinerApercu() {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => { if (canvas && canvas.isConnected) dessiner(ctx, canvas.width, canvas.height, { selection: true, avant }); });
  }
  function versFormat(e) {
    const r = canvas.getBoundingClientRect(); const F = FORMATS[E.format];
    return { x: ((e.clientX - r.left) / r.width) * F.w, y: ((e.clientY - r.top) / r.height) * F.h };
  }
  function calqueSous(p) {
    for (let i = E.calques.length - 1; i >= 0; i--) { const c = E.calques[i], b = c._bb; if (b && p.x >= b.x - 14 && p.x <= b.x + b.w + 14 && p.y >= b.y - 14 && p.y <= b.y + b.h + 14) return c; }
    return null;
  }
  // Point de l'aperçu -> coordonnées dans l'image du sujet (pour le pinceau)
  function versSujet(p) {
    const F = FORMATS[E.format]; const g = geometrie(F.w, F.h); if (!g) return null;
    let dx = p.x - g.cx, dy = p.y - g.cy;
    const c = Math.cos(-g.rot), s = Math.sin(-g.rot);
    let rx = dx * c - dy * s, ry = dx * s + dy * c;
    rx *= g.mir;
    return { x: rx / g.s + E.src.width / 2, y: ry / g.s + E.src.height / 2, r: E.taillePinceau / g.s };
  }
  function peindre(p) {
    const sp = versSujet(p); if (!sp || !E.sujet) return;
    const x = E.sujet.getContext("2d");
    x.save(); x.beginPath(); x.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
    if (E.pinceau === "gomme") { x.globalCompositeOperation = "destination-out"; x.fillStyle = "#000"; x.fill(); }
    else { x.clip(); x.drawImage(E.src, 0, 0); }
    x.restore();
    E.sujetTraite = null; dessinerApercu();
  }

  function brancherCanvas() {
    const pts = new Map();
    let drag = null, pinch = null;
    canvas.addEventListener("pointerdown", (e) => {
      canvas.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, versFormat(e));
      const p = versFormat(e);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const cible = E.sel && E.sel !== "image" ? E.calques.find((c) => c.id === E.sel) : null;
        pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y), v0: cible ? cible.taille : E.img.zoom, cible };
        drag = null; return;
      }
      if (E.pinceau && E.mode === "detoure" && E.sujet) { drag = { pinceau: true }; peindre(p); return; }
      const c = calqueSous(p);
      if (c) { E.sel = c.id; drag = { cible: c, dx: p.x - c.x, dy: p.y - c.y }; }
      else if (E.src) { E.sel = "image"; drag = { image: true, x0: p.x, y0: p.y, ix: E.img.x, iy: E.img.y }; }
      else { E.sel = null; drag = null; }
      majPanneau(true); dessinerApercu();
    });
    canvas.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, versFormat(e));
      const p = versFormat(e);
      if (pinch && pts.size === 2) {
        const [a, b] = [...pts.values()]; const r = Math.hypot(a.x - b.x, a.y - b.y) / pinch.d0;
        if (pinch.cible) pinch.cible.taille = Math.max(10, Math.min(600, pinch.v0 * r)); else E.img.zoom = Math.max(0.2, Math.min(6, pinch.v0 * r));
        cacheFlou = {}; dessinerApercu(); return;
      }
      if (!drag) return;
      if (drag.pinceau) { peindre(p); return; }
      if (drag.cible) { drag.cible.x = p.x - drag.dx; drag.cible.y = p.y - drag.dy; }
      else if (drag.image) { E.img.x = drag.ix + (p.x - drag.x0); E.img.y = drag.iy + (p.y - drag.y0); }
      dessinerApercu();
    });
    const fin = (e) => {
      pts.delete(e.pointerId);
      if (drag && drag.pinceau) { E.bornes = bornesAlpha(E.sujet); traiter(false); }
      if (drag || pinch) { memoriser(); majPanneau(true); }
      if (pts.size < 2) pinch = null;
      if (!pts.size) drag = null;
    };
    canvas.addEventListener("pointerup", fin); canvas.addEventListener("pointercancel", fin);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const fct = Math.exp(-e.deltaY * 0.0015);
      const cible = E.sel && E.sel !== "image" ? E.calques.find((c) => c.id === E.sel) : null;
      if (cible) cible.taille = Math.max(10, Math.min(600, cible.taille * fct)); else if (E.src) E.img.zoom = Math.max(0.2, Math.min(6, E.img.zoom * fct));
      cacheFlou = {}; dessinerApercu(); clearTimeout(canvas._w); canvas._w = setTimeout(() => { memoriser(); majPanneau(true); }, 300);
    }, { passive: false });
  }

  /* ---------- Historique (annuler) ---------- */
  const instantane = () => JSON.stringify({ format: E.format, mode: E.mode, fond: E.fond, fondCouleur: E.fondCouleur, flouFond: E.flouFond, voile: E.voile, cadre: E.cadre, reglages: E.reglages, filtre: E.filtre, img: E.img, ombre: E.ombre, reflet: E.reflet, calques: E.calques.map(({ _bb, ...c }) => c) });
  function memoriser() {
    const s = instantane();
    if (E.historique[E.historique.length - 1] === s) return;
    E.historique.push(s); if (E.historique.length > 40) E.historique.shift();
  }
  function annuler() {
    if (E.historique.length < 2) { ui.toast("Rien à annuler"); return; }
    E.historique.pop();
    const s = JSON.parse(E.historique[E.historique.length - 1]);
    const reglagesChanges = JSON.stringify(s.reglages) !== JSON.stringify(E.reglages);
    const formatChange = s.format !== E.format;
    Object.assign(E, s);
    if (formatChange) dimensionnerCanvas();
    if (reglagesChanges) traiter(false); else dessinerApercu();
    majPanneau();
  }

  /* ---------- Chargement d'images ---------- */
  function chargerImage(url, crossOrigin) {
    return new Promise((ok, ko) => { const i = new Image(); if (crossOrigin) i.crossOrigin = "anonymous"; i.onload = () => ok(i); i.onerror = () => ko(new Error("Image illisible")); i.src = url; });
  }
  function versCanvas(img, max) {
    const s = Math.min(1, max / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const c = ST.canvas((img.naturalWidth || img.width) * s, (img.naturalHeight || img.height) * s);
    const x = c.getContext("2d"); x.imageSmoothingQuality = "high"; x.drawImage(img, 0, 0, c.width, c.height); return c;
  }
  async function definirPhoto(img, nom) {
    E.src = versCanvas(img, 2000);
    try { E.src.getContext("2d").getImageData(0, 0, 1, 1); } catch (e) { E.src = null; throw new Error("Le site qui héberge cette photo bloque sa modification. Enregistrez-la sur votre téléphone puis importez-la."); }
    E.srcMini = reduire(E.src, 800);
    E.sujet = null; E.sujetTraite = null; E.bornes = null; E.mode = "photo"; E.pinceau = null;
    E.img = { zoom: 1, x: 0, y: 0, miroir: false, rotation: 0 };
    if (nom) E.nomFichier = nom.replace(/\.[^.]+$/, "");
    cacheFlou = {}; vignettesFiltres = null;
    traiter(false); memoriser(); majPanneau();
  }
  async function importerFichier(file, cible) {
    if (!file) return;
    if (!/^image\//.test(file.type) && !/\.(heic|heif|jpe?g|png|webp)$/i.test(file.name)) { ui.toast("Ce fichier n'est pas une image.", true); return; }
    const url = URL.createObjectURL(file);
    try {
      const img = await chargerImage(url);
      if (cible === "fond") { E.fondImg = versCanvas(img, 2000); E.fond = "image"; cacheFlou = {}; memoriser(); majPanneau(); dessinerApercu(); }
      else await definirPhoto(img, file.name);
    } catch (e) { ui.toast(e.message || "Impossible d'ouvrir cette image (format HEIC ? essayez une capture ou un export JPEG).", true); }
  }

  /* ---------- Détourage par intelligence artificielle (dans le navigateur) ---------- */
  let moduleIA = null;
  async function chargerIA() {
    if (moduleIA) return moduleIA;
    const sources = ["https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm", "https://esm.sh/@imgly/background-removal@1.7.0"];
    let derniere;
    for (const s of sources) { try { moduleIA = await import(s); return moduleIA; } catch (e) { derniere = e; console.warn("IA indisponible via", s, e); } }
    throw derniere || new Error("Module IA introuvable");
  }
  async function detourer(hauteQualite) {
    if (!E.src) { ui.toast("Importez d'abord une photo.", true); return; }
    const voile = document.createElement("div");
    voile.className = "chargement";
    voile.innerHTML = '<div class="spinner"></div><b>Détourage en cours…</b><span class="doux" id="ia-etat">Chargement de l\'intelligence artificielle.<br>Au premier usage, environ 40 à 80 Mo sont téléchargés puis gardés en mémoire.</span><div class="barre-progression"><span id="ia-prog"></span></div>';
    canvas.parentElement.appendChild(voile);
    try {
      const mod = await chargerIA();
      const blob = await new Promise((ok) => E.src.toBlob(ok, "image/png"));
      const res = await mod.removeBackground(blob, {
        model: hauteQualite ? "isnet_fp16" : "isnet_quint8",
        output: { format: "image/png", quality: 1 },
        progress: (cle, cur, tot) => {
          const pr = voile.querySelector("#ia-prog"), et = voile.querySelector("#ia-etat");
          if (pr && tot) pr.style.width = Math.round((cur / tot) * 100) + "%";
          if (et) et.innerHTML = /fetch/.test(cle) ? "Téléchargement du modèle : " + Math.round((cur / (tot || 1)) * 100) + " %" : "Analyse de la photo…";
        },
      });
      const url = URL.createObjectURL(res);
      const img = await chargerImage(url);
      const c = ST.canvas(E.src.width, E.src.height); c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      E.sujet = c; E.bornes = bornesAlpha(c); E.mode = "detoure";
      if (E.fond === "uni" && !E.fondCouleur) E.fond = "nacre";
      E.img.zoom = 1; E.img.x = 0; E.img.y = 0;
      traiter(false); memoriser(); E.outil = "fond"; majPanneau();
      ui.toast("Détourage réussi ✨ Choisissez maintenant un fond.");
    } catch (e) {
      console.error(e);
      ui.modale({ titre: "Détourage indisponible", corps: "<p>L'outil d'intelligence artificielle n'a pas pu se charger (connexion internet requise au premier usage, ou navigateur trop ancien).</p><p class=\"doux\">Astuce : sur iPhone, vous pouvez aussi appuyer longuement sur le sujet dans l'app Photos → « Copier le sujet », l'enregistrer, puis l'importer ici : il arrivera déjà détouré.</p><p class=\"aide\">Détail technique : " + esc(e.message || String(e)) + "</p>", boutons: [{ label: "Fermer", action: (f) => f() }] });
    } finally { voile.remove(); }
  }
  // Une image importée déjà transparente (PNG détouré) est utilisée directement comme sujet
  function utiliserCommeSujet() {
    if (!E.src) return;
    const d = E.src.getContext("2d").getImageData(0, 0, E.src.width, E.src.height).data;
    let transp = 0; for (let i = 3; i < d.length; i += 4 * 37) if (d[i] < 250) transp++;
    if (transp < 5) { ui.toast("Cette image n'a pas de transparence : utilisez le détourage IA.", true); return; }
    E.sujet = ST.canvas(E.src.width, E.src.height); E.sujet.getContext("2d").drawImage(E.src, 0, 0);
    E.bornes = bornesAlpha(E.sujet); E.mode = "detoure"; E.outil = "fond"; traiter(false); memoriser(); majPanneau();
  }

  /* ---------- Modèles de publications ---------- */
  function produitCourant() { return q.produit(E.produitId) || null; }
  function modeles() {
    const p = produitCourant();
    const nom = p ? p.nom : "Classique Nacre";
    const prix = p ? f.euro(p.prix).replace(/,00/, "") : "9 €";
    const cat = p ? q.nomCategorie(p.categorie) : "Bayas Classiques";
    const F = () => FORMATS[E.format];
    const T = (o) => nouveauCalque("texte", o);
    const surPhoto = () => E.src && !(E.mode === "detoure" && E.sujet);
    const clair = () => (surPhoto() ? "#ffffff" : "#2b3743");
    const doux = () => (surPhoto() ? "#f3e6d1" : "#b08d5b");
    return [
      { id: "fiche", nom: "Fiche produit", desc: "Nom, catégorie, prix", fond: "nacre", calques: () => [
        nouveauCalque("logo", { x: F().w / 2, y: F().h * 0.09, taille: 58, couleur: clair(), accent: doux(), ombre: surPhoto() }),
        T({ texte: nom, x: F().w / 2, y: F().h * 0.82, taille: F().w * 0.085, couleur: clair(), ombre: surPhoto() }),
        T({ texte: cat, x: F().w / 2, y: F().h * 0.885, taille: F().w * 0.024, police: "Jost", poids: "500", majuscules: true, espacement: 7, couleur: doux(), ombre: surPhoto() }),
        nouveauCalque("pastille", { texte: prix, x: F().w * 0.83, y: F().h * 0.2, taille: F().w * 0.07, couleur: "#ffffff", fond: "#355f7d" }),
      ], voile: 35 },
      { id: "arrivage", nom: "Nouvel arrivage", desc: "Annonce d'un réassort", fond: "aube", calques: () => [
        T({ texte: "Nouvel arrivage", x: F().w / 2, y: F().h * 0.1, taille: F().w * 0.026, police: "Jost", poids: "500", majuscules: true, espacement: 5, fond: "#ffffff", couleur: "#355f7d", ombre: true }),
        T({ texte: "Fraîchement arrivées\nd'Abidjan ✨", x: F().w / 2, y: F().h * 0.82, taille: F().w * 0.075, italique: true, poids: "500", couleur: clair(), ombre: surPhoto() }),
        nouveauCalque("logo", { x: F().w / 2, y: F().h * 0.935, taille: 34, couleur: clair(), accent: doux() }),
      ], voile: 40 },
      { id: "retour", nom: "De retour en stock", desc: "Pour la liste d'attente", fond: "lagon", calques: () => [
        T({ texte: "De retour", x: F().w / 2, y: F().h * 0.11, taille: F().w * 0.03, police: "Jost", poids: "500", majuscules: true, espacement: 6, fond: "#2b3743", couleur: "#ffffff" }),
        T({ texte: nom, x: F().w / 2, y: F().h * 0.83, taille: F().w * 0.08, couleur: clair(), ombre: surPhoto() }),
        T({ texte: "Vous les attendiez… elles sont là 🤍", x: F().w / 2, y: F().h * 0.895, taille: F().w * 0.032, police: "Jost", poids: "400", couleur: clair(), ombre: surPhoto() }),
      ], voile: 40 },
      { id: "promo", nom: "Promo", desc: "Offre de la semaine", fond: "sable", calques: () => [
        T({ texte: "Offre de la semaine", x: F().w / 2, y: F().h * 0.14, taille: F().w * 0.075, police: "Great Vibes", poids: "400", couleur: clair(), ombre: surPhoto() }),
        T({ texte: "-15 %", x: F().w / 2, y: F().h * 0.76, taille: F().w * 0.2, police: "Playfair Display", poids: "700", couleur: surPhoto() ? "#ffffff" : "#355f7d", ombre: true }),
        T({ texte: "Commandez sur WhatsApp", x: F().w / 2, y: F().h * 0.9, taille: F().w * 0.03, police: "Jost", poids: "500", majuscules: true, espacement: 4, fond: "#25d366", couleur: "#ffffff", ombre: true }),
      ], voile: 45 },
      { id: "avis", nom: "Avis cliente", desc: "Citation + étoiles", fond: "rose", calques: () => [
        T({ texte: "★★★★★", x: F().w / 2, y: F().h * 0.2, taille: F().w * 0.06, police: "Jost", poids: "400", espacement: 10, couleur: "#c9a97a" }),
        T({ texte: "« Je les porte tous les jours,\nelles sont sublimes ! »", x: F().w / 2, y: F().h * 0.36, taille: F().w * 0.068, italique: true, poids: "500", couleur: "#2b3743" }),
        T({ texte: "— Aïcha, Lyon", x: F().w / 2, y: F().h * 0.48, taille: F().w * 0.03, police: "Jost", poids: "400", couleur: "#74808b" }),
        nouveauCalque("logo", { x: F().w / 2, y: F().h * 0.9, taille: 44, couleur: "#2b3743", accent: "#b08d5b" }),
      ], voile: 0, sansPhoto: true },
      { id: "bientot", nom: "Bientôt disponible", desc: "Teasing d'un lancement", fond: "nuit", calques: () => [
        T({ texte: "Bientôt", x: F().w / 2, y: F().h * 0.12, taille: F().w * 0.032, police: "Jost", poids: "500", majuscules: true, espacement: 12, couleur: "#d9bf98" }),
        T({ texte: nom, x: F().w / 2, y: F().h * 0.82, taille: F().w * 0.075, couleur: "#ffffff", ombre: true }),
        T({ texte: "Écrivez « INFO » en message privé\npour être prévenue en premier", x: F().w / 2, y: F().h * 0.9, taille: F().w * 0.028, police: "Jost", poids: "400", couleur: "#f3e6d1" }),
      ], voile: 55 },
      { id: "commander", nom: "Comment commander", desc: "Story pédagogique", fond: "plage", format: "story", calques: () => [
        nouveauCalque("logo", { x: F().w / 2, y: F().h * 0.08, taille: 64, couleur: "#2b3743", accent: "#b08d5b" }),
        T({ texte: "Comment commander ?", x: F().w / 2, y: F().h * 0.2, taille: F().w * 0.08, couleur: "#2b3743" }),
        T({ texte: "1. Écrivez-moi sur WhatsApp\n2. Choisissez vos essentiels\n3. Réglez en toute sécurité\n4. Recevez-les en point relais", x: F().w / 2, y: F().h * 0.33, taille: F().w * 0.042, police: "Jost", poids: "400", couleur: "#2b3743" }),
        T({ texte: "Lien WhatsApp en bio", x: F().w / 2, y: F().h * 0.9, taille: F().w * 0.034, police: "Jost", poids: "500", majuscules: true, espacement: 4, fond: "#25d366", couleur: "#ffffff", ombre: true }),
      ], voile: 0, sansPhoto: true },
    ];
  }
  function appliquerModele(m) {
    if (m.format && m.format !== E.format) { E.format = m.format; dimensionnerCanvas(); }
    if (!E.fondManuel) E.fond = m.fond;
    E.voile = E.src && !(E.mode === "detoure" && E.sujet) ? m.voile || 0 : 0;
    E.calques = m.calques();
    E.sel = null; memoriser(); majPanneau(); dessinerApercu();
    ui.toast("Modèle « " + m.nom + " » appliqué : touchez un texte pour le modifier.");
  }

  /* ---------- Export ---------- */
  function rendreFinal(type) {
    const F = FORMATS[E.format];
    const c = ST.canvas(F.w, F.h); const x = c.getContext("2d");
    if (type === "image/jpeg") { x.fillStyle = "#ffffff"; x.fillRect(0, 0, F.w, F.h); }
    const r = ST.canvas(F.w, F.h); dessiner(r.getContext("2d"), F.w, F.h, {});
    x.drawImage(r, 0, 0);
    return new Promise((ok, ko) => { try { c.toBlob((b) => (b ? ok(b) : ko(new Error("Export impossible"))), type, 0.93); } catch (e) { ko(e); } });
  }
  const nomExport = (ext) => (E.nomFichier || "visuel").replace(/[^\w-]+/g, "-").toLowerCase() + "-" + E.format + ext;

  /* ---------- Panneau d'outils ---------- */
  const OUTILS = [["photo", "image", "Photo"], ["filtres", "etoile", "Filtres"], ["reglages", "parametres", "Réglages"], ["fond", "calque", "Fond"], ["textes", "texte", "Textes"], ["modeles", "catalogue", "Modèles"], ["exporter", "telecharger", "Exporter"]];
  let vignettesFiltres = null;

  function rendre(el, params) {
    if (params[0] && params[0] !== E.produitId) {
      E.produitId = params[0];
      const p = produitCourant();
      if (p) {
        E.nomFichier = p.nom;
        if (!E.calques.length) { setTimeout(() => appliquerModele(modeles()[0]), 50); }
        if (p.photo && !E.src) chargerImage(p.photo, true).then((img) => definirPhoto(img, p.nom)).catch(() => ui.toast("La photo du produit n'a pas pu être chargée : importez-la depuis votre appareil.", true));
      }
    }
    root = el;
    el.innerHTML = '<div class="studio"><div class="studio-scene"><div class="studio-barre">' +
      '<select id="st-format" style="min-height:34px;padding:4px 10px;font-size:.85rem;width:auto;border-radius:999px">' + Object.entries(FORMATS).map(([k, v]) => '<option value="' + k + '"' + (k === E.format ? " selected" : "") + ">" + v.nom + "</option>").join("") + "</select>" +
      '<button class="btn petit" id="st-annuler">' + icon("annuler") + ' Annuler</button><button class="btn petit" id="st-avant" title="Maintenez pour comparer">Avant / après</button><button class="btn petit primaire" id="st-export-rapide">' + icon("telecharger") + " Exporter</button></div>" +
      '<div class="cadre"><canvas id="st-canvas"></canvas></div><div class="aide" id="st-aide"></div></div>' +
      '<div class="studio-panneau"><div class="outils" id="st-outils">' + OUTILS.map(([k, ic, l]) => '<button data-outil="' + k + '">' + icon(ic) + l + "</button>").join("") + '</div><div class="card" id="st-panneau"></div></div></div>' +
      '<input type="file" id="st-file" accept="image/*" hidden><input type="file" id="st-file-fond" accept="image/*" hidden>';
    canvas = el.querySelector("#st-canvas"); ctx = canvas.getContext("2d");
    dimensionnerCanvas(); brancherCanvas();
    el.querySelector("#st-format").onchange = (e) => { E.format = e.target.value; dimensionnerCanvas(); memoriser(); dessinerApercu(); };
    el.querySelector("#st-annuler").onclick = annuler;
    const av = el.querySelector("#st-avant");
    const on = (e) => { e.preventDefault(); avant = true; dessinerApercu(); }, off = () => { if (avant) { avant = false; dessinerApercu(); } };
    av.addEventListener("pointerdown", on); av.addEventListener("pointerup", off); av.addEventListener("pointerleave", off); av.addEventListener("pointercancel", off);
    el.querySelector("#st-export-rapide").onclick = () => { E.outil = "exporter"; majPanneau(); el.querySelector("#st-panneau").scrollIntoView({ behavior: "smooth", block: "nearest" }); };
    el.querySelector("#st-outils").onclick = (e) => { const b = e.target.closest("[data-outil]"); if (b) { E.outil = b.dataset.outil; E.pinceau = null; majPanneau(); } };
    el.querySelector("#st-file").onchange = (e) => { importerFichier(e.target.files[0]); e.target.value = ""; };
    el.querySelector("#st-file-fond").onchange = (e) => { importerFichier(e.target.files[0], "fond"); e.target.value = ""; };
    // Glisser-déposer une photo
    const scene = el.querySelector(".studio-scene");
    scene.addEventListener("dragover", (e) => e.preventDefault());
    scene.addEventListener("drop", (e) => { e.preventDefault(); importerFichier(e.dataTransfer.files[0]); });
    const redim = () => { dimensionnerCanvas(); dessinerApercu(); };
    window.addEventListener("resize", redim);
    LBE.modules._quitter = () => window.removeEventListener("resize", redim);
    if (!E.historique.length) memoriser();
    ST.policesPretes().then(dessinerApercu);
    majPanneau();
    dessinerApercu();
  }

  function slider(cle, label, val, min, max, step) {
    return '<div class="reglage"><label for="sl-' + cle + '">' + esc(label) + '</label><input type="range" id="sl-' + cle + '" data-sl="' + cle + '" min="' + min + '" max="' + max + '" step="' + (step || 1) + '" value="' + val + '"><output>' + Math.round(val * 100) / 100 + "</output></div>";
  }
  function brancherSliders(zone, set, rapide) {
    zone.querySelectorAll("[data-sl]").forEach((s) => {
      s.addEventListener("input", () => { s.nextElementSibling.textContent = s.value; set(s.dataset.sl, Number(s.value), true); });
      s.addEventListener("change", () => { set(s.dataset.sl, Number(s.value), false); memoriser(); });
      s.addEventListener("dblclick", () => { const d = s.dataset.defaut != null ? Number(s.dataset.defaut) : 0; s.value = d; s.nextElementSibling.textContent = d; set(s.dataset.sl, d, false); memoriser(); });
    });
  }

  function majPanneau(seulementSelection) {
    if (!root || !root.isConnected) return;
    root.querySelectorAll("[data-outil]").forEach((b) => b.classList.toggle("actif", b.dataset.outil === E.outil));
    const aide = root.querySelector("#st-aide");
    aide.textContent = E.pinceau ? "Pinceau actif : glissez sur l'image pour " + (E.pinceau === "gomme" ? "effacer" : "restaurer") + "." : !E.src && !E.calques.length ? "Importez une photo ou choisissez un modèle pour commencer." : "Glissez pour déplacer · pincez ou molette pour agrandir · double-clic sur un réglage pour le remettre à zéro.";
    if (seulementSelection && E.outil !== "textes" && E.outil !== "photo") return;
    const p = root.querySelector("#st-panneau");
    const H = { photo: panneauPhoto, filtres: panneauFiltres, reglages: panneauReglages, fond: panneauFond, textes: panneauTextes, modeles: panneauModeles, exporter: panneauExport }[E.outil];
    if (seulementSelection && E.outil === "photo" && !E.sel) return;
    H(p);
  }

  function panneauPhoto(p) {
    const a = E.src;
    p.innerHTML = '<h3>' + icon("image") + " Photo</h3>" +
      '<div class="depose" id="pp-import">' + icon("televerser") + "<br><b>" + (a ? "Remplacer la photo" : "Importer une photo") + "</b><br><small>Galerie, appareil photo ou glisser-déposer</small></div>" +
      (a ? '<div class="groupe-titre mt">Détourage (supprimer l\'arrière-plan)</div>' +
        '<div class="row-flex"><button class="btn sable" id="pp-ia">' + icon("baguette") + " Détourer par IA</button><button class=\"btn petit\" id=\"pp-ia-hq\" title=\"Plus précis, plus lent\">Haute précision</button></div>" +
        '<p class="aide">L\'IA fonctionne dans votre téléphone : vos photos ne sont envoyées nulle part.</p>' +
        '<div class="row-flex"><button class="btn petit" id="pp-png">Ma photo est déjà détourée (PNG)</button></div>' +
        (E.sujet ? '<div class="segmented mt" id="pp-mode"><button data-m="photo" class="' + (E.mode === "photo" ? "actif" : "") + '">Photo d\'origine</button><button data-m="detoure" class="' + (E.mode === "detoure" ? "actif" : "") + '">Sujet détouré</button></div>' +
          (E.mode === "detoure" ? '<div class="groupe-titre mt">Retoucher le détourage</div><div class="segmented" id="pp-pinceau"><button data-p="" class="' + (!E.pinceau ? "actif" : "") + '">Déplacer</button><button data-p="gomme" class="' + (E.pinceau === "gomme" ? "actif" : "") + '">Gomme</button><button data-p="restaurer" class="' + (E.pinceau === "restaurer" ? "actif" : "") + '">Restaurer</button></div>' + slider("taillePinceau", "Taille pinceau", E.taillePinceau, 6, 160) : "") : "") +
        '<div class="groupe-titre mt">Cadrage</div>' + slider("zoom", "Zoom", E.img.zoom, 0.2, 4, 0.01) + slider("rotation", "Rotation", E.img.rotation, -180, 180) +
        '<div class="row-flex mt"><button class="btn petit" id="pp-miroir">↔ Miroir</button><button class="btn petit" id="pp-centrer">Recentrer</button><button class="btn petit fantome" id="pp-retirer">' + icon("poubelle") + " Retirer la photo</button></div>" : "");
    p.querySelector("#pp-import").onclick = () => root.querySelector("#st-file").click();
    if (!a) return;
    p.querySelector("#pp-ia").onclick = () => detourer(false);
    p.querySelector("#pp-ia-hq").onclick = () => detourer(true);
    p.querySelector("#pp-png").onclick = utiliserCommeSujet;
    const mode = p.querySelector("#pp-mode");
    if (mode) mode.onclick = (e) => { const b = e.target.closest("[data-m]"); if (!b) return; E.mode = b.dataset.m; E.pinceau = null; E.img.zoom = 1; E.img.x = 0; E.img.y = 0; cacheFlou = {}; memoriser(); majPanneau(); dessinerApercu(); };
    const pin = p.querySelector("#pp-pinceau");
    if (pin) pin.onclick = (e) => { const b = e.target.closest("[data-p]"); if (!b) return; E.pinceau = b.dataset.p || null; majPanneau(); };
    p.querySelector('[data-sl="zoom"]').dataset.defaut = 1;
    brancherSliders(p, (k, v) => { if (k === "taillePinceau") E.taillePinceau = v; else E.img[k] = v; cacheFlou = {}; dessinerApercu(); });
    p.querySelector("#pp-miroir").onclick = () => { E.img.miroir = !E.img.miroir; memoriser(); dessinerApercu(); };
    p.querySelector("#pp-centrer").onclick = () => { E.img = { ...E.img, zoom: 1, x: 0, y: 0, rotation: 0 }; memoriser(); majPanneau(); dessinerApercu(); };
    p.querySelector("#pp-retirer").onclick = () => { E.src = E.srcMini = E.sujet = E.traite = E.sujetTraite = null; E.mode = "photo"; memoriser(); majPanneau(); dessinerApercu(); };
  }

  function panneauFiltres(p) {
    p.innerHTML = "<h3>" + icon("etoile") + ' Filtres « Aube sur la plage »</h3><div class="filtres">' + Object.entries(FILTRES).map(([k, v]) => '<button class="filtre ' + (E.filtre === k ? "actif" : "") + '" data-f="' + k + '"><canvas width="120" height="120" data-apercu="' + k + '"></canvas>' + esc(v.nom) + "</button>").join("") + '</div><p class="aide mt">Un filtre règle plusieurs curseurs d\'un coup : affinez ensuite dans « Réglages ».</p>';
    // Vignettes calculées sur une mini version de la photo (ou du fond)
    const base = ST.canvas(120, 120); const bx = base.getContext("2d");
    if (E.src) { const s = reduire(E.src, 240); couvrir(bx, s, 120, 120); } else (ST.FONDS[E.fond] || ST.FONDS.nacre).dessin(bx, 120, 120);
    p.querySelectorAll("[data-apercu]").forEach((c) => {
      const r = { ...R0, ...FILTRES[c.dataset.apercu].r };
      const x = c.getContext("2d"); x.drawImage(appliquer(base, r), 0, 0);
      if (r.vignette) { const g = x.createRadialGradient(60, 60, 30, 60, 60, 85); g.addColorStop(0, "rgba(30,24,20,0)"); g.addColorStop(1, "rgba(30,24,20," + r.vignette / 100 * 0.65 + ")"); x.fillStyle = g; x.fillRect(0, 0, 120, 120); }
      if (r.douceur) { x.globalAlpha = r.douceur / 100 * 0.6; x.globalCompositeOperation = "screen"; x.drawImage(ST.flou(c, 3), 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = "source-over"; }
    });
    p.querySelectorAll("[data-f]").forEach((b) => (b.onclick = () => { E.filtre = b.dataset.f; E.reglages = { ...R0, ...FILTRES[b.dataset.f].r }; traiter(false); memoriser(); p.querySelectorAll("[data-f]").forEach((x) => x.classList.toggle("actif", x === b)); }));
  }

  function panneauReglages(p) {
    p.innerHTML = "<h3>" + icon("parametres") + " Réglages</h3>" + REGLAGES.map(([g, items]) => '<div class="groupe-titre">' + g + "</div>" + items.map(([k, l, min, max]) => slider(k, l, E.reglages[k], min != null ? min : -100, max != null ? max : 100)).join("")).join("") +
      '<button class="btn petit mt" id="rg-reset">' + icon("annuler") + " Tout réinitialiser</button>";
    brancherSliders(p, (k, v, rapide) => {
      E.reglages[k] = v; E.filtre = "";
      if (["douceur", "vignette", "grain"].includes(k)) dessinerApercu(); else traiter(rapide);
    });
    p.querySelector("#rg-reset").onclick = () => { E.reglages = { ...R0 }; E.filtre = "original"; traiter(false); memoriser(); majPanneau(); };
  }

  function panneauFond(p) {
    const detoure = E.mode === "detoure" && E.sujet;
    p.innerHTML = "<h3>" + icon("calque") + " Fond & mise en scène</h3>" +
      (E.src && !detoure ? '<div class="alerte-ligne info">' + icon("info") + "<span>Le fond s'affiche derrière un sujet détouré (outil Photo → Détourer) ou quand il n'y a pas de photo.</span></div>" : "") +
      '<div class="fonds">' + Object.entries(ST.FONDS).map(([k, v]) => '<button class="fond-choix ' + (E.fond === k ? "actif" : "") + '" data-fond="' + k + '" title="' + esc(v.nom) + '" style="background:' + v.css + '"></button>').join("") +
      '<button class="fond-choix ' + (E.fond === "uni" ? "actif" : "") + '" data-fond="uni" title="Couleur unie" style="background:' + E.fondCouleur + '"></button>' +
      (E.src ? '<button class="fond-choix ' + (E.fond === "maphoto" ? "actif" : "") + '" data-fond="maphoto" title="Ma photo floutée (effet portrait)" style="background:var(--bleu-ciel);font-size:.62rem;color:var(--bleu-fonce)">Effet<br>portrait</button>' : "") +
      '<button class="fond-choix ' + (E.fond === "image" ? "actif" : "") + '" data-fond="image" title="Importer un décor" style="background:#fff;font-size:.62rem;color:var(--texte-doux)">＋ Mon<br>décor</button></div>' +
      '<div class="row-flex mt"><span class="doux" style="font-size:.85rem">Couleur unie</span><input type="color" id="fd-couleur" value="' + E.fondCouleur + '" style="width:60px"></div>' +
      (E.fond === "maphoto" || E.fond === "image" ? slider("flouFond", "Flou du décor", E.flouFond, 0, 60) : "") +
      (detoure ? '<div class="groupe-titre mt">Réalisme</div>' + slider("ombre", "Ombre au sol", E.ombre, 0, 100) + '<label class="check mt"><input type="checkbox" id="fd-reflet"' + (E.reflet ? " checked" : "") + "> Reflet sur surface brillante</label>" : "") +
      '<div class="groupe-titre mt">Lisibilité & finition</div>' + slider("voile", "Voile sombre (bas)", E.voile, 0, 100) +
      '<label class="check mt"><input type="checkbox" id="fd-cadre"' + (E.cadre ? " checked" : "") + "> Cadre fin nacré</label>";
    p.querySelectorAll("[data-fond]").forEach((b) => (b.onclick = () => {
      if (b.dataset.fond === "image" && !E.fondImg) { root.querySelector("#st-file-fond").click(); return; }
      if (b.dataset.fond === "image" && E.fond === "image") { root.querySelector("#st-file-fond").click(); return; }
      E.fond = b.dataset.fond; E.fondManuel = true; cacheFlou = {}; memoriser(); majPanneau(); dessinerApercu();
    }));
    p.querySelector("#fd-couleur").oninput = (e) => { E.fondCouleur = e.target.value; E.fond = "uni"; dessinerApercu(); };
    p.querySelector("#fd-couleur").onchange = () => { memoriser(); majPanneau(); };
    brancherSliders(p, (k, v) => { E[k] = v; if (k === "flouFond") cacheFlou = {}; dessinerApercu(); });
    const rf = p.querySelector("#fd-reflet"); if (rf) rf.onchange = (e) => { E.reflet = e.target.checked; memoriser(); dessinerApercu(); };
    p.querySelector("#fd-cadre").onchange = (e) => { E.cadre = e.target.checked; memoriser(); dessinerApercu(); };
  }

  function panneauTextes(p) {
    const sel = E.calques.find((c) => c.id === E.sel);
    const F = FORMATS[E.format];
    const nomC = (c) => (c.type === "logo" ? "Logo" : c.type === "pastille" ? "Pastille · " + c.texte : c.texte.split("\n")[0]);
    let h = "<h3>" + icon("texte") + ' Textes & éléments</h3><div class="row-flex" style="gap:6px">' +
      '<button class="btn petit" data-add="titre">＋ Titre</button><button class="btn petit" data-add="texte">＋ Texte</button><button class="btn petit" data-add="badge">＋ Badge</button><button class="btn petit" data-add="pastille">＋ Prix</button><button class="btn petit" data-add="logo">＋ Logo</button></div>';
    if (E.calques.length) h += '<div class="groupe-titre mt">Calques</div><div class="calques">' + E.calques.slice().reverse().map((c) => '<div class="calque ' + (c.id === E.sel ? "actif" : "") + '" data-c="' + c.id + '">' + icon(c.type === "logo" ? "etoile" : c.type === "pastille" ? "euro" : "texte") + '<span class="nomc">' + esc(nomC(c)) + "</span></div>").join("") + "</div>";
    if (sel) {
      h += '<div class="separateur"></div>';
      if (sel.type !== "logo") h += ui.champ(sel.type === "pastille" ? "Texte (2e ligne optionnelle)" : "Texte", "", sel.texte, { type: "textarea", attrs: ' id="tx-texte" rows="2" style="min-height:60px"' });
      if (sel.type === "texte") h += '<div class="g2 grid mt" style="gap:8px">' + ui.champ("Police", "", sel.police, { type: "select", options: POLICES, attrs: ' id="tx-police"' }) + ui.champ("Graisse", "", sel.poids, { type: "select", options: [["300", "Fine"], ["400", "Normale"], ["500", "Moyenne"], ["600", "Semi-grasse"], ["700", "Grasse"], ["800", "Extra"]], attrs: ' id="tx-poids"' }) + "</div>";
      h += '<div class="groupe-titre mt">Couleur</div><div class="row-flex" style="gap:6px">' + COULEURS.map((c) => '<button class="fond-choix" style="width:30px;aspect-ratio:1;border-radius:50%;background:' + c + '" data-coul="' + c + '"></button>').join("") + '<input type="color" id="tx-coul" value="' + sel.couleur + '" style="width:44px;height:34px;min-height:0"></div>';
      if (sel.type !== "logo") h += '<div class="groupe-titre mt">Fond du texte</div><div class="row-flex" style="gap:6px"><button class="btn petit" data-fondt="">Aucun</button>' + ["#ffffff", "#2b3743", "#355f7d", "#25d366", "#d9bf98", "#f3dcd4"].map((c) => '<button class="fond-choix" style="width:30px;aspect-ratio:1;border-radius:8px;background:' + c + '" data-fondt="' + c + '"></button>').join("") + "</div>";
      h += '<div class="groupe-titre mt">Mise en forme</div>' + slider("taille", "Taille", Math.round(sel.taille), 10, Math.round(F.w * 0.35)) + (sel.type === "texte" ? slider("espacement", "Espacement", sel.espacement, 0, 30) : "") + slider("opacite", "Opacité", sel.opacite, 0.1, 1, 0.05) + slider("rotation", "Rotation", sel.rotation, -45, 45);
      if (sel.type === "texte") h += '<div class="row-flex mt" style="gap:6px"><button class="btn petit ' + (sel.italique ? "sable" : "") + '" id="tx-ital"><i>Italique</i></button><button class="btn petit ' + (sel.majuscules ? "sable" : "") + '" id="tx-maj">MAJ</button><button class="btn petit ' + (sel.ombre ? "sable" : "") + '" id="tx-ombre">Ombre</button><div class="segmented" id="tx-align" style="flex:1"><button data-a="left" class="' + (sel.align === "left" ? "actif" : "") + '">Gauche</button><button data-a="center" class="' + (sel.align === "center" ? "actif" : "") + '">Centre</button><button data-a="right" class="' + (sel.align === "right" ? "actif" : "") + '">Droite</button></div></div>';
      h += '<div class="row-flex mt" style="gap:6px"><button class="btn petit" id="tx-centrer">Centrer</button><button class="btn petit" id="tx-haut">' + icon("haut") + ' Devant</button><button class="btn petit" id="tx-bas">' + icon("bas") + ' Derrière</button><button class="btn petit" id="tx-dup">' + icon("copier") + ' Dupliquer</button><button class="btn petit danger" id="tx-suppr">' + icon("poubelle") + "</button></div>";
    } else if (E.calques.length) h += '<p class="aide mt">Touchez un élément sur l\'image (ou dans la liste) pour le modifier.</p>';
    p.innerHTML = h;
    const maj = () => { dessinerApercu(); };
    p.querySelectorAll("[data-add]").forEach((b) => (b.onclick = () => {
      const t = b.dataset.add; let c;
      const coul = E.src && E.mode !== "detoure" ? "#ffffff" : "#2b3743";
      if (t === "titre") c = nouveauCalque("texte", { texte: "Votre titre", taille: F.w * 0.09, couleur: coul, ombre: coul === "#ffffff" });
      else if (t === "texte") c = nouveauCalque("texte", { texte: "Votre texte", police: "Jost", poids: "400", taille: F.w * 0.04, couleur: coul, ombre: coul === "#ffffff" });
      else if (t === "badge") c = nouveauCalque("texte", { texte: "Nouveauté", police: "Jost", poids: "500", majuscules: true, espacement: 5, taille: F.w * 0.028, fond: "#ffffff", couleur: "#355f7d", ombre: true });
      else if (t === "pastille") { const pr = produitCourant(); c = nouveauCalque("pastille", { texte: pr ? f.euro(pr.prix).replace(/,00/, "") : "9 €", taille: F.w * 0.07, couleur: "#ffffff", fond: "#355f7d", x: F.w * 0.82, y: F.h * 0.18 }); }
      else c = nouveauCalque("logo", { taille: 64, couleur: coul, accent: coul === "#ffffff" ? "#f3e6d1" : "#b08d5b", y: F.h * 0.1 });
      E.calques.push(c); E.sel = c.id; memoriser(); majPanneau(); dessinerApercu();
    }));
    p.querySelectorAll("[data-c]").forEach((r) => (r.onclick = () => { E.sel = r.dataset.c; majPanneau(); dessinerApercu(); }));
    if (!sel) return;
    const tt = p.querySelector("#tx-texte"); if (tt) { tt.oninput = () => { sel.texte = tt.value; maj(); }; tt.onchange = memoriser; }
    const po = p.querySelector("#tx-police"); if (po) po.onchange = () => { sel.police = po.value; if (po.value === "Great Vibes") sel.poids = "400"; ST.policesPretes().then(maj); memoriser(); };
    const pd = p.querySelector("#tx-poids"); if (pd) pd.onchange = () => { sel.poids = pd.value; maj(); memoriser(); };
    p.querySelectorAll("[data-coul]").forEach((b) => (b.onclick = () => { sel.couleur = b.dataset.coul; if (sel.type === "logo") sel.accent = b.dataset.coul === "#ffffff" ? "#f3e6d1" : b.dataset.coul === "#2b3743" ? "#b08d5b" : b.dataset.coul; p.querySelector("#tx-coul").value = sel.couleur; maj(); memoriser(); }));
    p.querySelector("#tx-coul").oninput = (e) => { sel.couleur = e.target.value; if (sel.type === "logo") sel.accent = e.target.value; maj(); };
    p.querySelector("#tx-coul").onchange = memoriser;
    p.querySelectorAll("[data-fondt]").forEach((b) => (b.onclick = () => { if (sel.type === "pastille") sel.fond = b.dataset.fondt || "#355f7d"; else sel.fond = b.dataset.fondt; maj(); memoriser(); }));
    brancherSliders(p, (k, v) => { sel[k] = v; maj(); });
    const tog = (id, k) => { const b = p.querySelector(id); if (b) b.onclick = () => { sel[k] = !sel[k]; memoriser(); majPanneau(); maj(); }; };
    tog("#tx-ital", "italique"); tog("#tx-maj", "majuscules"); tog("#tx-ombre", "ombre");
    const al = p.querySelector("#tx-align"); if (al) al.onclick = (e) => { const b = e.target.closest("[data-a]"); if (b) { sel.align = b.dataset.a; memoriser(); majPanneau(); maj(); } };
    p.querySelector("#tx-centrer").onclick = () => { sel.x = F.w / 2; memoriser(); maj(); };
    const i = () => E.calques.indexOf(sel);
    p.querySelector("#tx-haut").onclick = () => { const n = i(); if (n < E.calques.length - 1) { E.calques.splice(n, 1); E.calques.splice(n + 1, 0, sel); memoriser(); majPanneau(); maj(); } };
    p.querySelector("#tx-bas").onclick = () => { const n = i(); if (n > 0) { E.calques.splice(n, 1); E.calques.splice(n - 1, 0, sel); memoriser(); majPanneau(); maj(); } };
    p.querySelector("#tx-dup").onclick = () => { const { _bb, ...c } = sel; const d = { ...JSON.parse(JSON.stringify(c)), id: LBE.util.uid(), x: sel.x + 30, y: sel.y + 30 }; E.calques.push(d); E.sel = d.id; memoriser(); majPanneau(); maj(); };
    p.querySelector("#tx-suppr").onclick = () => { E.calques = E.calques.filter((c) => c !== sel); E.sel = null; memoriser(); majPanneau(); maj(); };
  }

  function panneauModeles(p) {
    const prods = q.produitsActifs();
    p.innerHTML = "<h3>" + icon("catalogue") + " Modèles de publications</h3>" +
      ui.champ("Produit mis en avant", "", E.produitId, { type: "select", options: [["", "— Aucun —"]].concat(prods.map((x) => [x.id, x.nom])), attrs: ' id="md-prod"' }) +
      '<div class="modeles-grid mt">' + modeles().map((m) => '<button class="modele-btn" data-m="' + m.id + '"><b>' + esc(m.nom) + "</b><span>" + esc(m.desc) + "</span></button>").join("") + "</div>" +
      '<p class="aide mt">Le modèle remplace les textes actuels. Vous pouvez ensuite tout modifier, déplacer, recolorer.</p>' +
      '<div class="alerte-ligne info mt">' + icon("info") + "<span><b>Astuce réalisme</b> : photographiez vos bayas à la lumière du jour près d'une fenêtre, sur un fond uni, puis Détourer → fond « Plage » ou « Studio blanc » + ombre au sol + filtre « Lumière du matin ».</span></div>";
    p.querySelector("#md-prod").onchange = (e) => { E.produitId = e.target.value; const pr = produitCourant(); if (pr) E.nomFichier = pr.nom; majPanneau(); };
    p.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => appliquerModele(modeles().find((m) => m.id === b.dataset.m))));
  }

  function panneauExport(p) {
    const pr = produitCourant();
    p.innerHTML = "<h3>" + icon("telecharger") + " Exporter</h3>" +
      ui.champ("Nom du fichier", "", E.nomFichier, { attrs: ' id="ex-nom"' }) +
      '<div class="segmented mt" id="ex-type"><button data-t="image/jpeg" class="actif">JPEG (léger)</button><button data-t="image/png">PNG (qualité max)</button></div>' +
      '<p class="aide">Format ' + esc(FORMATS[E.format].nom) + " · " + FORMATS[E.format].w + " × " + FORMATS[E.format].h + " px, idéal pour Instagram et TikTok.</p>" +
      '<div class="stack" style="gap:8px"><button class="btn primaire" id="ex-dl">' + icon("telecharger") + ' Télécharger</button><button class="btn" id="ex-share">' + icon("partager") + ' Partager (Instagram, WhatsApp…)</button><button class="btn" id="ex-gal">' + icon("image") + " Enregistrer dans « Mes créations »</button>" +
      (pr ? '<button class="btn sable" id="ex-prod">' + icon("catalogue") + " Utiliser comme photo de « " + esc(pr.nom) + " »</button>" : "") + "</div>";
    let type = "image/jpeg";
    p.querySelector("#ex-type").onclick = (e) => { const b = e.target.closest("[data-t]"); if (!b) return; type = b.dataset.t; p.querySelectorAll("#ex-type button").forEach((x) => x.classList.toggle("actif", x === b)); };
    p.querySelector("#ex-nom").oninput = (e) => (E.nomFichier = e.target.value);
    const ext = () => (type === "image/png" ? ".png" : ".jpg");
    const avec = async (btn, fn) => { btn.disabled = true; const t = btn.innerHTML; btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Création…'; try { await ST.policesPretes(); await fn(await rendreFinal(type)); } catch (e) { console.error(e); ui.toast(e.name === "SecurityError" ? "Photo protégée par son site d'origine : importez-la depuis votre appareil." : "Export impossible : " + e.message, true); } btn.disabled = false; btn.innerHTML = t; };
    p.querySelector("#ex-dl").onclick = (e) => avec(e.currentTarget, (b) => { ST.telecharger(b, nomExport(ext())); ui.toast("Visuel téléchargé ✓"); });
    p.querySelector("#ex-share").onclick = (e) => avec(e.currentTarget, (b) => ST.partager(b, nomExport(ext())));
    p.querySelector("#ex-gal").onclick = (e) => avec(e.currentTarget, async (b) => { await ST.galerie.ajouter(b, E.nomFichier || "Visuel", "image"); ui.toast("Ajouté à « Mes créations » ✓"); });
    const bp = p.querySelector("#ex-prod");
    if (bp) bp.onclick = (e) => avec(e.currentTarget, async () => {
      // Miniature légère (carrée, 640 px) stockée dans la fiche produit
      const F = FORMATS[E.format]; const full = ST.canvas(F.w, F.h); dessiner(full.getContext("2d"), F.w, F.h, {});
      const c = ST.canvas(640, 640); const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, 640, 640); couvrir(x, full, 640, 640);
      pr.photo = c.toDataURL("image/jpeg", 0.82); LBE.store.sauver(); ui.toast("Photo du produit mise à jour ✓");
    });
  }

  ST.photo = { rendre, FORMATS };
})();
