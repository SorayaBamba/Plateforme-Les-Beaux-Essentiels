/* =========================================================
   Module 9 — Studio créatif : structure commune, galerie,
   outils graphiques partagés (flou, logo, polices, export)
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon } = LBE;
  const ST = (LBE.studio = LBE.studio || {});

  /* ---------- Outils graphiques ---------- */
  ST.canvas = (w, h) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };

  // Flou rapide et compatible avec tous les navigateurs (dont Safari iPhone) :
  // réductions successives puis agrandissement lissé.
  ST.flou = (src, rayon) => {
    const w = src.width, h = src.height;
    if (rayon <= 0) return src;
    let facteur = Math.max(1, Math.min(64, rayon / 1.6));
    let cur = src, cw = w, ch = h;
    const etapes = [];
    while (facteur > 1.01) {
      const f2 = Math.min(2, facteur);
      cw = Math.max(1, cw / f2); ch = Math.max(1, ch / f2);
      const c = ST.canvas(cw, ch); const x = c.getContext("2d");
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, c.width, c.height);
      etapes.push(c); cur = c; facteur /= f2;
    }
    for (let i = etapes.length - 2; i >= -1; i--) {
      const cible = i >= 0 ? ST.canvas(etapes[i].width, etapes[i].height) : ST.canvas(w, h);
      const x = cible.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(cur, 0, 0, cible.width, cible.height); cur = cible;
    }
    return cur;
  };

  // Logo typographique « les / BEAUX / ESSENTIELS »
  ST.dessinerLogo = (ctx, cx, cy, taille, couleur, accent) => {
    ctx.save();
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = couleur;
    const t = taille;
    ctx.font = "600 " + t + 'px "Cormorant Garamond", Georgia, serif';
    const debut = cx - ST.largeurEspace(ctx, "BEAUX", t * 0.14) / 2;
    ctx.font = "italic 500 " + t * 0.42 + 'px "Cormorant Garamond", Georgia, serif';
    ctx.fillStyle = accent || couleur;
    ctx.textAlign = "left";
    ctx.fillText("les", debut + t * 0.02, cy - t * 0.5);
    ctx.textAlign = "center";
    ctx.fillStyle = couleur;
    ctx.font = "600 " + t + 'px "Cormorant Garamond", Georgia, serif';
    ST.texteEspace(ctx, "BEAUX", cx, cy + t * 0.28, t * 0.14);
    ctx.font = "500 " + t * 0.24 + 'px "Jost", Arial, sans-serif';
    ctx.fillStyle = accent || couleur;
    ST.texteEspace(ctx, "ESSENTIELS", cx, cy + t * 0.7, t * 0.24 * 0.5);
    ctx.restore();
    return { x: cx - t * 1.6, y: cy - t * 0.85, w: t * 3.2, h: t * 1.65 };
  };
  // Texte avec espacement des lettres, centré / aligné (compatible tous navigateurs)
  ST.texteEspace = (ctx, txt, x, y, esp, align) => {
    align = align || ctx.textAlign || "center";
    if (!esp) { ctx.textAlign = align; ctx.fillText(txt, x, y); return ctx.measureText(txt).width; }
    const chars = [...txt];
    const larg = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + esp * (chars.length - 1);
    let px = align === "center" ? x - larg / 2 : align === "right" ? x - larg : x;
    const old = ctx.textAlign; ctx.textAlign = "left";
    for (const c of chars) { ctx.fillText(c, px, y); px += ctx.measureText(c).width + esp; }
    ctx.textAlign = old;
    return larg;
  };
  ST.largeurEspace = (ctx, txt, esp) => { const chars = [...txt]; return chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + (esp || 0) * Math.max(0, chars.length - 1); };
  ST.roundRect = (ctx, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  ST.policesPretes = () => (document.fonts && document.fonts.load ? Promise.all(['600 40px "Cormorant Garamond"', 'italic 500 40px "Cormorant Garamond"', '500 40px "Jost"', '400 40px "Jost"', '500 40px "Playfair Display"', '400 40px "Great Vibes"', '600 40px "Montserrat"', '800 40px "Montserrat"']
    .map((fo) => document.fonts.load(fo).catch(() => {}))).catch(() => {}) : Promise.resolve());

  // Fonds « Aube sur la plage »
  ST.FONDS = {
    nacre: { nom: "Nacre", css: "linear-gradient(135deg,#fffaf6,#f3e4dc 40%,#e5eef5 75%,#f7ede2)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#fffaf6"], [0.4, "#f3e4dc"], [0.75, "#e5eef5"], [1, "#f7ede2"]], 135); halo(x, W * 0.25, H * 0.2, W * 0.6, "rgba(255,255,255,.75)"); halo(x, W * 0.85, H * 0.75, W * 0.55, "rgba(220,233,241,.7)"); } },
    aube: { nom: "Aube", css: "linear-gradient(180deg,#f6d9cf,#f8eee6 45%,#dbe8f1)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#f3cfc3"], [0.45, "#f9efe8"], [1, "#d6e5ef"]], 180); halo(x, W * 0.5, H * 0.32, W * 0.5, "rgba(255,236,214,.85)"); } },
    lagon: { nom: "Lagon", css: "linear-gradient(160deg,#e9f3f8,#b7d3e3 60%,#8db3ca)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#eef6fa"], [0.6, "#b9d4e4"], [1, "#89b0c8"]], 160); halo(x, W * 0.3, H * 0.25, W * 0.6, "rgba(255,255,255,.6)"); } },
    sable: { nom: "Sable", css: "linear-gradient(170deg,#fbf5ec,#ecd9bb 65%,#d8bd94)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#fdf8f1"], [0.65, "#ecdabd"], [1, "#d6bb92"]], 170); halo(x, W * 0.7, H * 0.25, W * 0.6, "rgba(255,250,240,.8)"); } },
    plage: { nom: "Plage", css: "linear-gradient(180deg,#f7e3da 0%,#e6eff5 45%,#9fc2d6 58%,#ecdcc2 60%,#dcc29b)", dessin: (x, W, H) => {
      degrade(x, W, H * 0.6, [[0, "#f6ddd2"], [0.7, "#eef3f6"], [1, "#cfe1ec"]], 180);
      const g = x.createLinearGradient(0, H * 0.55, 0, H * 0.66); g.addColorStop(0, "#a9c8da"); g.addColorStop(1, "#7fa9c2"); x.fillStyle = g; x.fillRect(0, H * 0.55, W, H * 0.11);
      const s = x.createLinearGradient(0, H * 0.64, 0, H); s.addColorStop(0, "#efe2cb"); s.addColorStop(1, "#d7bd95"); x.fillStyle = s;
      x.beginPath(); x.moveTo(0, H * 0.66); x.bezierCurveTo(W * 0.3, H * 0.63, W * 0.65, H * 0.69, W, H * 0.65); x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
      halo(x, W * 0.5, H * 0.5, W * 0.35, "rgba(255,240,225,.8)");
    } },
    studio: { nom: "Studio blanc", css: "linear-gradient(180deg,#ffffff,#f1ece6)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#ffffff"], [0.62, "#f6f2ee"], [1, "#e9e2da"]], 180); halo(x, W * 0.5, H * 0.45, W * 0.7, "rgba(255,255,255,.9)"); } },
    rose: { nom: "Rose poudré", css: "linear-gradient(160deg,#fbefeb,#efcfc6)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#fcf2ef"], [1, "#eccbc1"]], 160); halo(x, W * 0.35, H * 0.3, W * 0.55, "rgba(255,255,255,.7)"); } },
    nuit: { nom: "Nuit dorée", css: "linear-gradient(160deg,#2b3743,#1d2630 70%,#3a3226)", dessin: (x, W, H) => { degrade(x, W, H, [[0, "#334252"], [0.7, "#1c242d"], [1, "#3b3125"]], 160); halo(x, W * 0.5, H * 0.4, W * 0.55, "rgba(201,169,122,.28)"); } },
  };
  function degrade(x, W, H, stops, angle) {
    const a = (angle - 90) * Math.PI / 180, cx = W / 2, cy = H / 2, r = Math.abs(W * Math.cos(a)) / 2 + Math.abs(H * Math.sin(a)) / 2;
    const g = x.createLinearGradient(cx - Math.cos(a) * r, cy - Math.sin(a) * r, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  function halo(x, cx, cy, r, c) { const g = x.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, c); g.addColorStop(1, c.replace(/[\d.]+\)$/, "0)")); x.fillStyle = g; x.fillRect(0, 0, x.canvas.width, x.canvas.height); }
  ST.degrade = degrade; ST.halo = halo;

  /* ---------- Galerie (IndexedDB : supporte les fichiers lourds) ---------- */
  let dbp;
  function db() {
    if (!dbp) dbp = new Promise((ok, ko) => {
      if (!window.indexedDB) return ko(new Error("Stockage indisponible"));
      const r = indexedDB.open("lbe-studio", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("creations", { keyPath: "id" });
      r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error);
    });
    return dbp;
  }
  const tx = async (mode, fn) => { const d = await db(); return new Promise((ok, ko) => { const t = d.transaction("creations", mode); const s = t.objectStore("creations"); const r = fn(s); t.oncomplete = () => ok(r && r.result); t.onerror = () => ko(t.error); }); };
  ST.galerie = {
    ajouter: (blob, nom, type) => tx("readwrite", (s) => s.put({ id: LBE.util.uid(), date: new Date().toISOString(), nom, type, blob })),
    lister: () => tx("readonly", (s) => s.getAll()).then((l) => (l || []).sort((a, b) => (a.date < b.date ? 1 : -1))),
    supprimer: (id) => tx("readwrite", (s) => s.delete(id)),
  };

  ST.telecharger = (blob, nom) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  ST.partager = async (blob, nom) => {
    const file = new File([blob], nom, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: "Les Beaux Essentiels" }); return true; } catch (e) { if (e.name === "AbortError") return true; }
    }
    ST.telecharger(blob, nom); ui.toast("Partage direct indisponible ici : le fichier a été téléchargé.");
    return false;
  };

  /* ---------- Module ---------- */
  function rendre(el, params) {
    const onglet = params[0] || "photo";
    el.innerHTML = ui.entete("Module 9", "Studio créatif", "") +
      ui.tabs("studio", [["photo", "📸 Studio photo"], ["video", "🎬 Studio vidéo"], ["galerie", "Mes créations"]], onglet) + '<div id="studio-zone"></div>';
    const z = el.querySelector("#studio-zone");
    if (onglet === "video") ST.video ? ST.video.rendre(z, params.slice(1)) : (z.innerHTML = ui.vide("Chargement…"));
    else if (onglet === "galerie") rendreGalerie(z);
    else ST.photo ? ST.photo.rendre(z, params.slice(1)) : (z.innerHTML = ui.vide("Chargement…"));
  }

  async function rendreGalerie(el) {
    el.innerHTML = '<div class="card">' + ui.vide("Chargement de vos créations…") + "</div>";
    let items = [];
    try { items = await ST.galerie.lister(); } catch (e) { el.innerHTML = '<div class="card">' + ui.vide("La galerie n'est pas disponible dans ce navigateur (mode privé ?).") + "</div>"; return; }
    const urls = [];
    el.innerHTML = '<p class="doux">Vos visuels et vidéos enregistrés dans ce navigateur. Ils ne sont pas inclus dans la sauvegarde JSON : téléchargez ceux que vous voulez garder.</p>' +
      (items.length ? '<div class="galerie">' + items.map((it) => { const u = URL.createObjectURL(it.blob); urls.push(u); return '<div class="card item">' + (it.type === "video" ? '<video src="' + u + '" muted playsinline loop controls preload="metadata"></video>' : '<img src="' + u + '" alt="">') + '<div style="font-size:.8rem" class="doux">' + esc(it.nom || "") + "<br>" + new Date(it.date).toLocaleDateString("fr-FR") + '</div><div class="row-flex" style="gap:4px"><button class="btn petit" data-dl="' + it.id + '">' + icon("telecharger") + '</button><button class="btn petit" data-sh="' + it.id + '">' + icon("partager") + '</button><button class="btn petit fantome" data-del="' + it.id + '">' + icon("poubelle") + "</button></div></div>"; }).join("") + "</div>"
        : '<div class="card">' + ui.vide("Aucune création enregistrée pour l'instant.", '<a class="btn primaire" href="#/studio/photo">Créer un visuel</a>') + "</div>");
    LBE.modules._quitter = () => urls.forEach((u) => URL.revokeObjectURL(u));
    const trouve = (id) => items.find((x) => x.id === id);
    const ext = (it) => (it.type === "video" ? (it.blob.type.includes("mp4") ? ".mp4" : ".webm") : it.blob.type.includes("png") ? ".png" : ".jpg");
    el.querySelectorAll("[data-dl]").forEach((b) => (b.onclick = () => { const it = trouve(b.dataset.dl); ST.telecharger(it.blob, (it.nom || "creation").replace(/[^\w-]+/g, "-") + ext(it)); }));
    el.querySelectorAll("[data-sh]").forEach((b) => (b.onclick = () => { const it = trouve(b.dataset.sh); ST.partager(it.blob, (it.nom || "creation").replace(/[^\w-]+/g, "-") + ext(it)); }));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => ui.confirmer("Supprimer cette création ?", async () => { await ST.galerie.supprimer(b.dataset.del); rendreGalerie(el); })));
  }

  LBE.modules.studio = { rendre };
})();
