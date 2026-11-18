/* =========================================================
   Module 6 — Stratégie social media (TikTok + Instagram)
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, charts, q } = LBE;
  const S = () => LBE.store.d;
  const U = LBE.util;
  const STATUTS = [["idee", "Idée"], ["a_tourner", "À tourner"], ["publie", "Publié"]];
  const BADGE = { idee: "nodot", a_tourner: "attente", publie: "ok" };
  let moisCal = U.mois(U.aujourdhui());
  let metrique = "abonnes";

  function rendre(el, params) {
    const onglet = params[0] || "calendrier";
    el.innerHTML = ui.entete("Module 6", "Stratégie social media", '<button class="btn primaire" data-act="pub">' + icon("plus") + " Planifier une publication</button>") +
      ui.tabs("social", [["calendrier", "Calendrier"], ["idees", "Banque d'idées"], ["legendes", "Légendes & hashtags"], ["stats", "Statistiques"]], onglet) + '<div id="so"></div>';
    el.querySelector('[data-act="pub"]').onclick = () => fichePub(null);
    const c = el.querySelector("#so");
    ({ idees: rendreIdees, legendes: rendreLegendes, stats: rendreStats }[onglet] || rendreCalendrier)(c);
  }

  /* ---------- Calendrier éditorial ---------- */
  function rendreCalendrier(el) {
    const [a, m] = moisCal.split("-").map(Number);
    const premier = new Date(a, m - 1, 1);
    const decal = (premier.getDay() + 6) % 7; // lundi en premier
    const debut = new Date(a, m - 1, 1 - decal);
    const auj = U.aujourdhui();
    const pubs = S().publications;
    let cases = "";
    for (let i = 0; i < 42; i++) {
      const d = new Date(debut.getFullYear(), debut.getMonth(), debut.getDate() + i);
      const iso = U.isoDate(d);
      if (i >= 35 && d.getMonth() !== m - 1) break;
      const duJour = pubs.filter((p) => p.date === iso);
      cases += '<div class="case' + (d.getMonth() !== m - 1 ? " hors" : "") + (iso === auj ? " auj" : "") + '" data-jour="' + iso + '"><span class="n">' + d.getDate() + "</span>" + duJour.map((p) => '<span class="pub ' + p.statut + '" data-pub="' + p.id + '" title="' + esc(p.titre) + '">' + esc(p.titre) + "</span>").join("") + "</div>";
    }
    const aVenir = pubs.filter((p) => p.date >= auj && p.statut !== "publie").sort((x, y) => (x.date > y.date ? 1 : -1));
    const passees = pubs.filter((p) => p.date < auj || p.statut === "publie").sort((x, y) => (x.date < y.date ? 1 : -1)).slice(0, 8);
    const ligne = (p) => { const pr = q.produit(p.produitId); return '<div class="rowi cliquable" data-pub="' + p.id + '"><div class="avatar" style="border-radius:12px;font-size:.72rem;flex-direction:column;line-height:1.05;width:46px;height:46px"><b style="font-size:1.05rem">' + Number(p.date.slice(8)) + "</b>" + f.moisCourt(p.date.slice(0, 7)) + '</div><div class="principal"><div class="titre">' + esc(p.titre) + '</div><div class="meta">' + esc(p.plateforme) + " · " + esc(p.type) + (pr ? " · " + esc(pr.nom) : "") + '</div></div><span class="badge ' + BADGE[p.statut] + '">' + STATUTS.find((s) => s[0] === p.statut)[1] + "</span></div>"; };
    el.innerHTML =
      '<div class="grid g2"><div class="card span2"><div class="card-head"><div class="row-flex"><button class="btn icone petit" id="prec">' + icon("retour") + '</button><h3 style="min-width:150px;text-align:center;text-transform:capitalize">' + f.mois(moisCal) + '</h3><button class="btn icone petit" id="suiv" style="transform:scaleX(-1)">' + icon("retour") + '</button></div><div class="row-flex" style="gap:6px"><span class="badge nodot">Idée</span><span class="badge attente">À tourner</span><span class="badge ok">Publié</span></div></div>' +
      '<div class="cal">' + ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."].map((j) => '<div class="jour-nom">' + j + "</div>").join("") + cases + '</div><p class="aide mt">Touchez un jour pour planifier une publication.</p></div>' +
      '<div class="card"><h3>À venir</h3>' + (aVenir.length ? '<div class="rows">' + aVenir.map(ligne).join("") + "</div>" : ui.vide("Rien de prévu : piochez dans la banque d'idées !")) + "</div>" +
      '<div class="card"><h3>Récemment</h3>' + (passees.length ? '<div class="rows">' + passees.map(ligne).join("") + "</div>" : ui.vide("Aucune publication passée.")) + "</div></div>";
    el.querySelector("#prec").onclick = () => { moisCal = U.mois(U.isoDate(new Date(a, m - 2, 1))); rendreCalendrier(el); };
    el.querySelector("#suiv").onclick = () => { moisCal = U.mois(U.isoDate(new Date(a, m, 1))); rendreCalendrier(el); };
    el.querySelectorAll("[data-jour]").forEach((c) => (c.onclick = (e) => { const p = e.target.closest("[data-pub]"); if (p) return; fichePub(null, { date: c.dataset.jour }); }));
    el.querySelectorAll("[data-pub]").forEach((c) => (c.onclick = (e) => { e.stopPropagation(); fichePub(S().publications.find((p) => p.id === c.dataset.pub)); }));
  }

  function fichePub(p, preset) {
    const nouveau = !p;
    const L = S().lists;
    p = p || Object.assign({ id: "", date: U.ajouterJours(U.aujourdhui(), 1), plateforme: L.plateformes[0], type: L.typesContenu[0], produitId: "", titre: "", statut: "idee", legende: "", hashtags: "", notes: "" }, preset || {});
    const legs = S().legendes;
    ui.modale({
      titre: nouveau ? "Planifier une publication" : "Publication", large: true,
      corps: ui.champ("Sujet / titre", "titre", p.titre, { requis: true, placeholder: "ex. Tuto : porter ses bayas avec un jean" }) +
        '<div class="g2 grid">' + ui.champ("Date", "date", p.date, { type: "date", requis: true }) + ui.champ("Statut", "statut", p.statut, { type: "select", options: STATUTS }) + "</div>" +
        '<div class="g2 grid">' + ui.champ("Plateforme", "plateforme", p.plateforme, { type: "select", options: L.plateformes }) + ui.champ("Type de contenu", "type", p.type, { type: "select", options: L.typesContenu }) + "</div>" +
        ui.champ("Produit mis en avant", "produitId", p.produitId, { type: "select", options: [["", "— Aucun —"]].concat(q.produitsActifs().map((x) => [x.id, x.nom])) }) +
        (legs.length ? '<div class="champ"><span>Partir d\'une légende enregistrée</span><div class="chips">' + legs.map((l) => '<button type="button" class="chip" style="padding-right:12px;cursor:pointer" data-leg="' + l.id + '">' + esc(l.titre) + "</button>").join("") + "</div></div>" : "") +
        ui.champ("Légende", "legende", p.legende, { type: "textarea", placeholder: "Le texte qui accompagnera la vidéo…" }) +
        ui.champ("Hashtags", "hashtags", p.hashtags, { placeholder: "#bayas #waistbeads #lesbeauxessentiels" }) +
        ui.champ("Notes de tournage", "notes", p.notes, { type: "textarea", placeholder: "Plans à filmer, son tendance, lumière…" }),
      boutons: [{ label: icon("copier") + " Copier légende + hashtags", action: (fe, el) => { const v = ui.valeurs(el.querySelector("form")); ui.copier((v.legende + "\n\n" + v.hashtags).trim(), "Légende copiée ✓"); } }],
      onOuvrir: (el) => el.querySelectorAll("[data-leg]").forEach((b) => (b.onclick = () => { const l = legs.find((x) => x.id === b.dataset.leg); el.querySelector('[name="legende"]').value = l.texte; el.querySelector('[name="hashtags"]').value = l.hashtags; })),
      supprimer: nouveau ? null : () => { S().publications = S().publications.filter((x) => x.id !== p.id); LBE.store.sauver(); LBE.rafraichir(); },
      soumettre: { action: (v) => { Object.assign(p, v); if (nouveau) { p.id = U.uid(); S().publications.push(p); } moisCal = U.mois(p.date); LBE.store.sauver(); ui.toast("Publication enregistrée ✓"); if (preset && preset._idee) { S().idees = S().idees.filter((i) => i.id !== preset._idee); LBE.store.sauver(); } LBE.rafraichir(); } },
    });
  }

  /* ---------- Banque d'idées ---------- */
  function rendreIdees(el) {
    const idees = S().idees;
    el.innerHTML = '<div class="row-flex mb"><p class="doux" style="margin:0;flex:1">Notez toutes vos idées dès qu\'elles arrivent, puis planifiez-les en un clic.</p><button class="btn sable" id="add">' + icon("plus") + " Nouvelle idée</button></div>" +
      '<div class="card nacre mb"><h3>' + icon("etoile") + ' Inspirations pour votre marque</h3><div class="chips">' +
      ["Préparer une commande en ASMR", "Une journée au marché d'Adjamé", "Quelle baya selon votre signe ?", "Mesurer son tour de hanche", "Réagir aux avis clientes", "Avant/après tenue de soirée", "Mini musc : test de tenue 12 h", "Vlog d'arrivage : ouverture du colis d'Abidjan"].map((t) => '<button type="button" class="chip" style="padding-right:12px;cursor:pointer" data-insp="' + esc(t) + '">＋ ' + esc(t) + "</button>").join("") + "</div></div>" +
      (idees.length ? '<div class="grid g2">' + idees.map((i) => { const pr = q.produit(i.produitId); return '<div class="card"><div class="card-head"><h3 style="font-size:1.15rem">' + esc(i.titre) + '</h3><button class="btn icone petit fantome" data-edit="' + i.id + '">' + icon("crayon") + '</button></div><div class="row-flex" style="gap:6px;margin-bottom:8px"><span class="badge info nodot">' + esc(i.type) + "</span>" + (pr ? '<span class="badge sable nodot">' + esc(pr.nom) + "</span>" : "") + "</div>" + (i.note ? '<p class="doux" style="font-size:.9rem">' + esc(i.note) + "</p>" : "") + '<button class="btn petit primaire" data-plan="' + i.id + '">' + icon("social") + " Planifier</button></div>"; }).join("") + "</div>" : '<div class="card">' + ui.vide("Votre banque d'idées est vide.") + "</div>");
    el.querySelector("#add").onclick = () => ficheIdee(null);
    el.querySelectorAll("[data-insp]").forEach((b) => (b.onclick = () => ficheIdee(null, b.dataset.insp)));
    el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => ficheIdee(idees.find((i) => i.id === b.dataset.edit))));
    el.querySelectorAll("[data-plan]").forEach((b) => (b.onclick = () => { const i = idees.find((x) => x.id === b.dataset.plan); fichePub(null, { titre: i.titre, type: i.type, produitId: i.produitId, notes: i.note, statut: "a_tourner", _idee: i.id }); }));
  }
  function ficheIdee(i, titre) {
    const nouveau = !i;
    i = i || { id: "", titre: titre || "", type: S().lists.typesContenu[0], produitId: "", note: "" };
    ui.modale({
      titre: nouveau ? "Nouvelle idée" : "Modifier l'idée",
      corps: ui.champ("Idée", "titre", i.titre, { requis: true }) + '<div class="g2 grid">' + ui.champ("Type", "type", i.type, { type: "select", options: S().lists.typesContenu }) + ui.champ("Produit", "produitId", i.produitId, { type: "select", options: [["", "— Aucun —"]].concat(q.produitsActifs().map((x) => [x.id, x.nom])) }) + "</div>" + ui.champ("Notes", "note", i.note, { type: "textarea" }),
      supprimer: nouveau ? null : () => { S().idees = S().idees.filter((x) => x.id !== i.id); LBE.store.sauver(); LBE.rafraichir(); },
      soumettre: { action: (v) => { Object.assign(i, v); if (nouveau) { i.id = U.uid(); S().idees.push(i); } LBE.store.sauver(); ui.toast("Idée enregistrée ✓"); LBE.rafraichir(); } },
    });
  }

  /* ---------- Légendes & hashtags ---------- */
  const PACKS_HASHTAGS = [
    ["Bayas", "#bayas #waistbeads #perlesdehanche #bijouxdecorps #bayasafricaines"],
    ["Muscs & senteurs", "#musc #minimusc #parfum #senteurs #parfumafricain"],
    ["Marque", "#lesbeauxessentiels #beauté #accessoires #madeinabidjan #petitemarque"],
    ["Portée", "#pourtoi #fyp #tiktokfrance #reelsfrance #beautetiktok"],
  ];
  function rendreLegendes(el) {
    const l = S().legendes;
    el.innerHTML = '<div class="row-flex mb"><p class="doux" style="margin:0;flex:1">Les mêmes contenus pour TikTok et Instagram : gardez ici vos légendes types.</p><button class="btn sable" id="add">' + icon("plus") + " Nouvelle légende</button></div>" +
      '<div class="card nacre mb"><h3># Groupes de hashtags</h3><div class="rows">' + PACKS_HASHTAGS.map(([n, h]) => '<div class="rowi"><div class="principal"><div class="titre">' + n + '</div><div class="meta" style="white-space:normal">' + esc(h) + '</div></div><button class="btn icone petit" data-copyh="' + esc(h) + '">' + icon("copier") + "</button></div>").join("") + "</div></div>" +
      (l.length ? '<div class="grid g2">' + l.map((x) => '<div class="card"><div class="card-head"><h3 style="font-size:1.15rem">' + esc(x.titre) + '</h3><button class="btn icone petit fantome" data-edit="' + x.id + '">' + icon("crayon") + '</button></div><div class="message-modele">' + esc(x.texte) + '\n\n<span style="color:var(--bleu-2)">' + esc(x.hashtags) + '</span></div><button class="btn petit primaire mt" data-copy="' + x.id + '">' + icon("copier") + " Copier</button></div>").join("") + "</div>" : '<div class="card">' + ui.vide("Aucune légende enregistrée.") + "</div>");
    el.querySelector("#add").onclick = () => ficheLegende(null);
    el.querySelectorAll("[data-copyh]").forEach((b) => (b.onclick = () => ui.copier(b.dataset.copyh, "Hashtags copiés ✓")));
    el.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => { const x = l.find((y) => y.id === b.dataset.copy); ui.copier(x.texte + "\n\n" + x.hashtags, "Légende copiée ✓"); }));
    el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => ficheLegende(l.find((y) => y.id === b.dataset.edit))));
  }
  function ficheLegende(x) {
    const nouveau = !x;
    x = x || { id: "", titre: "", texte: "", hashtags: "#lesbeauxessentiels " };
    ui.modale({
      titre: nouveau ? "Nouvelle légende" : "Modifier la légende",
      corps: ui.champ("Titre", "titre", x.titre, { requis: true }) + ui.champ("Texte", "texte", x.texte, { type: "textarea", attrs: ' rows="7"' }) + ui.champ("Hashtags", "hashtags", x.hashtags),
      supprimer: nouveau ? null : () => { S().legendes = S().legendes.filter((y) => y.id !== x.id); LBE.store.sauver(); LBE.rafraichir(); },
      soumettre: { action: (v) => { Object.assign(x, v); if (nouveau) { x.id = U.uid(); S().legendes.push(x); } LBE.store.sauver(); ui.toast("Légende enregistrée ✓"); LBE.rafraichir(); } },
    });
  }

  /* ---------- Statistiques ---------- */
  function rendreStats(el) {
    const st = [...S().stats].sort((a, b) => (a.date > b.date ? 1 : -1));
    const dates = [...new Set(st.map((s) => s.date))];
    const serie = (pf, k) => dates.map((d) => { const x = st.find((s) => s.date === d && s.plateforme === pf); return x ? Number(x[k]) || 0 : null; });
    const combler = (v) => { let last = 0; return v.map((x) => (x == null ? last : (last = x))); };
    const dernier = (pf) => st.filter((s) => s.plateforme === pf).pop();
    const ilYa = (pf, j) => st.filter((s) => s.plateforme === pf && s.date <= U.ajouterJours(U.aujourdhui(), -j)).pop();
    const kpi = (pf, cls) => { const d = dernier(pf), a = ilYa(pf, 28); const diff = d && a ? d.abonnes - a.abonnes : 0; return '<div class="card kpi ' + cls + '"><div class="label">Abonnés ' + pf + '</div><div class="valeur">' + (d ? f.nb(d.abonnes) : "—") + '</div><div class="sous">' + (diff ? '<span class="tendance ' + (diff > 0 ? "up" : "down") + '">' + (diff > 0 ? "+" : "") + f.nb(diff) + "</span> sur 4 semaines" : "&nbsp;") + "</div></div>"; };
    const depuis = U.ajouterJours(U.aujourdhui(), -30);
    const msg30 = st.filter((s) => s.date > depuis).reduce((t, s) => t + (Number(s.messages) || 0), 0);
    const cmd30 = S().commandes.filter((c) => !c.annulee && c.date > depuis).length;
    const METRIQUES = [["abonnes", "Abonnés"], ["vues", "Vues"], ["likes", "Likes"], ["messages", "Messages WhatsApp"]];
    el.innerHTML = '<div class="row-flex mb"><p class="doux" style="margin:0;flex:1">Relevez vos chiffres une fois par semaine (le même jour) pour suivre votre progression.</p><button class="btn sable" id="add">' + icon("plus") + " Saisir des statistiques</button></div>" +
      '<div class="grid g4 mb">' + kpi("TikTok", "") + kpi("Instagram", "rose") +
      '<div class="card kpi sable"><div class="label">Messages WhatsApp (30 j)</div><div class="valeur">' + f.nb(msg30) + '</div><div class="sous">issus des réseaux</div></div>' +
      '<div class="card kpi"><div class="label">Taux de conversion</div><div class="valeur">' + (msg30 ? f.pct(cmd30 / msg30) : "—") + '</div><div class="sous">' + cmd30 + " commande(s) / " + msg30 + " messages</div></div></div>" +
      '<div class="card mb"><div class="card-head"><h3>' + icon("compta") + ' Évolution</h3><nav class="tabs" style="margin:0">' + METRIQUES.map(([k, l]) => '<a href="#" data-m="' + k + '" class="' + (k === metrique ? "actif" : "") + '">' + l + "</a>").join("") + "</nav></div>" +
      (dates.length ? charts.courbes(dates.map((d) => f.date(d).replace(/ \d{4}$/, "")), [{ nom: "TikTok", couleur: "#2b3743", valeurs: combler(serie("TikTok", metrique)) }, { nom: "Instagram", couleur: "#d98f8f", valeurs: combler(serie("Instagram", metrique)) }]) : ui.vide("Pas encore de statistiques.")) + "</div>" +
      '<div class="card"><h3>Relevés</h3>' + (st.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Plateforme</th><th class="r">Vues</th><th class="r">Likes</th><th class="r">Abonnés</th><th class="r">Msg</th><th></th></tr></thead><tbody>' + st.slice().reverse().map((s) => "<tr><td>" + f.date(s.date) + "</td><td>" + esc(s.plateforme) + '</td><td class="r">' + f.nb(s.vues) + '</td><td class="r">' + f.nb(s.likes) + '</td><td class="r">' + f.nb(s.abonnes) + '</td><td class="r">' + f.nb(s.messages) + '</td><td class="r"><button class="btn icone petit fantome" data-del="' + s.id + '">' + icon("poubelle") + "</button></td></tr>").join("") + "</tbody></table></div>" : ui.vide("Aucun relevé.")) + "</div>";
    el.querySelector("#add").onclick = () => saisieStats();
    el.querySelectorAll("[data-m]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); metrique = a.dataset.m; rendreStats(el); }));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => ui.confirmer("Supprimer ce relevé ?", () => { S().stats = S().stats.filter((s) => s.id !== b.dataset.del); LBE.store.sauver(); LBE.rafraichir(); })));
  }
  function saisieStats() {
    const bloc = (pf) => '<div class="card nacre" style="padding:14px"><b>' + pf + '</b><div class="g2 grid mt">' + ["vues", "likes", "abonnes", "messages"].map((k) => ui.champ({ vues: "Vues (semaine)", likes: "Likes", abonnes: "Abonnés (total)", messages: "Messages WhatsApp" }[k], pf + "_" + k, "", { type: "number", step: "1" })).join("") + "</div></div>";
    ui.modale({
      titre: "Saisir les statistiques", large: true,
      corps: ui.champ("Date du relevé", "date", U.aujourdhui(), { type: "date" }) + bloc("TikTok") + bloc("Instagram") + '<p class="aide">Laissez vide une plateforme si vous ne la relevez pas.</p>',
      soumettre: { action: (v) => {
        let n = 0;
        for (const pf of ["TikTok", "Instagram"]) {
          if (["vues", "likes", "abonnes", "messages"].every((k) => v[pf + "_" + k] === "")) continue;
          S().stats.push({ id: U.uid(), date: v.date, plateforme: pf, vues: v[pf + "_vues"] || 0, likes: v[pf + "_likes"] || 0, abonnes: v[pf + "_abonnes"] || 0, messages: v[pf + "_messages"] || 0 }); n++;
        }
        if (!n) { ui.toast("Saisissez au moins une valeur.", true); return false; }
        LBE.store.sauver(); ui.toast("Statistiques enregistrées ✓"); LBE.rafraichir();
      } },
    });
  }

  LBE.modules.social = { rendre };
  LBE.social = { fichePub };
})();
