/* =========================================================
   Module 1 — Tableau de bord
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, charts, q } = LBE;
  const S = () => LBE.store.d;
  const U = LBE.util;

  function rendre(el) {
    const d = S(), s = d.settings;
    const auj = U.aujourdhui();
    const moisC = U.mois(auj);
    const moisP = U.mois(U.isoDate(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1)));
    const rec = calc.recettes(), dep = calc.depenses();
    const b = calc.bilanMois(moisC, rec, dep), bp = calc.bilanMois(moisP, rec, dep);
    const actives = d.commandes.filter((c) => !c.annulee);
    const st = (c) => calc.statutCommande(c).cle;
    const enAttente = actives.filter((c) => st(c) === "paiement");
    const aPreparer = actives.filter((c) => st(c) === "a_preparer");
    const expediees = actives.filter((c) => st(c) === "expediee");
    const montantAttente = enAttente.reduce((t, c) => t + calc.totalCommande(c).total, 0);
    const etat = calc.etatStocks();
    const alertes = etat.filter((e) => e.niveau === "bas" || e.niveau === "rupture").sort((a, b) => a.stock - b.stock);
    const pubs = d.publications.filter((p) => p.date >= auj && p.statut !== "publie").sort((a, b) => (a.date > b.date ? 1 : -1)).slice(0, 5);
    const evol = bp.recettes ? (b.recettes - bp.recettes) / bp.recettes : null;
    const objectif = Number(s.objectifMensuel) || 0;
    const pctObj = objectif ? Math.min(1, b.recettes / objectif) : 0;
    const jourMois = new Date().getDate(), joursDansMois = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const projection = jourMois ? (b.recettes / jourMois) * joursDansMois : 0;

    // Relances
    const relances = [];
    enAttente.forEach((c) => { const j = U.ecartJours(c.date, auj); if (j >= s.relancePaiementJours) relances.push({ c, txt: "Paiement en attente depuis " + j + " jours", msg: "m_paie", ton: "" }); });
    aPreparer.forEach((c) => { const j = U.ecartJours(c.paiement.date || c.date, auj); if (j >= s.relanceExpeditionJours) relances.push({ c, txt: "Payée il y a " + j + " jours, pas encore expédiée", ton: "danger" }); });
    expediees.forEach((c) => { const j = U.ecartJours(c.expedition.date || c.date, auj); if (j >= 6) relances.push({ c, txt: "Expédiée il y a " + j + " jours : livrée ?", ton: "info" }); });
    // Produits revenus en stock avec des inscrites
    const aPrevenir = etat.filter((e) => e.attente && (e.niveau === "ok" || e.niveau === "bas") && e.stock > 0);

    // Top produits 30 jours
    const depuis = U.ajouterJours(auj, -30);
    const ventes30 = actives.filter((c) => c.date > depuis);
    const top = {};
    ventes30.forEach((c) => c.lignes.forEach((l) => (top[l.produitId] = (top[l.produitId] || 0) + Number(l.qte))));
    const topListe = Object.entries(top).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const maxTop = topListe.length ? topListe[0][1] : 1;
    const payees30 = ventes30.filter((c) => c.paiement.statut === "recu");
    const panier = payees30.length ? payees30.reduce((t, c) => t + calc.totalCommande(c).total, 0) / payees30.length : 0;
    // Conversion
    const msg30 = d.stats.filter((x) => x.date > depuis).reduce((t, x) => t + (Number(x.messages) || 0), 0);
    // Clientes fidèles
    const fid = d.clientes.map((c) => ({ c, n: actives.filter((x) => x.clienteId === c.id).length, t: actives.filter((x) => x.clienteId === c.id && x.paiement.statut === "recu").reduce((t, x) => t + calc.totalCommande(x).total, 0) })).filter((x) => x.n).sort((a, b) => b.t - a.t).slice(0, 3);
    const ms = calc.derniersMois(6);
    const bil = ms.map((m) => calc.bilanMois(m, rec, dep));

    const heure = new Date().getHours();
    const salut = heure < 18 ? "Bonjour" : "Bonsoir";
    const dateLongue = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });

    el.innerHTML =
      (LBE.store.aDesExemples() ? '<div class="demo-banner"><span style="flex:1">✨ <b>Données d\'exemple fictives</b> affichées pour découvrir la plateforme.</span><button class="btn petit" data-act="effacer-demo">' + icon("poubelle") + " Effacer les exemples</button></div>" : "") +
      '<div class="page-head"><div><div class="sur-titre" style="display:block">' + esc(dateLongue) + '</div><h1 style="display:block">' + salut + " ✨</h1></div>" +
      '<div class="actions"><button class="btn primaire" data-act="cmd">' + icon("plus") + ' Commande</button><button class="btn" data-act="arr">' + icon("avion") + ' Arrivage</button><button class="btn" data-act="dep">' + icon("euro") + ' Dépense</button><a class="btn sable" href="#/studio">' + icon("studio") + " Visuel</a><button class=\"btn\" data-act=\"saisie\">✨ Saisie Claude</button></div></div>" +

      '<div class="grid g4 mb">' +
      '<div class="card kpi"><div class="label">CA du mois</div><div class="valeur">' + f.euro(b.recettes) + '</div><div class="sous">' + (evol != null ? '<span class="tendance ' + (evol >= 0 ? "up" : "down") + '">' + (evol >= 0 ? "▲ " : "▼ ") + f.pct(Math.abs(evol)) + "</span> vs " + f.MOIS[Number(moisP.slice(5)) - 1] : b.nbVentes + " vente(s)") + "</div></div>" +
      '<div class="card kpi sable"><div class="label">Bénéfice du mois</div><div class="valeur" style="color:' + (b.benefice < 0 ? "var(--danger)" : "var(--encre)") + '">' + f.euro(b.benefice) + '</div><div class="sous">marge sur ventes : ' + f.euro(b.margeVentes) + "</div></div>" +
      '<a class="card kpi rose" href="#/commandes" style="text-decoration:none"><div class="label">Commandes en cours</div><div class="valeur">' + (enAttente.length + aPreparer.length + expediees.length) + '</div><div class="sous">' + aPreparer.length + " à préparer · " + expediees.length + " en route</div></a>" +
      '<a class="card kpi" href="#/commandes" style="text-decoration:none"><div class="label">Paiements en attente</div><div class="valeur">' + f.euro(montantAttente) + '</div><div class="sous">' + enAttente.length + " commande(s)</div></a></div>" +

      '<div class="grid g3">' +
      // Objectif
      '<div class="card nacre"><h3>' + icon("etoile") + " Objectif du mois</h3>" + (objectif ? '<div class="row-flex" style="justify-content:space-between;align-items:baseline"><span style="font-family:var(--titre);font-size:1.8rem;font-weight:600;color:var(--encre)">' + f.pct(pctObj) + '</span><span class="doux">' + f.euro(b.recettes) + " / " + f.euro(objectif) + '</span></div><div class="progress"><span style="width:' + pctObj * 100 + '%"></span></div><p class="aide mt">À ce rythme : <b>' + f.euro(projection) + "</b> d'ici la fin du mois" + (projection >= objectif ? " 🎉 objectif atteint !" : " (il manque " + f.euro(Math.max(0, objectif - projection)) + ").") + "</p>" : '<p class="doux">Fixez un objectif dans les paramètres.</p>') +
      '<div class="separateur"></div><div class="recap" style="background:transparent;padding:0"><div class="l"><span>Panier moyen (30 j)</span><b>' + f.euro(panier) + '</b></div><div class="l"><span>Messages → commandes (30 j)</span><b>' + (msg30 ? f.pct(ventes30.length / msg30) : "—") + "</b></div></div></div>" +
      // À faire
      '<div class="card span2"><div class="card-head"><h3>' + icon("check") + ' À faire</h3><span class="badge ' + (relances.length + aPrevenir.length ? "rose" : "ok") + '">' + (relances.length + aPrevenir.length || "Tout est à jour") + "</span></div>" +
      (relances.length + aPrevenir.length ? '<div class="rows">' +
        relances.map((r) => { const cl = q.cliente(r.c.clienteId); return '<div class="rowi"><div class="avatar">' + esc(f.initiales(cl ? cl.nom : "?")) + '</div><div class="principal"><div class="titre">' + esc(cl ? cl.nom : "?") + " · " + esc(r.c.numero) + '</div><div class="meta">' + r.txt + "</div></div>" + (r.msg ? '<button class="btn petit sable" data-relance="' + r.c.id + '">Relancer</button>' : "") + '<a class="btn petit" href="#/commandes/fiche/' + r.c.id + '">Ouvrir</a></div>'; }).join("") +
        aPrevenir.map((e) => '<div class="rowi">' + ui.vignette(e.p) + '<div class="principal"><div class="titre">' + esc(e.p.nom) + ' est disponible</div><div class="meta">' + e.attente + " cliente(s) à prévenir</div></div><a class=\"btn petit whatsapp\" href=\"#/stocks/attente\">" + icon("whatsapp") + " Prévenir</a></div>").join("") + "</div>"
        : ui.vide("Aucune relance nécessaire. Belle journée !")) + "</div>" +

      // Alertes stock
      '<div class="card"><div class="card-head"><h3>' + icon("alerte") + ' Alertes stock</h3><a class="btn petit" href="#/stocks">Stocks</a></div>' +
      (alertes.length ? '<div class="rows">' + alertes.slice(0, 6).map((e) => '<div class="rowi">' + ui.vignette(e.p) + '<div class="principal"><div class="titre">' + esc(e.p.nom) + '</div><div class="meta">seuil ' + e.seuil + (e.attente ? " · " + e.attente + " en attente" : "") + "</div></div>" + ui.badgeStock(e.niveau, e.stock) + "</div>").join("") + "</div>" : ui.vide("Tous les stocks sont au-dessus du seuil.")) + "</div>" +
      // Publications
      '<div class="card"><div class="card-head"><h3>' + icon("social") + ' Prochaines publications</h3><a class="btn petit" href="#/social">Calendrier</a></div>' +
      (pubs.length ? '<div class="rows">' + pubs.map((p) => '<div class="rowi"><div class="principal"><div class="titre">' + esc(p.titre) + '</div><div class="meta">' + f.dateCourte(p.date) + " · " + esc(p.plateforme) + '</div></div><span class="badge ' + (p.statut === "a_tourner" ? "attente" : "nodot") + '">' + (p.statut === "a_tourner" ? "À tourner" : "Idée") + "</span></div>").join("") + "</div>" : ui.vide("Aucune publication prévue.")) + "</div>" +
      // Top produits
      '<div class="card"><div class="card-head"><h3>' + icon("etoile") + " Meilleures ventes (30 j)</h3></div>" +
      (topListe.length ? topListe.map(([pid, n]) => { const p = q.produit(pid); return '<div style="margin-bottom:10px"><div class="row-flex" style="justify-content:space-between;font-size:.9rem"><span>' + esc(p ? p.nom : "?") + "</span><b>" + n + '</b></div><div class="progress" style="margin-top:4px;height:6px"><span style="width:' + (n / maxTop) * 100 + '%"></span></div></div>'; }).join("") : ui.vide("Pas encore de ventes.")) + "</div>" +
      // CA 6 mois
      '<div class="card span2"><div class="card-head"><h3>' + icon("compta") + ' Chiffre d\'affaires & bénéfice</h3><a class="btn petit" href="#/compta">Comptabilité</a></div>' +
      charts.barres(ms.map(f.moisCourt), [{ nom: "CA", couleur: "#5f8eac", valeurs: bil.map((x) => x.recettes) }, { nom: "Bénéfice", couleur: "#c9a97a", valeurs: bil.map((x) => x.benefice) }], { h: 210, format: f.euro }) + "</div>" +
      // Clientes fidèles
      '<div class="card"><div class="card-head"><h3>' + icon("clientes") + ' Meilleures clientes</h3><a class="btn petit" href="#/commandes/clientes">Toutes</a></div>' +
      (fid.length ? '<div class="rows">' + fid.map((x) => '<a class="rowi cliquable" style="text-decoration:none;color:inherit" href="#/commandes/cliente/' + x.c.id + '"><div class="avatar">' + esc(f.initiales(x.c.nom)) + '</div><div class="principal"><div class="titre">' + esc(x.c.nom) + '</div><div class="meta">' + x.n + " commande(s)</div></div><span class=\"montant\">" + f.euro(x.t) + "</span></a>").join("") + "</div>" : ui.vide("Pas encore de clientes.")) + "</div>" +
      "</div>";

    const act = (k, fn) => el.querySelectorAll('[data-act="' + k + '"]').forEach((b) => (b.onclick = fn));
    act("cmd", () => LBE.commandes.ficheCommande(null));
    act("arr", () => LBE.stocks.ficheArrivage(null));
    act("dep", () => LBE.compta.ficheDepense(null));
    act("saisie", () => LBE.saisie.ouvrir());
    act("effacer-demo", () => ui.confirmer("Effacer toutes les données d'exemple ? Vos propres saisies et vos réglages sont conservés.", () => { LBE.store.effacerExemples(); ui.toast("Exemples effacés ✓"); LBE.rafraichir(); }, "Effacer"));
    el.querySelectorAll("[data-relance]").forEach((b) => (b.onclick = () => LBE.commandes.proposerMessage(q.commande(b.dataset.relance), "m_paie")));
  }

  LBE.modules.dashboard = { rendre };
})();
