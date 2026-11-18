/* =========================================================
   Module 8 — Paramètres & sauvegarde
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon } = LBE;
  const S = () => LBE.store.d;

  const LISTES = [
    ["categoriesDepenses", "Catégories de dépenses"],
    ["moyensPaiement", "Moyens de paiement"],
    ["plateformes", "Plateformes"],
    ["typesContenu", "Types de contenu"],
  ];

  function rendre(el) {
    const s = S().settings;
    const taille = (() => { try { return (localStorage.getItem("lbe-donnees-v1") || "").length; } catch (e) { return 0; } })();
    el.innerHTML = ui.entete("Module 8", "Paramètres") +
      '<div class="grid g2">' +
      // Réglages chiffrés
      '<div class="card"><h3>' + icon("euro") + ' Frais & calculs</h3><form class="form" id="f-reglages">' +
      '<div class="g2 grid">' + ui.champ("Fret avion (€/kg)", "fretParKg", s.fretParKg, { type: "number" }) + ui.champ("Transport Adjamé A/R (€)", "transportAdjame", s.transportAdjame, { type: "number" }) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Emballage par défaut (€)", "emballageDefaut", s.emballageDefaut, { type: "number" }) + ui.champ("Marge cible (%)", "margeCible", s.margeCible, { type: "number", step: "1" }) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Frais de port facturés (€)", "fraisPortClient", s.fraisPortClient, { type: "number" }) + ui.champ("Coût étiquette Mondial Relay (€)", "coutEtiquette", s.coutEtiquette, { type: "number" }) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Objectif de CA mensuel (€)", "objectifMensuel", s.objectifMensuel, { type: "number", step: "1" }) + ui.champ("Seuil de stock par défaut", "seuilDefaut", s.seuilDefaut, { type: "number", step: "1" }) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Relance paiement après (jours)", "relancePaiementJours", s.relancePaiementJours, { type: "number", step: "1" }) + ui.champ("Alerte expédition après (jours)", "relanceExpeditionJours", s.relanceExpeditionJours, { type: "number", step: "1" }) + "</div>" +
      ui.champ("Lien de suivi des colis", "lienSuivi", s.lienSuivi, { aide: "{suivi} sera remplacé par le numéro de suivi." }) +
      '<button class="btn primaire" type="submit">' + icon("check") + " Enregistrer les réglages</button></form></div>" +
      // Catégories produits
      '<div class="card"><div class="card-head"><h3>' + icon("catalogue") + ' Catégories de produits</h3><button class="btn petit" id="add-cat">' + icon("plus") + " Ajouter</button></div>" +
      '<p class="aide">Seuil de sécurité = alerte quand le stock descend à ce niveau. « Composé » = mélanges et packs fabriqués à partir d\'autres produits.</p><div class="rows">' +
      S().lists.categoriesProduits.map((c) => '<div class="rowi cliquable" data-cat="' + c.id + '"><div class="principal"><div class="titre">' + esc(c.nom) + '</div><div class="meta">seuil ' + c.seuil + (c.baya ? " · baya" : "") + (c.compose ? " · composé" : "") + " · " + S().produits.filter((p) => p.categorie === c.id).length + " produit(s)</div></div>" + icon("crayon") + "</div>").join("") + "</div></div>" +
      // Listes
      LISTES.map(([k, titre]) => '<div class="card"><h3>' + esc(titre) + '</h3><div class="chips" data-liste="' + k + '">' + S().lists[k].map((v, i) => '<span class="chip">' + esc(v) + '<button type="button" data-suppr="' + i + '" aria-label="Retirer">×</button></span>').join("") + '</div><form class="row-flex mt" data-ajout="' + k + '"><input name="v" placeholder="Ajouter…" style="flex:1;min-width:140px"><button class="btn petit" type="submit">' + icon("plus") + " Ajouter</button></form></div>").join("") +
      // Saisie Claude
      '<div class="card span2"><h3>✨ Travailler avec Claude</h3><p>Dictez vos opérations à Claude dans la conversation : il vous renvoie un <b>code de saisie</b> à coller ici. Vous vérifiez l\'aperçu, puis vous validez.</p>' +
      '<div class="row-flex"><button class="btn primaire" id="sz-ouvrir">✨ Coller un code de saisie</button><button class="btn" id="sz-resume">' + icon("copier") + " Copier un résumé pour Claude</button></div>" +
      '<p class="aide mt">Le résumé (produits, stocks, clientes, commandes en cours) permet à Claude d\'utiliser exactement vos noms de produits et vos numéros de commande.</p></div>' +
      // Sauvegarde
      '<div class="card span2 nacre"><h3>' + icon("telecharger") + ' Sauvegarde de vos données</h3><p>Vos données sont enregistrées <b>uniquement dans ce navigateur</b>, sur cet appareil. Elles ne sont jamais envoyées sur Internet ni dans GitHub. <b>Exportez une sauvegarde chaque semaine</b> (et avant de changer de téléphone ou de vider le cache).</p>' +
      '<div class="row-flex"><button class="btn primaire" id="export">' + icon("telecharger") + ' Exporter (JSON)</button><label class="btn" style="cursor:pointer">' + icon("televerser") + ' Importer une sauvegarde<input type="file" id="import" accept="application/json,.json" hidden></label></div>' +
      '<p class="aide mt">Espace utilisé : ' + (taille / 1024).toFixed(0) + " Ko sur environ 5 000 Ko disponibles.</p>" +
      '<div class="separateur"></div><h3 style="font-size:1.1rem">Données d\'exemple</h3><div class="row-flex">' +
      (LBE.store.aDesExemples() ? '<button class="btn" id="eff-demo">' + icon("poubelle") + " Effacer les données d'exemple</button>" : '<button class="btn" id="recharger">' + icon("annuler") + " Recharger les exemples (efface tout)</button>") +
      '<button class="btn danger" id="tout">' + icon("poubelle") + " Tout effacer</button></div></div>" +
      "</div>";

    el.querySelector("#f-reglages").onsubmit = (e) => {
      e.preventDefault();
      const v = ui.valeurs(e.target);
      for (const [k, val] of Object.entries(v)) if (val !== "") s[k] = val;
      LBE.store.sauver(); ui.toast("Réglages enregistrés ✓"); LBE.rafraichir();
    };
    el.querySelector("#add-cat").onclick = () => ficheCategorie(null);
    el.querySelectorAll("[data-cat]").forEach((r) => (r.onclick = () => ficheCategorie(S().lists.categoriesProduits.find((c) => c.id === r.dataset.cat))));
    el.querySelectorAll("[data-liste]").forEach((z) => z.querySelectorAll("[data-suppr]").forEach((b) => (b.onclick = () => {
      const l = S().lists[z.dataset.liste];
      if (l.length <= 1) { ui.toast("Gardez au moins un élément.", true); return; }
      l.splice(Number(b.dataset.suppr), 1); LBE.store.sauver(); LBE.rafraichir();
    })));
    el.querySelectorAll("[data-ajout]").forEach((fm) => (fm.onsubmit = (e) => {
      e.preventDefault();
      const v = fm.v.value.trim(); if (!v) return;
      const l = S().lists[fm.dataset.ajout];
      if (!l.includes(v)) l.push(v);
      LBE.store.sauver(); LBE.rafraichir();
    }));
    el.querySelector("#sz-ouvrir").onclick = () => LBE.saisie.ouvrir();
    el.querySelector("#sz-resume").onclick = () => LBE.saisie.resume();
    el.querySelector("#export").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([LBE.store.exporter()], { type: "application/json" }));
      a.download = "les-beaux-essentiels-sauvegarde-" + LBE.util.aujourdhui() + ".json";
      document.body.appendChild(a); a.click(); a.remove();
      ui.toast("Sauvegarde téléchargée ✓");
    };
    el.querySelector("#import").onchange = (e) => {
      const file = e.target.files[0]; if (!file) return;
      const r = new FileReader();
      r.onload = () => ui.confirmer("Remplacer toutes les données actuelles par celles du fichier « " + file.name + " » ?", () => {
        try { LBE.store.importer(r.result); ui.toast("Sauvegarde importée ✓"); LBE.rafraichir(); }
        catch (err) { ui.toast(err.message || "Fichier illisible.", true); }
      }, "Importer");
      r.readAsText(file);
    };
    const b1 = el.querySelector("#eff-demo"); if (b1) b1.onclick = () => ui.confirmer("Effacer toutes les données d'exemple ? Vos propres saisies sont conservées.", () => { LBE.store.effacerExemples(); ui.toast("Exemples effacés ✓"); LBE.rafraichir(); }, "Effacer");
    const b2 = el.querySelector("#recharger"); if (b2) b2.onclick = () => ui.confirmer("Recharger les exemples ? TOUTES vos données actuelles seront remplacées.", () => { LBE.store.recharger(); LBE.rafraichir(); }, "Recharger");
    el.querySelector("#tout").onclick = () => ui.confirmer("Tout effacer (produits, commandes, clientes, compta…) ? Vos réglages et modèles de messages sont conservés. Pensez à exporter une sauvegarde avant !", () => { LBE.store.toutEffacer(); ui.toast("Données effacées"); LBE.rafraichir(); }, "Tout effacer");
  }

  function ficheCategorie(c) {
    const nouveau = !c;
    c = c || { id: "", nom: "", seuil: 5, baya: false, compose: false };
    ui.modale({
      titre: nouveau ? "Nouvelle catégorie" : "Modifier la catégorie",
      corps: ui.champ("Nom", "nom", c.nom, { requis: true }) + ui.champ("Seuil de sécurité", "seuil", c.seuil, { type: "number", step: "1" }) +
        '<label class="check"><input type="checkbox" name="baya"' + (c.baya ? " checked" : "") + "> C'est une catégorie de bayas (utilisée pour les suggestions de mélanges)</label>" +
        '<label class="check"><input type="checkbox" name="compose"' + (c.compose ? " checked" : "") + "> Produits composés (mélanges, packs)</label>",
      supprimer: nouveau ? null : () => {
        if (S().produits.some((p) => p.categorie === c.id)) { ui.toast("Des produits utilisent cette catégorie : déplacez-les d'abord.", true); return; }
        S().lists.categoriesProduits = S().lists.categoriesProduits.filter((x) => x.id !== c.id); LBE.store.sauver(); LBE.rafraichir();
      },
      soumettre: { action: (v) => { Object.assign(c, v, { seuil: v.seuil === "" ? 0 : v.seuil }); if (nouveau) { c.id = "cat_" + LBE.util.uid(); S().lists.categoriesProduits.push(c); } LBE.store.sauver(); ui.toast("Catégorie enregistrée ✓"); LBE.rafraichir(); } },
    });
  }

  LBE.modules.parametres = { rendre };
})();
