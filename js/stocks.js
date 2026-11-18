/* =========================================================
   Module 3 — Stocks : état, arrivages d'Abidjan, mouvements,
   liste d'attente « alerte disponibilité »
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, q } = LBE;
  const S = () => LBE.store.d;
  let filtreMvt = "";

  function rendre(el, params) {
    const onglet = params[0] || "etat";
    el.innerHTML = ui.entete("Module 3", "Stocks",
      '<button class="btn" data-act="ajust">' + icon("crayon") + " Ajuster</button>" +
      '<button class="btn primaire" data-act="arrivage">' + icon("avion") + " Nouvel arrivage</button>") +
      ui.tabs("stocks", [["etat", "État des stocks"], ["arrivages", "Arrivages"], ["mouvements", "Mouvements"], ["attente", "Liste d'attente"]], onglet) +
      '<div id="st-contenu"></div>';
    el.querySelector('[data-act="arrivage"]').onclick = () => ficheArrivage(null);
    el.querySelector('[data-act="ajust"]').onclick = () => ajustement();
    const c = el.querySelector("#st-contenu");
    ({ arrivages: rendreArrivages, mouvements: rendreMouvements, attente: rendreAttente }[onglet] || rendreEtat)(c);
  }

  /* ---------- État ---------- */
  function rendreEtat(el) {
    const etat = calc.etatStocks();
    const alertes = etat.filter((e) => e.niveau === "bas" || e.niveau === "rupture");
    const valeur = etat.filter((e) => !q.estCompose(e.p)).reduce((s, e) => s + Math.max(0, e.stock) * calc.coutRevient(e.p), 0);
    const unites = etat.filter((e) => !q.estCompose(e.p)).reduce((s, e) => s + Math.max(0, e.stock), 0);
    let h = '<div class="grid g3 mb">' +
      '<div class="card kpi"><div class="label">Pièces en stock</div><div class="valeur">' + f.nb(unites) + '</div><div class="sous">produits simples</div></div>' +
      '<div class="card kpi sable"><div class="label">Valeur du stock</div><div class="valeur">' + f.euro(valeur) + '</div><div class="sous">au coût de revient</div></div>' +
      '<div class="card kpi rose"><div class="label">Alertes</div><div class="valeur">' + alertes.length + '</div><div class="sous">produit(s) sous le seuil</div></div></div>';
    if (alertes.length) h += '<div class="card mb"><h3>' + icon("alerte") + " À surveiller</h3>" + alertes.map((e) => '<div class="alerte-ligne ' + (e.niveau === "rupture" ? "danger" : "") + '">' + icon("alerte") + "<span><b>" + esc(e.p.nom) + "</b> — " + (e.niveau === "rupture" ? "en rupture" : "plus que " + e.stock + " (seuil " + e.seuil + ")") + (e.attente ? " · " + e.attente + " cliente(s) en attente" : "") + "</span></div>").join("") + "</div>";
    for (const cat of S().lists.categoriesProduits) {
      const items = etat.filter((e) => e.p.categorie === cat.id);
      if (!items.length) continue;
      h += '<div class="card mb"><div class="card-head"><h3>' + esc(cat.nom) + '</h3><span class="doux" style="font-size:.82rem">' + (cat.compose ? "stock calculé selon les composants" : "seuil de sécurité : " + cat.seuil) + '</span></div><div class="rows">' +
        items.map((e) => '<div class="rowi">' + ui.vignette(e.p) + '<div class="principal"><div class="titre">' + esc(e.p.nom) + '</div><div class="meta">' + ui.badgeStock(e.niveau) + (e.attente ? ' <span class="badge rose nodot">' + e.attente + " en attente</span>" : "") + '</div></div><div class="droite"><span class="montant" style="font-size:1.35rem;font-family:var(--titre)">' + e.stock + '</span><span class="doux" style="font-size:.75rem">seuil ' + e.seuil + "</span></div>" +
          (q.estCompose(e.p) ? "" : '<button class="btn icone petit" data-aj="' + e.p.id + '" title="Ajuster">' + icon("crayon") + "</button>") + "</div>").join("") + "</div></div>";
    }
    el.innerHTML = h;
    el.querySelectorAll("[data-aj]").forEach((b) => (b.onclick = () => ajustement(b.dataset.aj)));
  }

  function ajustement(produitId) {
    const simples = q.produitsSimples();
    ui.modale({
      titre: "Ajuster un stock",
      corps: '<p class="doux">Pour une casse, un cadeau, une erreur de comptage ou un stock de départ. Utilisez un nombre négatif pour retirer.</p>' +
        ui.champ("Produit", "produitId", produitId || (simples[0] && simples[0].id), { type: "select", options: simples.map((p) => [p.id, p.nom + " (stock " + calc.stock(p) + ")"]) }) +
        '<div class="g2 grid">' + ui.champ("Quantité (+ / −)", "qte", "", { type: "number", step: "1", requis: true, placeholder: "ex. -1 ou 10" }) + ui.champ("Date", "date", LBE.util.aujourdhui(), { type: "date" }) + "</div>" +
        ui.champ("Motif", "motif", "", { placeholder: "Casse, cadeau influenceuse, stock initial…" }),
      soumettre: { label: "Valider", action: (v) => {
        if (!v.qte) { ui.toast("Indiquez une quantité.", true); return false; }
        S().ajustements.push({ id: LBE.util.uid(), date: v.date, produitId: v.produitId, qte: v.qte, motif: v.motif });
        LBE.store.sauver(); ui.toast("Stock ajusté ✓"); LBE.rafraichir();
      } },
    });
  }

  /* ---------- Arrivages ---------- */
  function rendreArrivages(el) {
    const arr = [...S().arrivages].sort((a, b) => (a.date < b.date ? 1 : -1));
    const s = S().settings;
    el.innerHTML = '<div class="alerte-ligne info">' + icon("info") + "<span>Le fret (" + f.euro(s.fretParKg) + "/kg) et le transport au marché d'Adjamé (" + f.euro(s.transportAdjame) + " A/R) sont répartis automatiquement sur chaque produit selon son poids : le coût de revient est mis à jour tout seul.</span></div>" +
      (arr.length ? '<div class="stack">' + arr.map((a) => {
        const d = calc.detailArrivage(a);
        return '<div class="card cliquable" data-arr="' + a.id + '" style="cursor:pointer"><div class="card-head"><div><h3>' + icon("avion") + " " + esc(a.libelle || "Arrivage") + '</h3><div class="doux" style="font-size:.85rem">' + f.date(a.date) + " · " + (a.poidsKg || 0).toString().replace(".", ",") + " kg · " + d.qteTotale + ' pièces</div></div><div style="text-align:right"><div class="montant" style="font-family:var(--titre);font-size:1.5rem;font-weight:600">' + f.euro(d.total) + '</div><div class="doux" style="font-size:.8rem">dont fret + transport ' + f.euro(d.fraisCommuns) + "</div></div></div>" +
          '<div class="chips">' + d.lignes.map((l) => '<span class="chip" style="padding-right:12px">' + l.qte + " × " + esc(l.produit ? l.produit.nom : "?") + ' <span class="doux">· ' + f.euro(l.coutUnitaire) + "/u</span></span>").join("") + "</div></div>";
      }).join("") + "</div>" : '<div class="card mt">' + ui.vide("Aucun arrivage enregistré.") + "</div>");
    el.querySelectorAll("[data-arr]").forEach((c) => (c.onclick = () => ficheArrivage(q.arrivage(c.dataset.arr))));
  }

  function ficheArrivage(a) {
    const nouveau = !a;
    const s = S().settings;
    a = a || { id: "", date: LBE.util.aujourdhui(), libelle: "Arrivage n°" + (S().arrivages.length + 1), poidsKg: "", fret: "", transport: s.transportAdjame, note: "", lignes: [] };
    const simples = q.produitsSimples().concat(S().produits.filter((p) => p.statut === "archive" && !q.estCompose(p)));
    const opts = simples.map((p) => '<option value="' + p.id + '">' + esc(p.nom) + "</option>").join("");
    const ligne = (l) => '<div class="ligne-edit" data-ligne><select data-k="produitId">' + opts.replace('value="' + l.produitId + '"', 'value="' + l.produitId + '" selected') + '</select><input type="number" data-k="qte" min="1" step="1" value="' + (l.qte || "") + '" placeholder="Qté" inputmode="numeric"><input type="number" data-k="prixUnitaire" step="0.01" value="' + (l.prixUnitaire != null ? l.prixUnitaire : "") + '" placeholder="Achat €/u" inputmode="decimal"><button type="button" class="btn icone petit fantome" data-suppr>' + icon("fermer") + "</button></div>";
    const corps =
      '<div class="g2 grid">' + ui.champ("Date d'arrivée", "date", a.date, { type: "date", requis: true }) + ui.champ("Libellé", "libelle", a.libelle) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Poids total (kg)", "poidsKg", a.poidsKg, { type: "number", aide: "Fret estimé automatiquement à " + f.euro(s.fretParKg) + "/kg." }) + ui.champ("Coût du fret (€)", "fret", a.fret, { type: "number" }) + "</div>" +
      ui.champ("Transport marché d'Adjamé (€)", "transport", a.transport, { type: "number", aide: "Aller-retour (5 000 FCFA ≈ 7,62 €)." }) +
      '<div class="champ"><span>Produits reçus <small class="doux">(produit · quantité · prix d\'achat unitaire en €)</small></span><div class="lignes-edit" id="lignes">' + (a.lignes.length ? a.lignes : [{ produitId: simples[0] && simples[0].id }]).map(ligne).join("") + '</div><button type="button" class="btn petit mt" id="ajout-ligne">' + icon("plus") + " Ajouter un produit</button></div>" +
      ui.champ("Note", "note", a.note, { type: "textarea", placeholder: "Fournisseur, remarques sur la qualité…" }) +
      '<div id="recap-arr"></div>';
    ui.modale({
      titre: nouveau ? "Nouvel arrivage d'Abidjan" : a.libelle || "Arrivage", corps, large: true,
      supprimer: nouveau ? null : () => { S().arrivages = S().arrivages.filter((x) => x.id !== a.id); LBE.store.sauver(); ui.toast("Arrivage supprimé"); LBE.rafraichir(); },
      onOuvrir: (el) => {
        const zone = el.querySelector("#lignes");
        const fret = el.querySelector('[name="fret"]');
        let fretManuel = !nouveau && a.fret !== "";
        fret.addEventListener("input", () => (fretManuel = true));
        el.querySelector('[name="poidsKg"]').addEventListener("input", (e) => { if (!fretManuel && e.target.value) fret.value = (Number(e.target.value) * s.fretParKg).toFixed(2); });
        const lire = () => [...zone.querySelectorAll("[data-ligne]")].map((l) => ({ produitId: l.querySelector('[data-k="produitId"]').value, qte: Number(l.querySelector('[data-k="qte"]').value) || 0, prixUnitaire: Number(l.querySelector('[data-k="prixUnitaire"]').value) || 0 })).filter((l) => l.produitId && l.qte > 0);
        const maj = () => {
          const v = ui.valeurs(el.querySelector("form"));
          const d = calc.detailArrivage({ ...v, lignes: lire() });
          el.querySelector("#recap-arr").innerHTML = d.lignes.length ? '<div class="recap">' + d.lignes.map((l) => '<div class="l"><span>' + l.qte + " × " + esc(l.produit ? l.produit.nom : "?") + '</span><span class="num">' + f.euro(l.prixUnitaire) + " + " + f.euro(l.fraisUnitaires) + " frais = <b>" + f.euro(l.coutUnitaire) + "</b>/u</span></div>").join("") +
            '<div class="l total"><span>Total arrivage</span><b>' + f.euro(d.total) + '</b></div><div class="l doux"><span>Marchandise ' + f.euro(d.marchandise) + " · Fret + transport " + f.euro(d.fraisCommuns) + "</span><span>" + Math.round(d.poidsTotal) + " g déclarés</span></div></div>" : "";
        };
        el.querySelector("#ajout-ligne").onclick = () => {
          zone.insertAdjacentHTML("beforeend", ligne({ produitId: "" }));
          const sel = zone.lastElementChild.querySelector("select"); sel.selectedIndex = 0;
          const p = q.produit(sel.value); if (p) zone.lastElementChild.querySelector('[data-k="prixUnitaire"]').value = p.prixAchat || "";
          maj();
        };
        zone.addEventListener("change", (e) => {
          if (e.target.matches('select[data-k="produitId"]')) { const p = q.produit(e.target.value); const pu = e.target.closest("[data-ligne]").querySelector('[data-k="prixUnitaire"]'); if (p && !pu.value) pu.value = p.prixAchat || ""; }
        });
        zone.addEventListener("click", (e) => { const b = e.target.closest("[data-suppr]"); if (b) { b.closest("[data-ligne]").remove(); maj(); } });
        el.querySelector("form").addEventListener("input", maj);
        el.querySelector("form").addEventListener("change", maj);
        el._lire = lire;
        maj();
      },
      soumettre: { label: nouveau ? "Enregistrer l'arrivage" : "Enregistrer", action: (v, el) => {
        const lignes = el._lire();
        if (!lignes.length) { ui.toast("Ajoutez au moins un produit avec une quantité.", true); return false; }
        Object.assign(a, v, { lignes });
        if (v.fret === "" && v.poidsKg) a.fret = LBE.util.arrondi(v.poidsKg * s.fretParKg);
        if (nouveau) { a.id = LBE.util.uid(); S().arrivages.push(a); }
        LBE.store.sauver(); ui.toast("Arrivage enregistré : stocks et coûts mis à jour ✓"); LBE.rafraichir();
      } },
    });
  }

  /* ---------- Mouvements ---------- */
  function rendreMouvements(el) {
    let m = calc.mouvements();
    if (filtreMvt) m = m.filter((x) => x.produitId === filtreMvt);
    const simples = S().produits.filter((p) => !q.estCompose(p));
    el.innerHTML = '<div class="card"><div class="card-head"><h3>Entrées & sorties</h3><select id="f-mvt" style="max-width:260px"><option value="">Tous les produits</option>' + simples.map((p) => '<option value="' + p.id + '"' + (p.id === filtreMvt ? " selected" : "") + ">" + esc(p.nom) + "</option>").join("") + "</select></div>" +
      (m.length ? '<div class="rows">' + m.slice(0, 300).map((x) => { const p = q.produit(x.produitId); return '<div class="rowi"><div class="principal"><div class="titre">' + esc(p ? p.nom : "Produit supprimé") + '</div><div class="meta">' + f.date(x.date) + " · " + x.type + (x.ref ? " · " + esc(x.ref) : "") + '</div></div><div class="droite"><span class="montant" style="color:' + (x.qte > 0 ? "var(--succes)" : "var(--danger)") + '">' + (x.qte > 0 ? "+" : "") + x.qte + "</span></div>" + (x.id ? '<button class="btn icone petit fantome" data-del-aj="' + x.id + '" title="Supprimer">' + icon("poubelle") + "</button>" : "") + "</div>"; }).join("") + "</div>" : ui.vide("Aucun mouvement.")) + "</div>";
    el.querySelector("#f-mvt").onchange = (e) => { filtreMvt = e.target.value; rendreMouvements(el); };
    el.querySelectorAll("[data-del-aj]").forEach((b) => (b.onclick = () => ui.confirmer("Supprimer cet ajustement ?", () => { S().ajustements = S().ajustements.filter((j) => j.id !== b.dataset.delAj); LBE.store.sauver(); LBE.rafraichir(); })));
  }

  /* ---------- Liste d'attente ---------- */
  function rendreAttente(el) {
    const etat = calc.etatStocks();
    const groupes = etat.map((e) => ({ ...e, inscrites: S().attente.filter((a) => a.produitId === e.p.id) })).filter((g) => g.inscrites.length).sort((a, b) => b.attente - a.attente);
    const priorite = (g) => g.attente * (g.niveau === "rupture" || g.niveau === "bientot" ? 2 : g.niveau === "bas" ? 1.5 : 0.5);
    const reassort = groupes.filter((g) => g.attente && g.niveau !== "ok").sort((a, b) => priorite(b) - priorite(a));
    el.innerHTML =
      '<div class="row-flex mb"><p class="doux" style="margin:0;flex:1">Notez ici les clientes qui demandent à être prévenues : vous saurez quoi réassortir en priorité, et vous les prévenez en un clic.</p><button class="btn primaire" id="ins">' + icon("plus") + " Inscrire une cliente</button></div>" +
      (reassort.length ? '<div class="card nacre mb"><h3>' + icon("etoile") + " Réassort conseillé</h3>" + reassort.map((g, i) => '<div class="rowi"><div class="avatar">' + (i + 1) + '</div><div class="principal"><div class="titre">' + esc(g.p.nom) + '</div><div class="meta">' + g.attente + " inscrite(s) · " + (g.niveau === "bientot" ? "pas encore lancé" : "stock " + g.stock) + "</div></div>" + ui.badgeStock(g.niveau, g.stock) + "</div>").join("") + "</div>" : "") +
      (groupes.length ? groupes.map((g) => '<div class="card mb"><div class="card-head"><h3>' + esc(g.p.nom) + '</h3><div class="row-flex"><span class="badge rose nodot">' + g.attente + " en attente</span>" + ui.badgeStock(g.niveau, g.stock) + '</div></div><div class="rows">' +
        g.inscrites.map((a) => '<div class="rowi"><div class="avatar">' + esc(f.initiales(a.nom)) + '</div><div class="principal"><div class="titre">' + esc(a.nom) + '</div><div class="meta">' + esc(a.telephone || "") + " · inscrite le " + f.date(a.date) + "</div></div>" +
          (a.prevenue ? '<span class="badge ok">Prévenue</span>' : '<button class="btn petit whatsapp" data-prev="' + a.id + '">' + icon("whatsapp") + " Prévenir</button>") +
          '<button class="btn icone petit fantome" data-del="' + a.id + '">' + icon("poubelle") + "</button></div>").join("") + "</div></div>").join("")
        : '<div class="card">' + ui.vide("Personne en liste d'attente pour le moment.") + "</div>");
    el.querySelector("#ins").onclick = () => inscrire();
    el.querySelectorAll("[data-prev]").forEach((b) => (b.onclick = () => {
      const a = S().attente.find((x) => x.id === b.dataset.prev);
      const p = q.produit(a.produitId);
      const texte = LBE.messages.remplir("m_dispo", { prenom: a.nom.split(" ")[0], produit: p ? p.nom : "" });
      window.open(ui.lienWhatsApp(a.telephone, texte), "_blank");
      a.prevenue = true; LBE.store.sauver(); LBE.rafraichir();
    }));
    el.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => { S().attente = S().attente.filter((x) => x.id !== b.dataset.del); LBE.store.sauver(); LBE.rafraichir(); }));
  }

  function inscrire(produitId) {
    const prods = q.produitsActifs();
    ui.modale({
      titre: "Alerte disponibilité",
      corps: ui.champ("Produit souhaité", "produitId", produitId || "", { type: "select", options: prods.map((p) => [p.id, p.nom]) }) +
        '<div class="g2 grid">' + ui.champ("Prénom / nom", "nom", "", { requis: true }) + ui.champ("Téléphone WhatsApp", "telephone", "", { type: "tel", placeholder: "+33 6 …" }) + "</div>",
      soumettre: { label: "Inscrire", action: (v) => { S().attente.push({ id: LBE.util.uid(), date: LBE.util.aujourdhui(), prevenue: false, ...v }); LBE.store.sauver(); ui.toast("Cliente inscrite ✓"); LBE.rafraichir(); } },
    });
  }

  LBE.modules.stocks = { rendre };
  LBE.stocks = { inscrire, ficheArrivage };
})();
