/* =========================================================
   Cœur de l'application : interface commune, navigation, graphiques
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;

  /* ---------- Formats ---------- */
  const fmtEuro = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" });
  const fmtNb = new Intl.NumberFormat("fr-FR");
  const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
  const MOIS_ABR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];
  const f = {
    euro: (n) => fmtEuro.format(Number(n) || 0),
    nb: (n) => fmtNb.format(Math.round(Number(n) || 0)),
    pct: (n) => Math.round((Number(n) || 0) * 100) + " %",
    date: (iso) => { if (!iso) return "—"; const d = new Date(iso + "T12:00:00"); return d.getDate() + " " + MOIS_ABR[d.getMonth()] + " " + d.getFullYear(); },
    dateCourte: (iso) => { if (!iso) return "—"; const d = new Date(iso + "T12:00:00"); return JOURS[d.getDay()] + " " + d.getDate() + " " + MOIS_ABR[d.getMonth()]; },
    mois: (ym) => { const [a, m] = ym.split("-"); return MOIS[Number(m) - 1] + " " + a; },
    moisCourt: (ym) => MOIS_ABR[Number(ym.split("-")[1]) - 1],
    initiales: (nom) => (nom || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join("").toUpperCase(),
  };
  f.MOIS = MOIS;
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- Icônes (traits fins) ---------- */
  const P = {
    accueil: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9.5h13V10"/><path d="M10 19.5v-5h4v5"/>',
    catalogue: '<circle cx="7" cy="7" r="3"/><circle cx="17" cy="7" r="3"/><circle cx="7" cy="17" r="3"/><circle cx="17" cy="17" r="3"/>',
    stocks: '<path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16z"/><path d="M3.5 8 12 12.5 20.5 8M12 12.5v8"/>',
    commandes: '<path d="M6 7h12l-1 13H7z"/><path d="M9 7V5.5a3 3 0 0 1 6 0V7"/>',
    clientes: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>',
    compta: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    social: '<rect x="3.5" y="4.5" width="17" height="16" rx="3"/><path d="M3.5 9.5h17M8 2.5v4M16 2.5v4"/>',
    messages: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z"/>',
    studio: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
    parametres: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    menu: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
    fermer: '<path d="M6 6l12 12M18 6 6 18"/>',
    copier: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
    poubelle: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>',
    crayon: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    recherche: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
    alerte: '<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.3"/>',
    camion: '<path d="M2.5 6.5h11v10h-11zM13.5 10h4l3 3.5v3h-7"/><circle cx="6.5" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    avion: '<path d="M21 15.5 13.5 11V5a1.5 1.5 0 0 0-3 0v6L3 15.5V17l7.5-2.3V19l-2 1.5V22l3.5-1 3.5 1v-1.5l-2-1.5v-4.3L21 17z"/>',
    euro: '<path d="M17.5 6.5A7 7 0 1 0 17.5 17.5"/><path d="M4 10.5h9M4 13.5h9"/>',
    telecharger: '<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5"/><path d="M4.5 19.5h15"/>',
    televerser: '<path d="M12 15.5v-11m0 0L7.5 9M12 4.5 16.5 9"/><path d="M4.5 19.5h15"/>',
    whatsapp: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.6L3.5 20.5l1.4-4.4A8.5 8.5 0 1 1 20.5 11.5z"/><path d="M9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 .8c-1-.5-2.3-1.8-2.8-2.8l.8-1-1-2z" fill="currentColor" stroke="none"/>',
    etoile: '<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8L3.5 9.7l5.9-.8z"/>',
    melange: '<circle cx="8" cy="12" r="4.5"/><circle cx="16" cy="12" r="4.5"/>',
    lien: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.8"/><path d="m20.5 16-5-5-8.5 8.5"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2.5"/><path d="m16 10.5 5-3v9l-5-3z"/>',
    texte: '<path d="M5 6.5V5h14v1.5M12 5v14M9 19h6"/>',
    calque: '<path d="m12 4 8.5 4.5L12 13 3.5 8.5z"/><path d="m3.5 12.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    baguette: '<path d="m4 20 11-11M14 4v2.5M19.5 9.5H17M17.5 5.5l-1.8 1.8M12.5 6.5 10 4"/>',
    partager: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>',
    lecture: '<path d="M7 4.5v15l12-7.5z"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    haut: '<path d="m6 15 6-6 6 6"/>',
    bas: '<path d="m6 9 6 6 6-6"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    retour: '<path d="M15 5 8 12l7 7"/>',
    musique: '<path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
    annuler: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  };
  const icon = (n, cls) => '<svg class="ic ' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (P[n] || "") + "</svg>";

  /* ---------- Composants ---------- */
  const ui = {};
  ui.toast = (msg, erreur) => {
    const root = document.getElementById("toast-root");
    const t = document.createElement("div");
    t.className = "toast" + (erreur ? " erreur" : "");
    t.textContent = msg;
    root.appendChild(t);
    setTimeout(() => { t.style.transition = "opacity .3s"; t.style.opacity = "0"; setTimeout(() => t.remove(), 300); }, erreur ? 4200 : 2200);
  };
  ui.copier = async (texte, msg) => {
    try { await navigator.clipboard.writeText(texte); }
    catch (e) {
      const ta = document.createElement("textarea"); ta.value = texte; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); } catch (_) {} ta.remove();
    }
    ui.toast(msg || "Copié ✓");
  };
  ui.lienWhatsApp = (tel, texte) => {
    let n = String(tel || "").replace(/[^\d+]/g, "");
    if (n.startsWith("+")) n = n.slice(1); else if (n.startsWith("00")) n = n.slice(2); else if (n.startsWith("0") && n.length === 10) n = "33" + n.slice(1);
    return "https://wa.me/" + n + (texte ? "?text=" + encodeURIComponent(texte) : "");
  };

  // Modale générique. options : { titre, corps (html), large, boutons:[{label, cls, action(fermer, el) }], onOuvrir(el), soumettre:{label, action(valeurs, el, fermer) -> false pour garder ouvert}, supprimer: fn }
  ui.modale = (o) => {
    const root = document.getElementById("modal-root");
    const fond = document.createElement("div");
    fond.className = "modal-fond";
    fond.innerHTML = '<div class="modal ' + (o.large ? "large" : "") + '" role="dialog" aria-modal="true">' +
      '<div class="modal-head"><h2>' + esc(o.titre) + '</h2><button class="btn icone fantome" data-fermer aria-label="Fermer">' + icon("fermer") + "</button></div>" +
      '<form class="modal-body form" novalidate>' + (o.corps || "") + "</form>" +
      '<div class="modal-foot"></div></div>';
    const el = fond.querySelector(".modal");
    const form = fond.querySelector("form");
    const foot = fond.querySelector(".modal-foot");
    const fermer = () => { fond.remove(); document.body.style.overflow = ""; if (o.onFermer) o.onFermer(); };
    fond.addEventListener("mousedown", (e) => { if (e.target === fond) fond.dataset.down = "1"; });
    fond.addEventListener("click", (e) => { if (e.target === fond && fond.dataset.down) fermer(); fond.dataset.down = ""; });
    fond.querySelector("[data-fermer]").onclick = fermer;
    if (o.supprimer) {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn danger gauche"; b.innerHTML = icon("poubelle") + " Supprimer";
      b.onclick = () => ui.confirmer("Supprimer définitivement ?", () => { o.supprimer(); fermer(); });
      foot.appendChild(b);
    }
    (o.boutons || []).forEach((bt) => {
      const b = document.createElement("button"); b.type = "button"; b.className = "btn " + (bt.cls || ""); b.innerHTML = bt.label;
      b.onclick = () => bt.action(fermer, el); foot.appendChild(b);
    });
    if (o.soumettre) {
      const ann = document.createElement("button"); ann.type = "button"; ann.className = "btn"; ann.textContent = "Annuler"; ann.onclick = fermer; foot.appendChild(ann);
      const b = document.createElement("button"); b.type = "submit"; b.className = "btn primaire"; b.innerHTML = o.soumettre.label || "Enregistrer";
      b.onclick = (e) => { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : form.dispatchEvent(new Event("submit", { cancelable: true })); };
      foot.appendChild(b);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const manquant = [...form.querySelectorAll("[required]")].find((i) => !String(i.value).trim());
        if (manquant) { manquant.focus(); ui.toast("Merci de compléter : " + (manquant.closest(".champ")?.querySelector("span")?.textContent || "champ obligatoire"), true); return; }
        const res = o.soumettre.action(ui.valeurs(form), el, fermer);
        if (res !== false) fermer();
      });
    }
    if (!foot.children.length) foot.remove();
    root.appendChild(fond);
    document.body.style.overflow = "hidden";
    if (o.onOuvrir) o.onOuvrir(el, fermer);
    return { el, fermer };
  };
  ui.valeurs = (form) => {
    const v = {};
    form.querySelectorAll("[name]").forEach((i) => {
      if (i.type === "checkbox") v[i.name] = i.checked;
      else if (i.type === "radio") { if (i.checked) v[i.name] = i.value; }
      else if (i.type === "number") v[i.name] = i.value === "" ? "" : Number(i.value);
      else v[i.name] = i.value.trim();
    });
    return v;
  };
  ui.confirmer = (msg, ok, label) => ui.modale({ titre: "Confirmation", corps: "<p>" + esc(msg) + "</p>", boutons: [{ label: "Annuler", action: (f) => f() }, { label: label || "Confirmer", cls: "primaire", action: (f) => { f(); ok(); } }] });

  // Champs de formulaire
  ui.champ = (label, nom, valeur, opts) => {
    opts = opts || {};
    const type = opts.type || "text";
    const req = opts.requis ? " required" : "";
    const attrs = (opts.attrs || "") + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : "");
    let input;
    if (type === "textarea") input = '<textarea name="' + nom + '"' + req + attrs + ">" + esc(valeur) + "</textarea>";
    else if (type === "select") input = '<select name="' + nom + '"' + req + attrs + ">" + opts.options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return '<option value="' + esc(v) + '"' + (String(v) === String(valeur) ? " selected" : "") + ">" + esc(l) + "</option>"; }).join("") + "</select>";
    else input = '<input type="' + type + '" name="' + nom + '" value="' + esc(valeur) + '"' + (type === "number" ? ' step="' + (opts.step || "0.01") + '" inputmode="decimal"' : "") + req + attrs + ">";
    return '<label class="champ' + (opts.cls ? " " + opts.cls : "") + '"><span>' + esc(label) + (opts.requis ? " *" : "") + "</span>" + input + (opts.aide ? '<small class="aide">' + opts.aide + "</small>" : "") + "</label>";
  };
  ui.vide = (texte, action) => '<div class="vide"><div class="icone-vide">❦</div><p>' + texte + "</p>" + (action || "") + "</div>";
  ui.tabs = (base, items, actif) => '<nav class="tabs">' + items.map(([k, l]) => '<a href="#/' + base + (k ? "/" + k : "") + '" class="' + (k === actif ? "actif" : "") + '">' + l + "</a>").join("") + "</nav>";
  ui.entete = (surTitre, titre, actions) => '<div class="page-head"><div><div class="sur-titre">' + esc(surTitre) + "</div><h1>" + esc(titre) + '</h1></div><div class="actions">' + (actions || "") + "</div></div>";
  ui.vignette = (p, cls) => {
    if (p && p.photo) return '<img class="vignette ' + (cls || "") + '" src="' + esc(p.photo) + '" alt="" loading="lazy" onerror="this.outerHTML=\'<div class=&quot;vignette ' + (cls || "") + '&quot;>' + esc(f.initiales(p.nom)) + "</div>'\">";
    return '<div class="vignette ' + (cls || "") + '">' + esc(f.initiales(p ? p.nom : "?")) + "</div>";
  };
  ui.badgeStock = (niveau, st) => {
    const m = { ok: ["ok", "En stock"], bas: ["bas", "Stock bas"], rupture: ["rupture", "Rupture"], bientot: ["info", "Bientôt"] }[niveau] || ["", ""];
    return '<span class="badge ' + m[0] + '">' + m[1] + (st != null && niveau !== "bientot" ? " · " + st : "") + "</span>";
  };

  /* ---------- Graphiques SVG ---------- */
  const charts = {};
  const COULEURS = ["#5f8eac", "#c9a97a", "#e2b4a6", "#7fb39a", "#9a8bc0", "#d98f6f", "#8fb9c9", "#b7a58c", "#a7b6c2"];
  charts.COULEURS = COULEURS;
  function echelle(max) {
    if (max <= 0) return { max: 1, pas: 0.25 };
    const p = Math.pow(10, Math.floor(Math.log10(max)));
    const n = max / p;
    const pas = (n <= 1.5 ? 0.25 : n <= 3 ? 0.5 : n <= 6 ? 1 : 2) * p;
    return { max: Math.ceil(max / pas) * pas, pas };
  }
  const court = (v) => Math.abs(v) >= 1000 ? (Math.round(v / 100) / 10).toString().replace(".", ",") + " k" : String(Math.round(v * 100) / 100).replace(".", ",");
  // Barres groupées : labels[], series [{nom, couleur, valeurs[]}]
  charts.barres = (labels, series, o) => {
    o = o || {};
    const W = 640, H = o.h || 240, ml = 44, mr = 8, mt = 12, mb = 28;
    const vals = series.flatMap((s) => s.valeurs);
    const maxV = Math.max(0, ...vals), minV = Math.min(0, ...vals);
    const e = echelle(Math.max(maxV, -minV));
    const top = Math.max(e.pas, Math.ceil(maxV / e.pas - 1e-9) * e.pas), bot = minV < 0 ? Math.floor(minV / e.pas + 1e-9) * e.pas : 0;
    const y = (v) => mt + (top - v) / (top - bot) * (H - mt - mb);
    const bw = (W - ml - mr) / labels.length;
    const gw = Math.min(bw * 0.72, 22 * series.length + 8);
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    for (let v = bot; v <= top + 1e-9; v += e.pas) s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="rgba(53,95,125,' + (Math.abs(v) < 1e-9 ? ".25" : ".08") + ')"/><text x="' + (ml - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + court(v) + (o.unite || "") + "</text>";
    labels.forEach((l, i) => {
      const x0 = ml + i * bw + (bw - gw) / 2;
      series.forEach((se, k) => {
        const v = se.valeurs[i] || 0; const w = gw / series.length - 3;
        const ya = y(Math.max(v, 0)), yb = y(Math.min(v, 0));
        s += '<rect x="' + (x0 + k * (w + 3)) + '" y="' + ya + '" width="' + w + '" height="' + Math.max(yb - ya, v ? 1.5 : 0) + '" rx="4" fill="' + se.couleur + '"><title>' + esc(se.nom) + " — " + esc(l) + " : " + (o.format ? o.format(v) : v) + "</title></rect>";
      });
      s += '<text x="' + (ml + i * bw + bw / 2) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + "</text>";
    });
    return s + "</svg>" + charts.legende(series);
  };
  // Courbes : labels[], series [{nom, couleur, valeurs[]}]
  charts.courbes = (labels, series, o) => {
    o = o || {};
    const W = 640, H = o.h || 240, ml = 44, mr = 12, mt = 12, mb = 28;
    const e = echelle(Math.max(1, ...series.flatMap((s) => s.valeurs)));
    const y = (v) => mt + (1 - v / e.max) * (H - mt - mb);
    const x = (i) => ml + (labels.length <= 1 ? (W - ml - mr) / 2 : i * (W - ml - mr) / (labels.length - 1));
    let s = '<svg class="chart" viewBox="0 0 ' + W + " " + H + '" role="img">';
    for (let v = 0; v <= e.max + 1e-9; v += e.pas) s += '<line x1="' + ml + '" x2="' + (W - mr) + '" y1="' + y(v) + '" y2="' + y(v) + '" stroke="rgba(53,95,125,.08)"/><text x="' + (ml - 6) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + court(v) + "</text>";
    const pasL = Math.ceil(labels.length / 8);
    labels.forEach((l, i) => { if (i % pasL === 0 || i === labels.length - 1) s += '<text x="' + x(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(l) + "</text>"; });
    series.forEach((se) => {
      const pts = se.valeurs.map((v, i) => [x(i), y(v || 0)]);
      if (!pts.length) return;
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
      if (o.aire !== false) s += '<path d="' + d + " L" + pts[pts.length - 1][0] + " " + y(0) + " L" + pts[0][0] + " " + y(0) + 'Z" fill="' + se.couleur + '" opacity=".1"/>';
      s += '<path d="' + d + '" fill="none" stroke="' + se.couleur + '" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach((p, i) => { s += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.2" fill="#fff" stroke="' + se.couleur + '" stroke-width="2"><title>' + esc(se.nom) + " — " + esc(labels[i]) + " : " + f.nb(se.valeurs[i]) + "</title></circle>"; });
    });
    return s + "</svg>" + charts.legende(series);
  };
  // Anneau : items [{nom, valeur, couleur}]
  charts.anneau = (items, o) => {
    o = o || {};
    const total = items.reduce((s, i) => s + i.valeur, 0) || 1;
    const R = 70, r = 46, cx = 90, cy = 90;
    let a0 = -Math.PI / 2, s = '<div class="row-flex" style="gap:18px;align-items:center"><svg viewBox="0 0 180 180" style="width:150px;flex:none">';
    items.forEach((it) => {
      const a1 = a0 + (it.valeur / total) * Math.PI * 2;
      const big = a1 - a0 > Math.PI ? 1 : 0;
      const p = (a, rr) => [cx + rr * Math.cos(a), cy + rr * Math.sin(a)];
      const [x1, y1] = p(a0, R), [x2, y2] = p(a1 - 0.0001, R), [x3, y3] = p(a1 - 0.0001, r), [x4, y4] = p(a0, r);
      s += '<path d="M' + x1 + " " + y1 + " A" + R + " " + R + " 0 " + big + " 1 " + x2 + " " + y2 + " L" + x3 + " " + y3 + " A" + r + " " + r + " 0 " + big + " 0 " + x4 + " " + y4 + 'Z" fill="' + it.couleur + '"><title>' + esc(it.nom) + " : " + f.euro(it.valeur) + "</title></path>";
      a0 = a1;
    });
    s += '<text x="90" y="86" text-anchor="middle" style="font-family:var(--titre);font-size:22px;font-weight:600;fill:var(--encre)">' + (o.centre || "") + '</text><text x="90" y="106" text-anchor="middle" style="font-size:10px;fill:var(--texte-doux)">' + (o.sousCentre || "") + "</text></svg>";
    s += '<div style="flex:1;min-width:140px;display:flex;flex-direction:column;gap:6px;font-size:.86rem">' + items.map((i) => '<div class="row-flex" style="gap:8px;flex-wrap:nowrap"><i style="width:10px;height:10px;border-radius:3px;background:' + i.couleur + ';flex:none"></i><span style="flex:1">' + esc(i.nom) + '</span><b class="num">' + f.euro(i.valeur) + "</b></div>").join("") + "</div></div>";
    return s;
  };
  charts.legende = (series) => series.length > 1 ? '<div class="legende">' + series.map((s) => '<span><i style="background:' + s.couleur + '"></i>' + esc(s.nom) + "</span>").join("") + "</div>" : "";

  /* ---------- Navigation ---------- */
  const MODULES = [
    { cle: "dashboard", nom: "Tableau de bord", court: "Accueil", icone: "accueil" },
    { cle: "commandes", nom: "Commandes & clientes", court: "Commandes", icone: "commandes" },
    { cle: "catalogue", nom: "Catalogue & création", court: "Catalogue", icone: "catalogue" },
    { cle: "stocks", nom: "Stocks", court: "Stocks", icone: "stocks" },
    { cle: "compta", nom: "Comptabilité", court: "Compta", icone: "compta" },
    { cle: "social", nom: "Social media", court: "Social", icone: "social" },
    { cle: "messages", nom: "Messages WhatsApp", court: "Messages", icone: "messages" },
    { cle: "studio", nom: "Studio créatif", court: "Studio", icone: "studio" },
    { cle: "parametres", nom: "Paramètres", court: "Réglages", icone: "parametres" },
  ];
  const BAS = ["dashboard", "commandes", "stocks", "studio"];
  LBE.modules = LBE.modules || {};

  function construireNav() {
    const actions = LBE.calc.etatStocks().filter((e) => e.niveau === "bas" || e.niveau === "rupture").length;
    const aPreparer = LBE.store.d.commandes.filter((c) => { const s = LBE.calc.statutCommande(c).cle; return s === "a_preparer" || s === "paiement"; }).length;
    const badge = { commandes: aPreparer, stocks: actions };
    document.getElementById("nav").innerHTML = MODULES.map((m) => '<a href="#/' + m.cle + '" data-cle="' + m.cle + '">' + icon(m.icone) + "<span>" + m.nom + "</span>" + (badge[m.cle] ? '<span class="badge-nav">' + badge[m.cle] + "</span>" : "") + "</a>").join("");
    document.getElementById("bottom-nav").innerHTML = BAS.map((k) => { const m = MODULES.find((x) => x.cle === k); return '<a href="#/' + k + '" data-cle="' + k + '">' + icon(m.icone) + "<span>" + m.court + "</span>" + (badge[k] ? '<i class="pastille"></i>' : "") + "</a>"; }).join("") +
      '<a href="#" data-plus>' + icon("menu") + "<span>Plus</span></a>";
    document.querySelector("[data-plus]").onclick = (e) => {
      e.preventDefault();
      const m = ui.modale({ titre: "Menu", corps: '<div class="plus-grid">' + MODULES.map((x) => '<a href="#/' + x.cle + '">' + icon(x.icone) + "<span>" + x.court + "</span></a>").join("") + "</div>" });
      m.el.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => m.fermer()));
    };
  }

  let routeCourante = { cle: "dashboard", params: [] };
  function lireRoute() {
    const h = location.hash.replace(/^#\/?/, "");
    const parts = h.split("/").filter(Boolean).map(decodeURIComponent);
    const cle = MODULES.some((m) => m.cle === parts[0]) ? parts[0] : "dashboard";
    return { cle, params: parts.slice(1) };
  }
  function rendre(garderScroll) {
    const r = lireRoute();
    const change = r.cle !== routeCourante.cle || r.params.join("/") !== routeCourante.params.join("/");
    routeCourante = r;
    const mod = MODULES.find((m) => m.cle === r.cle);
    const main = document.getElementById("main");
    construireNav();
    document.querySelectorAll("[data-cle]").forEach((a) => a.classList.toggle("actif", a.dataset.cle === r.cle));
    document.getElementById("titre-page").textContent = mod.nom;
    document.title = mod.nom + " · Les Beaux Essentiels";
    const y = window.scrollY;
    const m = LBE.modules[r.cle];
    if (LBE.modules._quitter) { try { LBE.modules._quitter(); } catch (e) {} LBE.modules._quitter = null; }
    main.innerHTML = "";
    if (m) {
      try { m.rendre(main, r.params); }
      catch (e) { console.error(e); main.innerHTML = '<div class="card">' + ui.vide("Oups, une erreur est survenue dans ce module.<br><small>" + esc(e.message) + "</small>") + "</div>"; }
    } else main.innerHTML = '<div class="card">' + ui.vide("Module en construction…") + "</div>";
    window.scrollTo(0, garderScroll && !change ? y : 0);
  }
  LBE.rafraichir = () => rendre(true);
  LBE.aller = (h) => { if (location.hash === h) rendre(true); else location.hash = h; };
  LBE.ui = ui; LBE.f = f; LBE.esc = esc; LBE.icon = icon; LBE.charts = charts;

  window.addEventListener("hashchange", () => rendre(false));
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("recherche-ico") && (document.getElementById("recherche-ico").innerHTML = icon("recherche"));
    rendre(false);
  });
})();
