/* =========================================================
   Module 2 — Catalogue & création de produits
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, q } = LBE; // calc et q exposés par store.js
  const S = () => LBE.store.d;

  const NOMS_MELANGE = ["Aube", "Lagon", "Marée douce", "Écume", "Sable chaud", "Horizon", "Coquillage", "Brise", "Perle d'eau", "Soleil levant", "Alizé", "Nacre"];
  const NOMS_PACK = ["Douceur", "Éclat", "Sillage", "Escale", "Rituel", "Évasion", "Caresse", "Belle journée"];
  const STATUTS = [["actif", "Disponible"], ["bientot", "Bientôt disponible"], ["archive", "Archivé"]];
  let filtreCat = "", recherche = "";

  function nomLibre(prefixe, liste) {
    const pris = new Set(S().produits.map((p) => p.nom.toLowerCase()));
    for (const n of liste) if (!pris.has((prefixe + " " + n).toLowerCase())) return prefixe + " " + n;
    return prefixe + " n°" + (S().produits.length + 1);
  }

  /* ---------- Rendu ---------- */
  function rendre(el, params) {
    const onglet = params[0] || "produits";
    el.innerHTML = ui.entete("Module 2", "Catalogue & création",
      '<button class="btn sable" data-act="atelier">' + icon("melange") + " Créer un mélange / pack</button>" +
      '<button class="btn primaire" data-act="nouveau">' + icon("plus") + " Nouveau produit</button>") +
      ui.tabs("catalogue", [["produits", "Produits"], ["atelier", "Atelier de création"]], onglet) +
      '<div id="cat-contenu"></div>';
    el.querySelector('[data-act="nouveau"]').onclick = () => ficheProduit(null);
    el.querySelector('[data-act="atelier"]').onclick = () => atelierModale();
    const c = el.querySelector("#cat-contenu");
    if (onglet === "atelier") rendreAtelier(c); else rendreProduits(c);
  }

  function rendreProduits(el) {
    const cats = S().lists.categoriesProduits;
    const conso = calc.consommation();
    let produits = S().produits.filter((p) => (filtreCat === "archive" ? p.statut === "archive" : p.statut !== "archive" && (!filtreCat || p.categorie === filtreCat)));
    if (recherche) produits = produits.filter((p) => (p.nom + " " + p.description).toLowerCase().includes(recherche.toLowerCase()));
    el.innerHTML =
      '<div class="row-flex mb"><label class="search">' + icon("recherche") + '<input type="search" placeholder="Rechercher un produit…" value="' + esc(recherche) + '" id="cat-rech"></label></div>' +
      '<div class="tabs" style="margin-bottom:14px">' +
      [["", "Tous"], ...cats.map((c) => [c.id, c.nom]), ["archive", "Archivés"]].map(([id, n]) => '<a href="#" data-cat="' + id + '" class="' + (filtreCat === id ? "actif" : "") + '">' + esc(n) + "</a>").join("") + "</div>" +
      (produits.length ? '<div class="produits-grid">' + produits.map((p) => carteProduit(p, conso)).join("") + "</div>" : '<div class="card">' + ui.vide("Aucun produit ici pour l'instant.") + "</div>");
    el.querySelectorAll("[data-cat]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); filtreCat = a.dataset.cat; rendreProduits(el); }));
    const r = el.querySelector("#cat-rech");
    r.oninput = () => { recherche = r.value; const pos = r.selectionStart; rendreProduits(el); const n = el.querySelector("#cat-rech"); n.focus(); n.setSelectionRange(pos, pos); };
    el.querySelectorAll("[data-produit]").forEach((c) => (c.onclick = () => ficheProduit(q.produit(c.dataset.produit))));
  }

  function carteProduit(p, conso) {
    const m = calc.marge(p);
    const st = calc.stock(p, conso);
    const niv = calc.niveau(p, st);
    return '<div class="card produit-card" data-produit="' + p.id + '">' + ui.vignette(p, "grande") +
      '<div><div class="doux" style="font-size:.72rem;letter-spacing:.1em;text-transform:uppercase">' + esc(q.nomCategorie(p.categorie)) + "</div>" +
      '<div class="nom">' + esc(p.nom) + "</div></div>" +
      '<div class="ligne-prix"><span class="prix">' + f.euro(p.prix) + '</span><span class="marge ' + (m.pct < 0.4 ? "faible" : "") + '">marge ' + f.pct(m.pct) + "</span></div>" +
      '<div class="row-flex" style="gap:6px">' + ui.badgeStock(niv, st) + (q.estCompose(p) ? '<span class="badge sable nodot">composé</span>' : "") + "</div></div>";
  }

  /* ---------- Fiche produit (création / modification) ---------- */
  function recapCout(p) {
    const d = calc.coutDetail(p);
    const emb = calc.emballage(p);
    const cout = d.achat + d.frais + emb;
    const prix = Number(p.prix) || 0;
    const marge = prix - cout;
    return '<div class="recap">' +
      '<div class="l"><span>Achat' + (q.estCompose(p) ? " des composants" : d.source === "arrivages" ? " (moyenne des arrivages)" : " (prix saisi)") + "</span><b>" + f.euro(d.achat) + "</b></div>" +
      '<div class="l"><span>Part fret avion + transport' + (d.source === "estimation" ? " (estimée selon le poids)" : "") + "</span><b>" + f.euro(d.frais) + "</b></div>" +
      '<div class="l"><span>Emballage</span><b>' + f.euro(emb) + "</b></div>" +
      '<div class="l total"><span>Coût de revient</span><b>' + f.euro(cout) + "</b></div>" +
      '<div class="l"><span>Prix de vente</span><b>' + f.euro(prix) + "</b></div>" +
      '<div class="l" style="color:' + (marge < 0 ? "var(--danger)" : "var(--succes)") + '"><span>Marge</span><b>' + f.euro(marge) + " · " + f.pct(prix ? marge / prix : 0) + "</b></div>" +
      '<div class="l doux"><span>Prix conseillé (marge cible ' + S().settings.margeCible + " %)</span><b>" + f.euro(calc.prixConseille(cout)) + "</b></div></div>";
  }

  function editeurComposants(composants) {
    const simples = q.produitsSimples();
    const conso = calc.consommation();
    const opts = simples.map((p) => '<option value="' + p.id + '">' + esc(p.nom) + " (stock " + calc.stock(p, conso) + ")</option>").join("");
    return '<div class="lignes-edit" id="composants">' + composants.map((c) => ligneComposant(c, opts)).join("") + "</div>" +
      '<button type="button" class="btn petit mt" id="ajout-comp">' + icon("plus") + " Ajouter un composant</button>";
  }
  function ligneComposant(c, opts) {
    return '<div class="ligne-edit l3" data-ligne><select data-k="produitId">' + opts.replace('value="' + c.produitId + '"', 'value="' + c.produitId + '" selected') + '</select><input type="number" min="1" step="1" data-k="qte" value="' + (c.qte || 1) + '" inputmode="numeric"><button type="button" class="btn icone petit fantome" data-suppr>' + icon("fermer") + "</button></div>";
  }
  function lireComposants(el) {
    return [...el.querySelectorAll("#composants [data-ligne]")].map((l) => ({ produitId: l.querySelector('[data-k="produitId"]').value, qte: Number(l.querySelector('[data-k="qte"]').value) || 1 })).filter((c) => c.produitId);
  }
  function brancherComposants(el, onChange) {
    const simples = q.produitsSimples();
    const conso = calc.consommation();
    const opts = simples.map((p) => '<option value="' + p.id + '">' + esc(p.nom) + " (stock " + calc.stock(p, conso) + ")</option>").join("");
    const zone = el.querySelector("#composants");
    if (!zone) return;
    el.querySelector("#ajout-comp").onclick = () => { zone.insertAdjacentHTML("beforeend", ligneComposant({ produitId: simples[0] && simples[0].id, qte: 1 }, opts)); onChange(); };
    zone.addEventListener("click", (e) => { const b = e.target.closest("[data-suppr]"); if (b) { b.closest("[data-ligne]").remove(); onChange(); } });
    zone.addEventListener("input", onChange); zone.addEventListener("change", onChange);
  }

  function ficheProduit(p, preset) {
    const nouveau = !p;
    const cats = S().lists.categoriesProduits;
    p = p || Object.assign({ id: "", nom: "", categorie: cats[0] && cats[0].id, description: "", photo: "", prix: "", poids: "", prixAchat: "", emballage: "", seuil: "", statut: "actif", composants: [] }, preset || {});
    const compose = () => { const c = q.categorie(p.categorie); return (c && c.compose) || q.estCompose(p); };
    const st = nouveau ? null : calc.stock(p);
    const nbAttente = nouveau ? 0 : S().attente.filter((a) => a.produitId === p.id && !a.prevenue).length;
    const corps =
      (nouveau ? "" : '<div class="row-flex" style="flex-wrap:nowrap;gap:14px">' + ui.vignette(p) + '<div style="flex:1">' + ui.badgeStock(calc.niveau(p, st), st) + (nbAttente ? ' <span class="badge rose">' + nbAttente + " en liste d'attente</span>" : "") + '<div class="row-flex" style="margin-top:8px;gap:6px"><a class="btn petit" href="#/studio/photo/' + p.id + '">' + icon("studio") + " Créer un visuel</a></div></div></div>") +
      ui.champ("Nom du produit", "nom", p.nom, { requis: true, placeholder: "ex. Classique Nacre" }) +
      '<div class="g2 grid">' + ui.champ("Catégorie", "categorie", p.categorie, { type: "select", options: cats.map((c) => [c.id, c.nom]) }) + ui.champ("Statut", "statut", p.statut, { type: "select", options: STATUTS }) + "</div>" +
      ui.champ("Description", "description", p.description, { type: "textarea", placeholder: "Couleurs, matières, ressenti, conseils…" }) +
      ui.champ("Photo (lien)", "photo", p.photo, { type: "url", placeholder: "https://…", aide: "Collez le lien d'une photo (Instagram, Google Drive public, Imgur…)." }) +
      '<div id="zone-compose"' + (compose() ? "" : ' class="hidden"') + '><div class="champ"><span>Composition (mélange / pack)</span>' + editeurComposants(p.composants && p.composants.length ? p.composants : []) + "</div></div>" +
      '<div class="g2 grid">' +
      ui.champ("Prix de vente (€)", "prix", p.prix, { type: "number", requis: true }) +
      '<div id="zone-simple-1"' + (compose() ? ' class="hidden"' : "") + ">" + ui.champ("Prix d'achat unitaire (€)", "prixAchat", p.prixAchat, { type: "number", aide: "Utilisé tant qu'aucun arrivage n'est saisi." }) + "</div>" +
      '<div id="zone-simple-2"' + (compose() ? ' class="hidden"' : "") + ">" + ui.champ("Poids unitaire (g)", "poids", p.poids, { type: "number", step: "1", aide: "Sert à répartir le fret (" + S().settings.fretParKg + " €/kg)." }) + "</div>" +
      ui.champ("Emballage (€)", "emballage", p.emballage, { type: "number", placeholder: String(S().settings.emballageDefaut).replace(".", ","), aide: "Vide = valeur par défaut des paramètres." }) +
      ui.champ("Seuil d'alerte stock", "seuil", p.seuil, { type: "number", step: "1", placeholder: "catégorie", aide: "Vide = seuil de la catégorie." }) +
      "</div>" +
      '<div id="recap"></div>';

    ui.modale({
      titre: nouveau ? "Nouveau produit" : p.nom, corps, large: true,
      supprimer: nouveau ? null : () => {
        const utilise = S().commandes.some((c) => c.lignes.some((l) => l.produitId === p.id)) || S().arrivages.some((a) => a.lignes.some((l) => l.produitId === p.id));
        if (utilise) { p.statut = "archive"; ui.toast("Produit utilisé dans l'historique : il a été archivé."); }
        else { S().produits = S().produits.filter((x) => x.id !== p.id); ui.toast("Produit supprimé"); }
        LBE.store.sauver(); LBE.rafraichir();
      },
      onOuvrir: (el) => {
        const maj = () => {
          const v = ui.valeurs(el.querySelector("form"));
          const temp = Object.assign({}, p, v, { composants: lireComposants(el) });
          const isC = (q.categorie(v.categorie) || {}).compose;
          el.querySelector("#zone-compose").classList.toggle("hidden", !isC);
          el.querySelector("#zone-simple-1").classList.toggle("hidden", !!isC);
          el.querySelector("#zone-simple-2").classList.toggle("hidden", !!isC);
          if (!isC) temp.composants = [];
          el.querySelector("#recap").innerHTML = recapCout(temp);
        };
        el.querySelector("form").addEventListener("input", maj);
        el.querySelector("form").addEventListener("change", maj);
        brancherComposants(el, maj);
        maj();
      },
      soumettre: {
        label: nouveau ? "Créer le produit" : "Enregistrer",
        action: (v, el) => {
          const isC = (q.categorie(v.categorie) || {}).compose;
          const comps = isC ? lireComposants(el) : [];
          if (isC && !comps.length) { ui.toast("Ajoutez au moins un composant.", true); return false; }
          delete v.undefined;
          Object.assign(p, v, { composants: comps });
          if (nouveau) { p.id = LBE.util.uid(); p.cree = LBE.util.aujourdhui(); S().produits.push(p); }
          LBE.store.sauver(); ui.toast(nouveau ? "Produit créé ✓" : "Produit enregistré ✓"); LBE.rafraichir();
        },
      },
    });
  }

  /* ---------- Atelier de création ---------- */
  function suggestions() {
    const conso = calc.consommation();
    const s = S().settings;
    const dispo = q.produitsSimples().filter((p) => p.statut === "actif").map((p) => ({ p, st: calc.stock(p, conso), marge: calc.stock(p, conso) - calc.seuil(p) }));
    const bayas = dispo.filter((x) => q.estBaya(x.p) && x.marge >= 2).sort((a, b) => b.marge - a.marge);
    const autres = dispo.filter((x) => !q.estBaya(x.p) && x.marge >= 2).sort((a, b) => b.marge - a.marge);
    const sugg = [];
    const signature = (cs) => cs.map((c) => c.produitId).sort().join("+");
    const existants = new Set(S().produits.filter((p) => q.estCompose(p) && p.statut !== "archive").map((p) => signature(p.composants)));
    // Mélanges de 3 bayas (en variant les catégories si possible)
    for (let i = 0; i < bayas.length && sugg.length < 3; i++) {
      for (let j = i + 1; j < bayas.length && sugg.length < 3; j++) {
        for (let k = j + 1; k < bayas.length && sugg.length < 3; k++) {
          const trio = [bayas[i], bayas[j], bayas[k]];
          const cats = new Set(trio.map((t) => t.p.categorie));
          if (cats.size < 2 && bayas.some((b) => b.p.categorie !== trio[0].p.categorie)) continue;
          const comps = trio.map((t) => ({ produitId: t.p.id, qte: 1 }));
          if (existants.has(signature(comps)) || sugg.some((x) => signature(x.composants) === signature(comps))) continue;
          sugg.push({ type: "melange", composants: comps, pourquoi: "Ces 3 bayas ont un stock confortable (" + trio.map((t) => t.st).join(" / ") + ")." });
        }
      }
    }
    // Duos de bayas
    if (bayas.length >= 2 && sugg.length < 4) {
      const comps = [{ produitId: bayas[0].p.id, qte: 1 }, { produitId: bayas[bayas.length > 2 ? 2 : 1].p.id, qte: 1 }];
      if (!existants.has(signature(comps))) sugg.push({ type: "melange", composants: comps, pourquoi: "Un duo simple pour écouler les bayas les mieux fournies." });
    }
    // Packs baya + musc
    const muscs = autres.filter((x) => /musc/i.test(q.nomCategorie(x.p.categorie)) || /musc/i.test(x.p.nom));
    for (let i = 0; i < Math.min(bayas.length, 3); i++) {
      const m = muscs[i % Math.max(muscs.length, 1)];
      if (!m) break;
      const comps = [{ produitId: bayas[i].p.id, qte: 1 }, { produitId: m.p.id, qte: 1 }];
      if (existants.has(signature(comps))) continue;
      sugg.push({ type: "pack", composants: comps, pourquoi: "Baya bien en stock (" + bayas[i].st + ") associée à un musc disponible (" + m.st + ")." });
    }
    return sugg.map((x) => { const tmp = { composants: x.composants, emballage: x.type === "pack" ? 0.7 : 0.8, prix: 0 }; const cout = calc.coutRevient(tmp); return Object.assign(x, { cout, prix: calc.prixConseille(cout), faisable: calc.stock({ composants: x.composants }, conso), emballage: tmp.emballage }); });
  }

  function rendreAtelier(el) {
    const sugg = suggestions();
    const composes = S().produits.filter((p) => q.estCompose(p) && p.statut !== "archive");
    const conso = calc.consommation();
    el.innerHTML =
      '<div class="grid g2">' +
      '<div class="card nacre"><h3>' + icon("melange") + " Composer un mélange de bayas</h3><p class=\"doux\">Choisissez plusieurs bayas en stock : le coût de revient, le prix conseillé et le nombre de mélanges réalisables se calculent automatiquement.</p><button class=\"btn primaire\" data-cr=\"melange\">" + icon("plus") + " Nouveau mélange</button></div>" +
      '<div class="card nacre"><h3>' + icon("etoile") + " Composer un pack baya + musc</h3><p class=\"doux\">Associez une baya et un mini musc (ou d'autres produits) pour créer une offre cadeau irrésistible.</p><button class=\"btn primaire\" data-cr=\"pack\">" + icon("plus") + " Nouveau pack</button></div>" +
      "</div>" +
      '<div class="card mt"><div class="card-head"><h3>✨ Suggestions selon vos stocks</h3><span class="doux" style="font-size:.85rem">Basées sur les bayas au-dessus du seuil de sécurité</span></div>' +
      (sugg.length ? '<div class="rows">' + sugg.map((s, i) =>
        '<div class="rowi"><div class="principal"><div class="titre">' + (s.type === "pack" ? "Pack" : "Mélange") + " : " + s.composants.map((c) => esc((q.produit(c.produitId) || {}).nom)).join(" + ") + '</div><div class="meta">' + esc(s.pourquoi) + " · " + s.faisable + " réalisable(s)</div></div>" +
        '<div class="droite"><span class="montant">' + f.euro(s.prix) + '</span><span class="doux" style="font-size:.8rem">coût ' + f.euro(s.cout) + '</span></div><button class="btn petit sable" data-sugg="' + i + '">Créer</button></div>').join("") + "</div>"
        : ui.vide("Pas de suggestion pour le moment : ajoutez un arrivage pour avoir des bayas au-dessus du seuil.")) + "</div>" +
      '<div class="card mt"><h3>Vos mélanges & packs</h3>' +
      (composes.length ? '<div class="rows">' + composes.map((p) => { const m = calc.marge(p); return '<div class="rowi cliquable" data-produit="' + p.id + '">' + ui.vignette(p) + '<div class="principal"><div class="titre">' + esc(p.nom) + '</div><div class="meta">' + p.composants.map((c) => c.qte + " × " + esc((q.produit(c.produitId) || {}).nom || "?")).join(" + ") + '</div></div><div class="droite"><span class="montant">' + f.euro(p.prix) + "</span>" + ui.badgeStock(calc.niveau(p, calc.stock(p, conso)), calc.stock(p, conso)) + '<span class="doux" style="font-size:.78rem">marge ' + f.pct(m.pct) + "</span></div></div>"; }).join("") + "</div>" : ui.vide("Aucun mélange ni pack pour l'instant.")) + "</div>";
    el.querySelectorAll("[data-cr]").forEach((b) => (b.onclick = () => atelierModale(b.dataset.cr)));
    el.querySelectorAll("[data-sugg]").forEach((b) => (b.onclick = () => { const s = sugg[Number(b.dataset.sugg)]; atelierModale(s.type, s); }));
    el.querySelectorAll("[data-produit]").forEach((c) => (c.onclick = () => ficheProduit(q.produit(c.dataset.produit))));
  }

  function atelierModale(type, sugg) {
    type = type || "melange";
    const cats = S().lists.categoriesProduits;
    const catMel = (cats.find((c) => c.compose && /m[ée]lange/i.test(c.nom)) || cats.find((c) => c.compose) || cats[0]).id;
    const catPack = (cats.find((c) => c.compose && /pack/i.test(c.nom)) || cats.find((c) => c.compose) || cats[0]).id;
    const comps = sugg ? sugg.composants : [];
    const nom = type === "pack" ? nomLibre("Pack", NOMS_PACK) : nomLibre("Mélange", NOMS_MELANGE);
    const corps =
      '<div class="g2 grid">' + ui.champ("Type", "type", type, { type: "select", options: [["melange", "Mélange de bayas"], ["pack", "Pack (baya + musc…)"]] }) + ui.champ("Nom", "nom", nom, { requis: true }) + "</div>" +
      '<div class="champ"><span>Composants</span>' + editeurComposants(comps) + "</div>" +
      '<div class="g2 grid">' + ui.champ("Emballage (€)", "emballage", sugg ? sugg.emballage : type === "pack" ? 0.7 : 0.8, { type: "number" }) + ui.champ("Prix de vente (€)", "prix", sugg ? sugg.prix : "", { type: "number", aide: "Laissez vide pour appliquer le prix conseillé." }) + "</div>" +
      ui.champ("Description", "description", "", { type: "textarea", placeholder: "L'histoire de ce mélange, les couleurs, l'occasion…" }) +
      '<div id="recap"></div>';
    ui.modale({
      titre: "Atelier de création", corps, large: true,
      onOuvrir: (el) => {
        const zone = el.querySelector("#composants");
        const maj = () => {
          const v = ui.valeurs(el.querySelector("form"));
          const cs = lireComposants(el);
          const tmp = { composants: cs, emballage: v.emballage, prix: v.prix };
          const cout = calc.coutRevient(tmp);
          if (v.prix === "") tmp.prix = calc.prixConseille(cout);
          const faisable = cs.length ? calc.stock(tmp) : 0;
          el.querySelector("#recap").innerHTML = recapCout(tmp) + '<p class="aide" style="margin-top:8px">Avec le stock actuel, vous pouvez réaliser <b>' + faisable + "</b> " + (v.type === "pack" ? "pack(s)" : "mélange(s)") + ". Poids estimé : " + Math.round(calc.poidsProduit(tmp)) + " g.</p>";
        };
        zone.addEventListener("input", maj);
        el.querySelector("form").addEventListener("input", maj);
        el.querySelector("form").addEventListener("change", maj);
        el.querySelector('[name="type"]').addEventListener("change", (e) => {
          const n = el.querySelector('[name="nom"]');
          if (/^(Mélange|Pack) /.test(n.value)) n.value = e.target.value === "pack" ? nomLibre("Pack", NOMS_PACK) : nomLibre("Mélange", NOMS_MELANGE);
        });
        brancherComposants(el, maj);
        if (!comps.length) el.querySelector("#ajout-comp").click();
        maj();
      },
      soumettre: {
        label: "Créer le produit",
        action: (v, el) => {
          const cs = lireComposants(el);
          if (!cs.length) { ui.toast("Ajoutez au moins un composant.", true); return false; }
          const tmp = { composants: cs, emballage: v.emballage };
          const p = { id: LBE.util.uid(), nom: v.nom, categorie: v.type === "pack" ? catPack : catMel, description: v.description, photo: "", prix: v.prix === "" ? calc.prixConseille(calc.coutRevient(tmp)) : v.prix, poids: "", prixAchat: "", emballage: v.emballage, seuil: "", statut: "actif", composants: cs, cree: LBE.util.aujourdhui() };
          S().produits.push(p); LBE.store.sauver();
          ui.toast("« " + p.nom + " » ajouté au catalogue ✓");
          LBE.aller("#/catalogue/atelier");
        },
      },
    });
  }

  LBE.modules.catalogue = { rendre };
  LBE.catalogue = { ficheProduit };
})();
