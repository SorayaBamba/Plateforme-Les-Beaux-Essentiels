/* =========================================================
   Module 5 — Comptabilité : recettes, dépenses, bénéfice
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, charts } = LBE;
  const S = () => LBE.store.d;
  let moisSel = LBE.util.mois(LBE.util.aujourdhui());
  let periodeRec = "mois", catDep = "";

  function rendre(el, params) {
    const onglet = params[0] || "synthese";
    el.innerHTML = ui.entete("Module 5", "Comptabilité", '<button class="btn primaire" data-act="dep">' + icon("plus") + " Ajouter une dépense</button>") +
      ui.tabs("compta", [["synthese", "Synthèse"], ["recettes", "Livre des recettes"], ["depenses", "Dépenses"]], onglet) + '<div id="cp"></div>';
    el.querySelector('[data-act="dep"]').onclick = () => ficheDepense(null);
    const c = el.querySelector("#cp");
    ({ recettes: rendreRecettes, depenses: rendreDepenses }[onglet] || rendreSynthese)(c);
  }

  function selecteurMois(id) {
    const tous = new Set(calc.derniersMois(12));
    calc.recettes().forEach((r) => tous.add(LBE.util.mois(r.date)));
    calc.depenses().forEach((r) => tous.add(LBE.util.mois(r.date)));
    const liste = [...tous].filter(Boolean).sort().reverse();
    return '<select id="' + id + '" style="max-width:220px">' + liste.map((m) => '<option value="' + m + '"' + (m === moisSel ? " selected" : "") + ">" + f.mois(m) + "</option>").join("") + "</select>";
  }

  /* ---------- Synthèse ---------- */
  function rendreSynthese(el) {
    const rec = calc.recettes(), dep = calc.depenses();
    const b = calc.bilanMois(moisSel, rec, dep);
    const ms = calc.derniersMois(12);
    const bilans = ms.map((m) => calc.bilanMois(m, rec, dep));
    const depMois = dep.filter((d) => LBE.util.mois(d.date) === moisSel);
    const parCat = {};
    depMois.forEach((d) => (parCat[d.categorie] = (parCat[d.categorie] || 0) + d.montant));
    const items = Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([nom, valeur], i) => ({ nom, valeur, couleur: charts.COULEURS[i % charts.COULEURS.length] }));
    const annee = moisSel.slice(0, 4);
    const ytd = ms.filter((m) => m.startsWith(annee)).map((m) => calc.bilanMois(m, rec, dep)).reduce((a, x) => ({ r: a.r + x.recettes, d: a.d + x.depenses }), { r: 0, d: 0 });
    el.innerHTML =
      '<div class="row-flex mb"><span class="doux">Mois affiché</span>' + selecteurMois("mois-sel") + "</div>" +
      '<div class="grid g4 mb">' +
      '<div class="card kpi"><div class="label">Recettes</div><div class="valeur">' + f.euro(b.recettes) + '</div><div class="sous">' + b.nbVentes + " vente(s) encaissée(s)</div></div>" +
      '<div class="card kpi rose"><div class="label">Dépenses</div><div class="valeur">' + f.euro(b.depenses) + '</div><div class="sous">' + depMois.length + " ligne(s)</div></div>" +
      '<div class="card kpi sable"><div class="label">Bénéfice (trésorerie)</div><div class="valeur" style="color:' + (b.benefice < 0 ? "var(--danger)" : "var(--encre)") + '">' + f.euro(b.benefice) + '</div><div class="sous">recettes − dépenses</div></div>' +
      '<div class="card kpi"><div class="label">Marge sur ventes</div><div class="valeur">' + f.euro(b.margeVentes) + '</div><div class="sous">prix − coût de revient</div></div></div>' +
      '<div class="alerte-ligne info mb">' + icon("info") + "<span><b>Bénéfice (trésorerie)</b> = tout ce qui est entré moins tout ce qui est sorti ce mois-ci : un mois avec un gros arrivage peut être négatif. <b>Marge sur ventes</b> = ce que vous gagnez réellement sur chaque article vendu.</span></div>" +
      '<div class="grid g2"><div class="card span2"><div class="card-head"><h3>' + icon("compta") + " 12 derniers mois</h3></div>" +
      charts.barres(ms.map(f.moisCourt), [{ nom: "Recettes", couleur: "#5f8eac", valeurs: bilans.map((x) => x.recettes) }, { nom: "Dépenses", couleur: "#e2b4a6", valeurs: bilans.map((x) => x.depenses) }, { nom: "Bénéfice", couleur: "#c9a97a", valeurs: bilans.map((x) => x.benefice) }], { format: f.euro }) + "</div>" +
      '<div class="card"><h3>Dépenses par catégorie</h3>' + (items.length ? charts.anneau(items, { centre: f.euro(b.depenses).replace(/,\d\d/, ""), sousCentre: f.mois(moisSel) }) : ui.vide("Aucune dépense ce mois-ci.")) + "</div>" +
      '<div class="card"><h3>Année ' + annee + '</h3><div class="recap"><div class="l"><span>Recettes cumulées</span><b>' + f.euro(ytd.r) + '</b></div><div class="l"><span>Dépenses cumulées</span><b>' + f.euro(ytd.d) + '</b></div><div class="l total"><span>Bénéfice cumulé</span><b>' + f.euro(ytd.r - ytd.d) + "</b></div></div>" +
      '<div class="table-wrap mt"><table class="table"><thead><tr><th>Mois</th><th class="r">Recettes</th><th class="r">Dépenses</th><th class="r">Bénéfice</th></tr></thead><tbody>' +
      ms.slice().reverse().filter((m, i) => i < 6).map((m) => { const x = calc.bilanMois(m, rec, dep); return "<tr><td>" + f.mois(m) + '</td><td class="r">' + f.euro(x.recettes) + '</td><td class="r">' + f.euro(x.depenses) + '</td><td class="r" style="color:' + (x.benefice < 0 ? "var(--danger)" : "var(--succes)") + '">' + f.euro(x.benefice) + "</td></tr>"; }).join("") + "</tbody></table></div></div></div>";
    el.querySelector("#mois-sel").onchange = (e) => { moisSel = e.target.value; rendreSynthese(el); };
  }

  /* ---------- Livre des recettes ---------- */
  function rendreRecettes(el) {
    let rec = calc.recettes();
    if (periodeRec === "mois") rec = rec.filter((r) => LBE.util.mois(r.date) === moisSel);
    else if (periodeRec === "annee") rec = rec.filter((r) => r.date.slice(0, 4) === moisSel.slice(0, 4));
    const total = rec.reduce((s, r) => s + r.montant, 0);
    el.innerHTML = '<div class="row-flex mb"><select id="per" style="max-width:180px"><option value="mois"' + (periodeRec === "mois" ? " selected" : "") + '>Par mois</option><option value="annee"' + (periodeRec === "annee" ? " selected" : "") + '>Année entière</option><option value="tout"' + (periodeRec === "tout" ? " selected" : "") + ">Tout</option></select>" + (periodeRec !== "tout" ? selecteurMois("mois-rec") : "") + '<span class="spacer"></span><button class="btn sable" id="csv">' + icon("telecharger") + " Exporter en CSV</button></div>" +
      '<div class="card"><div class="card-head"><h3>Livre des recettes</h3><span class="montant" style="font-family:var(--titre);font-size:1.4rem;font-weight:600">' + f.euro(total) + "</span></div>" +
      (rec.length ? '<div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Réf.</th><th>Cliente</th><th class="masquer-mobile">Nature</th><th class="masquer-mobile">Paiement</th><th class="r">Montant</th></tr></thead><tbody>' +
        rec.map((r) => '<tr style="cursor:pointer" data-cmd="' + r.commandeId + '"><td style="white-space:nowrap">' + f.date(r.date) + "</td><td>" + esc(r.ref) + "</td><td>" + esc(r.cliente) + '</td><td class="masquer-mobile doux" style="font-size:.84rem">' + esc(r.nature) + '</td><td class="masquer-mobile">' + esc(r.moyen) + '</td><td class="r"><b>' + f.euro(r.montant) + "</b></td></tr>").join("") +
        '</tbody><tfoot><tr><td colspan="3">Total</td><td class="masquer-mobile"></td><td class="masquer-mobile"></td><td class="r">' + f.euro(total) + "</td></tr></tfoot></table></div>" : ui.vide("Aucune recette sur cette période.")) + "</div>";
    el.querySelector("#per").onchange = (e) => { periodeRec = e.target.value; rendreRecettes(el); };
    const m = el.querySelector("#mois-rec"); if (m) m.onchange = (e) => { moisSel = e.target.value; rendreRecettes(el); };
    el.querySelectorAll("[data-cmd]").forEach((r) => (r.onclick = () => LBE.aller("#/commandes/fiche/" + r.dataset.cmd)));
    el.querySelector("#csv").onclick = () => {
      const lignes = [["Date", "Référence", "Cliente", "Nature de la vente", "Montant TTC (€)", "dont frais de port (€)", "Mode de paiement"]].concat(rec.slice().reverse().map((r) => [r.date.split("-").reverse().join("/"), r.ref, r.cliente, r.nature, r.montant.toFixed(2).replace(".", ","), r.port.toFixed(2).replace(".", ","), r.moyen]));
      telechargerCSV(lignes, "livre-des-recettes-" + (periodeRec === "tout" ? "complet" : periodeRec === "annee" ? moisSel.slice(0, 4) : moisSel) + ".csv");
    };
  }

  function telechargerCSV(lignes, nom) {
    const csv = "﻿" + lignes.map((l) => l.map((c) => { const s = String(c == null ? "" : c); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = nom; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    ui.toast("Fichier CSV téléchargé ✓");
  }

  /* ---------- Dépenses ---------- */
  function rendreDepenses(el) {
    let dep = calc.depenses().filter((d) => LBE.util.mois(d.date) === moisSel);
    const cats = [...new Set(S().lists.categoriesDepenses.concat(dep.map((d) => d.categorie)))];
    if (catDep) dep = dep.filter((d) => d.categorie === catDep);
    const total = dep.reduce((s, d) => s + d.montant, 0);
    el.innerHTML = '<div class="row-flex mb">' + selecteurMois("mois-dep") + '<select id="cat-dep" style="max-width:220px"><option value="">Toutes catégories</option>' + cats.map((c) => '<option' + (c === catDep ? " selected" : "") + ">" + esc(c) + "</option>").join("") + '</select><span class="spacer"></span><button class="btn" id="csv-dep">' + icon("telecharger") + " CSV</button></div>" +
      '<div class="card"><div class="card-head"><h3>Dépenses de ' + f.mois(moisSel) + '</h3><span class="montant" style="font-family:var(--titre);font-size:1.4rem;font-weight:600">' + f.euro(total) + "</span></div>" +
      (dep.length ? '<div class="rows">' + dep.map((d) => '<div class="rowi ' + (d.source === "manuelle" ? "cliquable" : "") + '" data-dep="' + (d.source === "manuelle" ? d.id : "") + '"><div class="principal"><div class="titre">' + esc(d.libelle || d.categorie) + '</div><div class="meta">' + f.date(d.date) + " · " + esc(d.categorie) + (d.source !== "manuelle" ? ' · <span class="badge info nodot" style="font-size:.68rem">auto · ' + (d.source === "arrivage" ? "arrivage" : "expédition") + "</span>" : "") + '</div></div><span class="montant">' + f.euro(d.montant) + "</span></div>").join("") + "</div>" : ui.vide("Aucune dépense.")) + "</div>" +
      '<p class="aide mt">Les dépenses « auto » viennent des arrivages (marchandise, fret, transport) et des étiquettes Mondial Relay : modifiez-les depuis l\'arrivage ou la commande.</p>';
    el.querySelector("#mois-dep").onchange = (e) => { moisSel = e.target.value; rendreDepenses(el); };
    el.querySelector("#cat-dep").onchange = (e) => { catDep = e.target.value; rendreDepenses(el); };
    el.querySelectorAll("[data-dep]").forEach((r) => { if (r.dataset.dep) r.onclick = () => ficheDepense(S().depenses.find((x) => x.id === r.dataset.dep)); });
    el.querySelector("#csv-dep").onclick = () => telechargerCSV([["Date", "Catégorie", "Libellé", "Montant (€)", "Origine"]].concat(dep.slice().reverse().map((d) => [d.date.split("-").reverse().join("/"), d.categorie, d.libelle, d.montant.toFixed(2).replace(".", ","), d.source])), "depenses-" + moisSel + ".csv");
  }

  function ficheDepense(d) {
    const nouveau = !d;
    d = d || { id: "", date: LBE.util.aujourdhui(), categorie: S().lists.categoriesDepenses.find((c) => c === "Emballages") || S().lists.categoriesDepenses[0], libelle: "", montant: "" };
    ui.modale({
      titre: nouveau ? "Nouvelle dépense" : "Modifier la dépense",
      corps: '<div class="g2 grid">' + ui.champ("Date", "date", d.date, { type: "date", requis: true }) + ui.champ("Montant (€)", "montant", d.montant, { type: "number", requis: true }) + "</div>" +
        ui.champ("Catégorie", "categorie", d.categorie, { type: "select", options: S().lists.categoriesDepenses }) +
        ui.champ("Libellé", "libelle", d.libelle, { placeholder: "ex. Commande Shein : pochettes satin" }) +
        '<p class="aide">Les achats de marchandise, le fret et le transport sont ajoutés automatiquement quand vous saisissez un arrivage.</p>',
      supprimer: nouveau ? null : () => { S().depenses = S().depenses.filter((x) => x.id !== d.id); LBE.store.sauver(); LBE.rafraichir(); },
      soumettre: { action: (v) => { Object.assign(d, v); if (nouveau) { d.id = LBE.util.uid(); S().depenses.push(d); } moisSel = LBE.util.mois(d.date); LBE.store.sauver(); ui.toast("Dépense enregistrée ✓"); LBE.rafraichir(); } },
    });
  }

  LBE.modules.compta = { rendre };
  LBE.compta = { ficheDepense, telechargerCSV };
})();
