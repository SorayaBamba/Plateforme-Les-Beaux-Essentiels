/* =========================================================
   Studio VIDÉO : montage vertical 9:16 pour TikTok / Reels
   photos + clips, textes animés, transitions, intro/fin de marque,
   filtres, musique, export vidéo dans le navigateur
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, esc, icon } = LBE;
  const ST = LBE.studio;

  const QUALITES = { standard: { nom: "Standard 720p (rapide)", w: 720, h: 1280, debit: 6e6 }, hd: { nom: "HD 1080p", w: 1080, h: 1920, debit: 10e6 } };
  const FILTRES = { aucun: "Aucun", nacre: "Nacre", matin: "Lumière du matin", lagon: "Lagon", sable: "Sable doré", couchant: "Coucher de soleil", nb: "Noir & blanc" };
  const ANIMS = [["zoom", "Zoom lent"], ["glisse", "Glissement"], ["fondu", "Fixe"]];

  const V = {
    clips: [],
    intro: { actif: true, titre: "Nouvelle collection", sous: "Beauté · Senteurs · Accessoires" },
    outro: { actif: true, titre: "Commandez sur WhatsApp", sous: "Lien en bio ✨" },
    musique: null, volume: 0.8,
    filtre: "nacre", logo: true, police: "Cormorant Garamond", couleur: "#ffffff", transition: 0.5, qualite: "standard",
    t: 0, lecture: false, enregistrement: false,
  };
  let canvas, ctx, root, raf = 0, t0 = 0, audioCtx = null, gainNode = null, destNode = null;

  /* ---------- Timeline ---------- */
  const DUREE_INTRO = 2.6, DUREE_OUTRO = 3;
  function segments() {
    const s = []; let t = 0;
    if (V.intro.actif) { s.push({ type: "intro", duree: DUREE_INTRO, t0: t }); t += DUREE_INTRO; }
    for (const c of V.clips) { const d = c.type === "video" ? Math.max(0.5, c.fin - c.debut) : Math.max(0.5, Number(c.duree) || 3); s.push({ type: "clip", clip: c, duree: d, t0: t }); t += d; }
    if (V.outro.actif) { s.push({ type: "outro", duree: DUREE_OUTRO, t0: t }); t += DUREE_OUTRO; }
    return s;
  }
  const dureeTotale = () => segments().reduce((m, s) => Math.max(m, s.t0 + s.duree), 0);
  const fmt = (s) => Math.floor(s / 60) + ":" + String(Math.floor(s % 60)).padStart(2, "0");

  /* ---------- Dessin d'une image de la vidéo ---------- */
  function couvrir(x, el, W, H, echelle, dx) {
    const iw = el.videoWidth || el.naturalWidth || el.width, ih = el.videoHeight || el.naturalHeight || el.height;
    if (!iw || !ih) return;
    const s = Math.max(W / iw, H / ih) * (echelle || 1);
    x.drawImage(el, (W - iw * s) / 2 + (dx || 0), (H - ih * s) / 2, iw * s, ih * s);
  }
  function texteAnime(x, txt, W, H, local, y, taille, couleur, police, poids, italique) {
    if (!txt) return;
    const a = Math.min(1, Math.max(0, (local - 0.15) / 0.6));
    const e = 1 - Math.pow(1 - a, 3);
    x.save();
    x.globalAlpha *= e;
    x.fillStyle = couleur; x.textAlign = "center"; x.textBaseline = "middle";
    x.font = (italique ? "italic " : "") + (poids || "600") + " " + taille + 'px "' + police + '", Georgia, serif';
    x.shadowColor = couleur === "#ffffff" ? "rgba(0,0,0,.45)" : "rgba(255,255,255,.35)"; x.shadowBlur = taille * 0.25;
    const lignes = String(txt).split("\n");
    lignes.forEach((l, i) => x.fillText(l, W / 2, y + (1 - e) * taille * 0.6 + (i - (lignes.length - 1) / 2) * taille * 1.15));
    x.restore();
  }
  function appliquerFiltre(x, W, H) {
    const F = V.filtre;
    if (F === "aucun") return;
    x.save();
    if (F === "nb") { x.globalCompositeOperation = "saturation"; x.fillStyle = "#808080"; x.fillRect(0, 0, W, H); x.globalCompositeOperation = "soft-light"; x.fillStyle = "rgba(255,255,255,.12)"; x.fillRect(0, 0, W, H); }
    else {
      const teinte = { nacre: "rgba(255,226,220,.32)", matin: "rgba(255,214,170,.3)", lagon: "rgba(110,170,205,.32)", sable: "rgba(232,190,128,.34)", couchant: "rgba(255,132,90,.34)" }[F];
      x.globalCompositeOperation = "soft-light"; x.fillStyle = teinte; x.fillRect(0, 0, W, H);
      if (F === "nacre" || F === "matin") {
        x.globalCompositeOperation = "screen"; x.globalAlpha = F === "matin" ? 0.3 : 0.22;
        x.drawImage(ST.flou(x.canvas, W / 40), 0, 0, W, H);
      }
    }
    x.restore();
    if (F === "couchant" || F === "matin" || F === "nb") {
      const r = Math.hypot(W, H) / 2; const g = x.createRadialGradient(W / 2, H / 2, r * 0.5, W / 2, H / 2, r);
      g.addColorStop(0, "rgba(20,15,10,0)"); g.addColorStop(1, "rgba(20,15,10," + (F === "matin" ? 0.25 : 0.45) + ")"); x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
  }
  function dessinerSegment(x, seg, local, W, H) {
    const k = W / 720;
    if (seg.type === "intro" || seg.type === "outro") {
      ST.FONDS[seg.type === "intro" ? "aube" : "nacre"].dessin(x, W, H);
      // lueur qui respire
      const pulse = 0.5 + 0.5 * Math.sin(local * 2);
      ST.halo(x, W / 2, H * 0.45, W * (0.55 + 0.1 * pulse), "rgba(255,255,255,.55)");
      const a = Math.min(1, local / 0.8);
      x.save(); x.globalAlpha = a;
      ST.dessinerLogo(x, W / 2, H * (seg.type === "intro" ? 0.4 : 0.3) - (1 - a) * 20 * k, 92 * k, "#2b3743", "#b08d5b");
      x.restore();
      const d = seg.type === "intro" ? V.intro : V.outro;
      texteAnime(x, d.titre, W, H, local - 0.4, H * (seg.type === "intro" ? 0.6 : 0.5), 58 * k, "#2b3743", V.police, "600", seg.type === "intro");
      texteAnime(x, d.sous, W, H, local - 0.8, H * (seg.type === "intro" ? 0.67 : 0.58), 26 * k, "#b08d5b", "Jost", "500");
      if (seg.type === "outro") {
        const a2 = Math.min(1, Math.max(0, (local - 1.1) / 0.5));
        x.save(); x.globalAlpha = a2; x.fillStyle = "#25d366";
        const bw = 330 * k, bh = 74 * k; ST.roundRect(x, W / 2 - bw / 2, H * 0.68 - bh / 2, bw, bh, bh / 2); x.fill();
        x.fillStyle = "#fff"; x.font = "600 " + 26 * k + 'px "Jost", Arial'; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("💬  WhatsApp", W / 2, H * 0.68);
        x.restore();
      }
      return;
    }
    const c = seg.clip;
    x.fillStyle = "#1d2630"; x.fillRect(0, 0, W, H);
    const p = Math.min(1, local / seg.duree);
    if (c.type === "image") {
      if (c.anim === "zoom") couvrir(x, c.el, W, H, 1.02 + 0.1 * p);
      else if (c.anim === "glisse") couvrir(x, c.el, W, H, 1.15, (0.5 - p) * W * 0.12);
      else couvrir(x, c.el, W, H, 1);
    } else couvrir(x, c.el, W, H, c.anim === "zoom" ? 1 + 0.05 * p : 1);
    appliquerFiltre(x, W, H);
    if (c.texte) {
      const gr = x.createLinearGradient(0, H * 0.55, 0, H); gr.addColorStop(0, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(0,0,0,.35)"); x.fillStyle = gr; x.fillRect(0, H * 0.55, W, H * 0.45);
      const y = c.position === "haut" ? H * 0.2 : c.position === "milieu" ? H * 0.5 : H * 0.78;
      texteAnime(x, c.texte, W, H, local, y, 56 * k, V.couleur, V.police, "600");
    }
    if (V.logo) { x.save(); x.globalAlpha = 0.9; x.shadowColor = "rgba(0,0,0,.35)"; x.shadowBlur = 10 * k; ST.dessinerLogo(x, W / 2, H * 0.075, 34 * k, "#ffffff", "#f3e6d1"); x.restore(); }
  }
  function dessinerTemps(x, t, W, H) {
    const segs = segments();
    x.save();
    if (!segs.length) { ST.FONDS.aube.dessin(x, W, H); ST.dessinerLogo(x, W / 2, H * 0.45, 80 * W / 720, "#2b3743", "#b08d5b"); x.restore(); return; }
    const i = Math.max(0, segs.findIndex((s) => t >= s.t0 && t < s.t0 + s.duree));
    const idx = t >= dureeTotale() ? segs.length - 1 : i;
    const seg = segs[idx];
    const local = Math.min(seg.duree, t - seg.t0);
    dessinerSegment(x, seg, local, W, H);
    const suivant = segs[idx + 1];
    const T = Math.min(V.transition, seg.duree / 2);
    if (suivant && T > 0 && local > seg.duree - T) {
      x.globalAlpha = (local - (seg.duree - T)) / T;
      dessinerSegment(x, suivant, 0, W, H);
    }
    x.restore();
    return { seg, suivant, local };
  }

  /* ---------- Lecture ---------- */
  function synchroniserVideos(t, enLecture) {
    const segs = segments();
    for (const s of segs) {
      if (s.type !== "clip" || s.clip.type !== "video") continue;
      const v = s.clip.el;
      const dedans = t >= s.t0 && t < s.t0 + s.duree;
      const proche = t >= s.t0 - V.transition - 0.05 && t < s.t0;
      if (dedans) {
        const cible = s.clip.debut + (t - s.t0);
        if (Math.abs(v.currentTime - cible) > 0.35) v.currentTime = cible;
        if (enLecture && v.paused) v.play().catch(() => {});
        if (!enLecture && !v.paused) v.pause();
      } else {
        if (!v.paused) v.pause();
        if (proche && Math.abs(v.currentTime - s.clip.debut) > 0.1) v.currentTime = s.clip.debut;
      }
    }
  }
  function boucle() {
    if (!V.lecture) return;
    V.t = (performance.now() - t0) / 1000;
    const total = dureeTotale();
    if (V.t >= total) { V.t = total; arreter(); if (V.onFin) { const fn = V.onFin; V.onFin = null; fn(); } return; }
    synchroniserVideos(V.t, true);
    dessinerTemps(ctx, V.t, canvas.width, canvas.height);
    if (V.musique && gainNode && V.enregistrement) { /* fondu de fin géré à la création */ }
    majLecteur();
    raf = requestAnimationFrame(boucle);
  }
  function initAudio() {
    if (!V.musique) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      if (!V.musique.noeud) {
        V.musique.noeud = audioCtx.createMediaElementSource(V.musique.el);
        gainNode = audioCtx.createGain();
        destNode = audioCtx.createMediaStreamDestination();
        V.musique.noeud.connect(gainNode); gainNode.connect(audioCtx.destination); gainNode.connect(destNode);
      }
      gainNode.gain.value = V.volume;
    } catch (e) { console.warn("Audio", e); }
  }
  function lire(depuis) {
    if (!V.clips.length && !V.intro.actif && !V.outro.actif) return;
    if (depuis >= dureeTotale() - 0.05) depuis = 0;
    V.lecture = true; V.t = depuis; t0 = performance.now() - depuis * 1000;
    if (V.musique) { initAudio(); V.musique.el.currentTime = (V.musique.debut || 0) + depuis; V.musique.el.play().catch(() => {}); }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(boucle);
    majLecteur();
  }
  function arreter() {
    V.lecture = false; cancelAnimationFrame(raf);
    V.clips.forEach((c) => c.type === "video" && c.el.pause());
    if (V.musique) V.musique.el.pause();
    majLecteur();
  }
  function allerA(t) {
    V.t = Math.max(0, Math.min(dureeTotale(), t));
    synchroniserVideos(V.t, false);
    const seg = segments().find((s) => V.t >= s.t0 && V.t < s.t0 + s.duree);
    if (seg && seg.type === "clip" && seg.clip.type === "video") { seg.clip.el.addEventListener("seeked", () => dessinerTemps(ctx, V.t, canvas.width, canvas.height), { once: true }); }
    dessinerTemps(ctx, V.t, canvas.width, canvas.height);
    majLecteur();
  }
  function majLecteur() {
    if (!root || !root.isConnected) return;
    const tot = dureeTotale();
    const s = root.querySelector("#vd-pos"), tps = root.querySelector("#vd-temps"), b = root.querySelector("#vd-play");
    if (s) { s.max = tot.toFixed(2); s.value = V.t.toFixed(2); }
    if (tps) tps.textContent = fmt(V.t) + " / " + fmt(tot);
    if (b) b.innerHTML = V.lecture ? icon("pause") : icon("lecture");
  }

  /* ---------- Export vidéo ---------- */
  function typeVideo() {
    const types = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
    return window.MediaRecorder ? types.find((t) => MediaRecorder.isTypeSupported(t)) : null;
  }
  async function creerVideo(zone) {
    const mime = typeVideo();
    if (!mime || !canvas.captureStream) { ui.toast("Votre navigateur ne permet pas l'export vidéo. Essayez Chrome ou Safari à jour.", true); return; }
    if (!V.clips.length) { ui.toast("Ajoutez au moins une photo ou une vidéo.", true); return; }
    arreter();
    const Q = QUALITES[V.qualite];
    if (canvas.width !== Q.w) { canvas.width = Q.w; canvas.height = Q.h; }
    await ST.policesPretes();
    initAudio();
    const flux = canvas.captureStream(30);
    const pistes = [...flux.getVideoTracks()];
    if (V.musique && destNode) pistes.push(...destNode.stream.getAudioTracks());
    const rec = new MediaRecorder(new MediaStream(pistes), { mimeType: mime, videoBitsPerSecond: Q.debit });
    const morceaux = [];
    rec.ondataavailable = (e) => e.data && e.data.size && morceaux.push(e.data);
    const total = dureeTotale();
    zone.innerHTML = '<div class="stack" style="gap:8px"><b>Création de la vidéo… <span id="vd-pct">0 %</span></b><div class="barre-progression" style="max-width:none"><span id="vd-bar"></span></div><p class="aide">La vidéo est enregistrée en temps réel (' + fmt(total) + "). Gardez l'écran allumé et restez sur cette page.</p></div>";
    V.enregistrement = true;
    const suivi = setInterval(() => { const p = Math.min(100, Math.round((V.t / total) * 100)); const a = zone.querySelector("#vd-pct"), b = zone.querySelector("#vd-bar"); if (a) a.textContent = p + " %"; if (b) b.style.width = p + "%"; }, 200);
    // Fondu musical de fin
    if (V.musique && gainNode && audioCtx) { const n = audioCtx.currentTime; gainNode.gain.cancelScheduledValues(n); gainNode.gain.setValueAtTime(V.volume, n); gainNode.gain.setValueAtTime(V.volume, n + Math.max(0, total - 1.5)); gainNode.gain.linearRampToValueAtTime(0.0001, n + total); }
    const fin = new Promise((ok) => (rec.onstop = ok));
    dessinerTemps(ctx, 0, canvas.width, canvas.height);
    rec.start(250);
    V.onFin = () => setTimeout(() => rec.state !== "inactive" && rec.stop(), 150);
    lire(0);
    await fin;
    clearInterval(suivi);
    V.enregistrement = false;
    if (gainNode) gainNode.gain.value = V.volume;
    const blob = new Blob(morceaux, { type: mime.split(";")[0] });
    const ext = mime.includes("mp4") ? ".mp4" : ".webm";
    const nom = "video-les-beaux-essentiels-" + LBE.util.aujourdhui() + ext;
    const url = URL.createObjectURL(blob);
    zone.innerHTML = '<div class="stack" style="gap:8px"><b>Votre vidéo est prête ✨</b><video src="' + url + '" controls playsinline style="width:100%;max-height:340px;border-radius:12px;background:#000"></video>' +
      '<div class="row-flex"><button class="btn primaire" id="vd-dl">' + icon("telecharger") + ' Télécharger</button><button class="btn" id="vd-sh">' + icon("partager") + ' Partager</button><button class="btn" id="vd-gal">' + icon("image") + " Mes créations</button></div>" +
      (ext === ".webm" ? '<p class="aide">Format WebM : accepté par TikTok et Instagram depuis un ordinateur. Sur iPhone, l\'export se fait directement en MP4.</p>' : "") + "</div>";
    zone.querySelector("#vd-dl").onclick = () => ST.telecharger(blob, nom);
    zone.querySelector("#vd-sh").onclick = () => ST.partager(blob, nom);
    zone.querySelector("#vd-gal").onclick = async () => { try { await ST.galerie.ajouter(blob, "Vidéo " + new Date().toLocaleDateString("fr-FR"), "video"); ui.toast("Vidéo ajoutée à « Mes créations » ✓"); } catch (e) { ui.toast("Enregistrement impossible : " + e.message, true); } };
    dimensionner(); allerA(0);
  }

  /* ---------- Médias ---------- */
  function ajouterFichiers(files) {
    const liste = [...files];
    let n = 0;
    liste.forEach((file) => {
      const url = URL.createObjectURL(file);
      if (/^video\//.test(file.type)) {
        const v = document.createElement("video");
        v.muted = true; v.playsInline = true; v.preload = "auto"; v.setAttribute("playsinline", ""); v.src = url;
        const c = { id: LBE.util.uid(), type: "video", url, el: v, nom: file.name, debut: 0, fin: 4, dureeSource: 4, texte: "", position: "bas", anim: "fondu" };
        v.addEventListener("loadedmetadata", () => { c.dureeSource = v.duration || 4; c.fin = Math.min(c.dureeSource, 6); majPanneau(); allerA(V.t); }, { once: true });
        v.addEventListener("loadeddata", () => allerA(V.t), { once: true });
        V.clips.push(c); n++;
      } else if (/^image\//.test(file.type)) {
        const img = new Image(); img.src = url;
        const c = { id: LBE.util.uid(), type: "image", url, el: img, nom: file.name, duree: 3, texte: "", position: "bas", anim: "zoom" };
        img.onload = () => allerA(V.t);
        V.clips.push(c); n++;
      }
    });
    if (!n) ui.toast("Formats acceptés : photos et vidéos.", true);
    majPanneau();
  }

  /* ---------- Interface ---------- */
  function dimensionner() {
    if (!canvas) return;
    const Q = QUALITES[V.qualite];
    const dispo = canvas.parentElement.clientWidth || 360;
    const maxH = window.innerWidth <= 860 ? window.innerHeight * 0.42 : window.innerHeight - 250;
    const wCss = Math.min(dispo, maxH * 9 / 16, 420);
    canvas.width = Math.min(Q.w, Math.round(wCss * Math.min(2, window.devicePixelRatio || 1)));
    canvas.height = Math.round(canvas.width * 16 / 9);
    canvas.style.width = wCss + "px"; canvas.style.height = wCss * 16 / 9 + "px";
  }

  function rendre(el) {
    root = el;
    el.innerHTML = '<div class="studio"><div class="studio-scene"><div class="cadre"><canvas id="vd-canvas"></canvas></div>' +
      '<div class="lecteur"><button class="btn icone primaire" id="vd-play">' + icon("lecture") + '</button><input type="range" id="vd-pos" min="0" max="1" step="0.01" value="0"><span class="temps" id="vd-temps">0:00</span></div>' +
      '<div class="aide">Format vertical 9:16 · TikTok, Reels, Stories</div></div>' +
      '<div class="studio-panneau" id="vd-panneau"></div></div><input type="file" id="vd-files" accept="image/*,video/*" multiple hidden><input type="file" id="vd-audio" accept="audio/*" hidden>';
    canvas = el.querySelector("#vd-canvas"); ctx = canvas.getContext("2d");
    dimensionner();
    el.querySelector("#vd-play").onclick = () => (V.lecture ? arreter() : lire(V.t));
    const pos = el.querySelector("#vd-pos");
    pos.oninput = () => { if (V.lecture) arreter(); allerA(Number(pos.value)); };
    el.querySelector("#vd-files").onchange = (e) => { ajouterFichiers(e.target.files); e.target.value = ""; };
    el.querySelector("#vd-audio").onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      if (V.musique) { V.musique.el.pause(); }
      const a = new Audio(); a.src = URL.createObjectURL(file); a.preload = "auto";
      V.musique = { el: a, nom: file.name, debut: 0 }; e.target.value = "";
      gainNode = null; destNode = null;
      majPanneau();
    };
    const scene = el.querySelector(".studio-scene");
    scene.addEventListener("dragover", (e) => e.preventDefault());
    scene.addEventListener("drop", (e) => { e.preventDefault(); ajouterFichiers(e.dataTransfer.files); });
    const redim = () => { if (!V.enregistrement) { dimensionner(); allerA(V.t); } };
    window.addEventListener("resize", redim);
    LBE.modules._quitter = () => { arreter(); window.removeEventListener("resize", redim); };
    majPanneau();
    ST.policesPretes().then(() => allerA(V.t));
  }

  function majPanneau() {
    if (!root || !root.isConnected) return;
    const p = root.querySelector("#vd-panneau");
    const segs = segments();
    p.innerHTML =
      '<div class="card"><div class="card-head"><h3>' + icon("video") + ' Médias</h3><span class="doux" style="font-size:.8rem">' + V.clips.length + " élément(s) · " + fmt(dureeTotale()) + "</span></div>" +
      '<div class="depose" id="vd-ajout">' + icon("plus") + "<br><b>Ajouter photos et vidéos</b><br><small>Sélection multiple possible · glisser-déposer</small></div>" +
      (V.clips.length ? '<div class="timeline mt">' + V.clips.map((c, i) => {
        const seg = segs.find((s) => s.clip === c);
        return '<div class="clip" data-clip="' + c.id + '">' + (c.type === "video" ? '<video class="mini" src="' + c.url + '#t=0.1" muted playsinline preload="metadata"></video>' : '<img class="mini" src="' + c.url + '" alt="">') +
          '<div class="ctrl"><div class="clip-num">' + (i + 1) + " · " + (c.type === "video" ? "vidéo" : "photo") + (seg ? " · à " + fmt(seg.t0) : "") + "</div>" +
          '<input data-k="texte" value="' + esc(c.texte) + '" placeholder="Texte à l\'écran (optionnel)">' +
          '<div class="row-flex" style="gap:4px;flex-wrap:nowrap">' +
          (c.type === "video"
            ? '<input data-k="debut" type="number" step="0.1" min="0" value="' + c.debut.toFixed(1) + '" title="Début (s)" style="width:33%"><input data-k="fin" type="number" step="0.1" min="0.5" value="' + c.fin.toFixed(1) + '" title="Fin (s)" style="width:33%">'
            : '<input data-k="duree" type="number" step="0.5" min="0.5" value="' + c.duree + '" title="Durée (s)" style="width:33%">') +
          '<select data-k="anim" style="flex:1">' + ANIMS.map(([k, l]) => '<option value="' + k + '"' + (c.anim === k ? " selected" : "") + ">" + l + "</option>").join("") + "</select></div>" +
          '<select data-k="position">' + [["haut", "Texte en haut"], ["milieu", "Texte au milieu"], ["bas", "Texte en bas"]].map(([k, l]) => '<option value="' + k + '"' + (c.position === k ? " selected" : "") + ">" + l + "</option>").join("") + "</select>" +
          (c.type === "video" ? '<small class="aide">Début / fin en secondes (vidéo de ' + c.dureeSource.toFixed(1) + " s)</small>" : '<small class="aide">Durée d\'affichage en secondes</small>') +
          '</div><div class="ctrl"><button class="btn icone petit" data-mv="-1">' + icon("haut") + '</button><button class="btn icone petit" data-mv="1">' + icon("bas") + '</button><button class="btn icone petit fantome" data-del>' + icon("poubelle") + "</button></div></div>";
      }).join("") + "</div>" : "") + "</div>" +

      '<div class="card"><h3>' + icon("etoile") + " Intro & fin de marque</h3>" +
      '<label class="check"><input type="checkbox" id="vd-intro"' + (V.intro.actif ? " checked" : "") + "> Intro avec le logo (2,6 s)</label>" +
      (V.intro.actif ? '<div class="g2 grid mt" style="gap:8px"><input id="vd-intro-t" value="' + esc(V.intro.titre) + '" placeholder="Titre"><input id="vd-intro-s" value="' + esc(V.intro.sous) + '" placeholder="Sous-titre"></div>' : "") +
      '<label class="check mt"><input type="checkbox" id="vd-outro"' + (V.outro.actif ? " checked" : "") + "> Fin « Commandez sur WhatsApp » (3 s)</label>" +
      (V.outro.actif ? '<div class="g2 grid mt" style="gap:8px"><input id="vd-outro-t" value="' + esc(V.outro.titre) + '" placeholder="Titre"><input id="vd-outro-s" value="' + esc(V.outro.sous) + '" placeholder="Sous-titre"></div>' : "") + "</div>" +

      '<div class="card"><h3>' + icon("parametres") + ' Style</h3><div class="groupe-titre">Filtre</div><div class="chips">' + Object.entries(FILTRES).map(([k, l]) => '<button class="btn petit ' + (V.filtre === k ? "sable" : "") + '" data-filtre="' + k + '">' + l + "</button>").join("") + "</div>" +
      '<div class="g2 grid mt" style="gap:8px"><label class="champ"><span>Police des textes</span><select id="vd-police">' + [["Cormorant Garamond", "Cormorant"], ["Playfair Display", "Playfair"], ["Montserrat", "Montserrat"], ["Great Vibes", "Manuscrite"], ["Jost", "Jost"]].map(([k, l]) => '<option value="' + k + '"' + (V.police === k ? " selected" : "") + ">" + l + "</option>").join("") + '</select></label><label class="champ"><span>Couleur des textes</span><input type="color" id="vd-coul" value="' + V.couleur + '"></label></div>' +
      '<div class="reglage mt"><label>Transition</label><input type="range" id="vd-trans" min="0" max="1.2" step="0.1" value="' + V.transition + '"><output>' + V.transition + " s</output></div>" +
      '<label class="check mt"><input type="checkbox" id="vd-logo"' + (V.logo ? " checked" : "") + "> Logo en filigrane sur les clips</label></div>" +

      '<div class="card"><h3>' + icon("musique") + " Musique</h3>" +
      (V.musique ? '<div class="rowi" style="padding:0 0 8px"><div class="principal"><div class="titre">' + esc(V.musique.nom) + '</div></div><button class="btn petit fantome" id="vd-mus-del">' + icon("poubelle") + "</button></div>" +
        '<div class="reglage"><label>Volume</label><input type="range" id="vd-vol" min="0" max="1" step="0.05" value="' + V.volume + '"><output>' + Math.round(V.volume * 100) + ' %</output></div><div class="reglage"><label>Démarrer à</label><input type="range" id="vd-mus-deb" min="0" max="120" step="1" value="' + (V.musique.debut || 0) + '"><output>' + (V.musique.debut || 0) + " s</output></div>"
        : '<button class="btn" id="vd-mus">' + icon("plus") + " Ajouter une musique</button>") +
      '<p class="aide mt">Importez un fichier audio de votre téléphone. Pour les sons tendance protégés, ajoutez-les plutôt directement dans TikTok / Instagram au moment de publier.</p></div>' +

      '<div class="card"><h3>' + icon("telecharger") + ' Exporter la vidéo</h3><label class="champ"><span>Qualité</span><select id="vd-qual">' + Object.entries(QUALITES).map(([k, v]) => '<option value="' + k + '"' + (V.qualite === k ? " selected" : "") + ">" + v.nom + "</option>").join("") + '</select></label><div id="vd-export" class="mt"><button class="btn primaire" id="vd-creer" style="width:100%">' + icon("video") + " Créer ma vidéo (" + fmt(dureeTotale()) + ")</button></div></div>";

    p.querySelector("#vd-ajout").onclick = () => root.querySelector("#vd-files").click();
    p.querySelectorAll("[data-clip]").forEach((row) => {
      const c = V.clips.find((x) => x.id === row.dataset.clip);
      row.querySelectorAll("[data-k]").forEach((inp) => {
        const k = inp.dataset.k;
        const set = () => {
          if (k === "debut") c.debut = Math.max(0, Math.min(Number(inp.value) || 0, c.dureeSource - 0.5));
          else if (k === "fin") c.fin = Math.max(c.debut + 0.5, Math.min(Number(inp.value) || 0, c.dureeSource));
          else if (k === "duree") c.duree = Math.max(0.5, Number(inp.value) || 3);
          else c[k] = inp.value;
          const seg = segments().find((s) => s.clip === c);
          if (seg && !V.lecture) allerA(seg.t0 + Math.min(1, seg.duree / 2));
        };
        inp.addEventListener("input", set);
        inp.addEventListener("change", () => { set(); if (["debut", "fin", "duree"].includes(k)) majPanneau(); });
      });
      row.querySelectorAll("[data-mv]").forEach((b) => (b.onclick = () => { const i = V.clips.indexOf(c), j = i + Number(b.dataset.mv); if (j < 0 || j >= V.clips.length) return; V.clips.splice(i, 1); V.clips.splice(j, 0, c); majPanneau(); allerA(V.t); }));
      row.querySelector("[data-del]").onclick = () => { V.clips = V.clips.filter((x) => x !== c); if (c.type === "video") c.el.pause(); majPanneau(); allerA(Math.min(V.t, dureeTotale())); };
    });
    const lier = (id, fn, ev) => { const e = p.querySelector(id); if (e) e.addEventListener(ev || "input", () => { fn(e); allerA(V.t); }); };
    lier("#vd-intro", (e) => { V.intro.actif = e.checked; majPanneau(); }, "change");
    lier("#vd-outro", (e) => { V.outro.actif = e.checked; majPanneau(); }, "change");
    lier("#vd-intro-t", (e) => (V.intro.titre = e.value)); lier("#vd-intro-s", (e) => (V.intro.sous = e.value));
    lier("#vd-outro-t", (e) => (V.outro.titre = e.value)); lier("#vd-outro-s", (e) => (V.outro.sous = e.value));
    p.querySelectorAll("[data-filtre]").forEach((b) => (b.onclick = () => { V.filtre = b.dataset.filtre; majPanneau(); allerA(V.t); }));
    lier("#vd-police", (e) => { V.police = e.value; ST.policesPretes().then(() => allerA(V.t)); }, "change");
    lier("#vd-coul", (e) => (V.couleur = e.value));
    lier("#vd-trans", (e) => { V.transition = Number(e.value); e.nextElementSibling.textContent = e.value + " s"; });
    lier("#vd-logo", (e) => (V.logo = e.checked), "change");
    lier("#vd-qual", (e) => { V.qualite = e.value; dimensionner(); }, "change");
    const m = p.querySelector("#vd-mus"); if (m) m.onclick = () => root.querySelector("#vd-audio").click();
    const md = p.querySelector("#vd-mus-del"); if (md) md.onclick = () => { V.musique.el.pause(); V.musique = null; gainNode = null; destNode = null; majPanneau(); };
    lier("#vd-vol", (e) => { V.volume = Number(e.value); if (gainNode) gainNode.gain.value = V.volume; e.nextElementSibling.textContent = Math.round(V.volume * 100) + " %"; });
    lier("#vd-mus-deb", (e) => { V.musique.debut = Number(e.value); e.nextElementSibling.textContent = e.value + " s"; });
    p.querySelector("#vd-creer").onclick = () => creerVideo(p.querySelector("#vd-export"));
    majLecteur();
  }

  ST.video = { rendre };
})();
