/* =========================================================
   Saisie depuis Claude : coller un « code de saisie » préparé
   dans la conversation, vérifier l'aperçu, puis valider.
   Les données ne transitent par aucun serveur.
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc } = LBE;
  const U = LBE.util;

  /* ---------- Correspondances souples (majuscules, accents, espaces) ---------- */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9€]+/g, " ").trim();
  function trouverPar(liste, nom, champ) {
    const n = norm(nom); if (!n) return null;
    const exact = liste.filter((x) => norm(x[champ || "nom"]) === n);
    if (exact.length) return exact[0];
    const proches = liste.filter((x) => { const v = norm(x[champ || "nom"]); return v.includes(n) || n.includes(v); });
    return proches.length === 1 ? proches[0] : null;
  }
  const chiffres = (t) => String(t || "").replace(/\D/g, "").replace(/^33/, "0").slice(-9);
  function produit(D, nom) {
    const p = trouverPar(D.produits.filter((x) => x.statut !== "archive"), nom) || trouverPar(D.produits, nom);
    if (!p) throw new Error("produit « " + nom + " » introuvable dans le catalogue");
    return p;
  }
  function categorie(D, nom) {
    const c = trouverPar(D.lists.categoriesProduits, nom);
    if (!c) throw new Error("catégorie « " + nom + " » introuvable (" + D.lists.categoriesProduits.map((x) => x.nom).join(", ") + ")");
    return c;
  }
  function commande(D, num) {
    const s = String(num || "").trim();
    const n = /^\d+$/.test(s) ? "LBE-" + s.padStart(4, "0") : s.toUpperCase();
    const c = D.commandes.find((x) => x.numero.toUpperCase() === n);
    if (!c) throw new Error("commande « " + num + " » introuvable");
    return c;
  }
  function cliente(D, o, creer) {
    if (typeof o === "string") o = { nom: o };
    let c = (o.telephone && D.clientes.find((x) => x.telephone && chiffres(x.telephone) === chiffres(o.telephone))) || trouverPar(D.clientes, o.nom);
    let cree = false;
    if (!c) {
      if (!creer) throw new Error("cliente « " + o.nom + " » introuvable");
      if (!o.nom) throw new Error("nom de la cliente manquant");
      c = { id: U.uid(), nom: o.nom, telephone: o.telephone || "", ville: o.ville || "", relais: o.relais || "", notes: o.notes || "", cree: U.aujourdhui() };
      D.clientes.push(c); cree = true;
    } else {
      ["telephone", "ville", "relais", "notes"].forEach((k) => { if (o[k]) c[k] = o[k]; });
    }
    return { c, cree };
  }
  const date = (d) => (/^\d{4}-\d{2}-\d{2}$/.test(d || "") ? d : U.aujourdhui());
  const num = (v, def) => (v === "" || v == null || isNaN(Number(v)) ? def : Number(v));
  function moyen(D, m) {
    if (!m) return D.lists.moyensPaiement[0];
    const t = trouverPar(D.lists.moyensPaiement.map((x) => ({ nom: x })), m);
    if (t) return t.nom;
    D.lists.moyensPaiement.push(m); return m;
  }

  /* ---------- Opérations ---------- */
  const OPS = {
    produit(D, o) {
      let p = trouverPar(D.produits, o.nom);
      const nouveau = !p;
      if (nouveau) p = { id: U.uid(), nom: o.nom, categorie: "", description: "", photo: "", prix: 0, poids: "", prixAchat: "", emballage: "", seuil: "", statut: "actif", composants: [], cree: U.aujourdhui() };
      if (o.categorie) p.categorie = categorie(D, o.categorie).id;
      else if (nouveau) throw new Error("catégorie manquante pour le nouveau produit « " + o.nom + " »");
      ["description", "photo", "statut"].forEach((k) => { if (o[k] != null) p[k] = o[k]; });
      ["prix", "poids", "prixAchat", "emballage", "seuil"].forEach((k) => { if (o[k] != null && o[k] !== "") p[k] = Number(o[k]); });
      if (o.composants) p.composants = o.composants.map((c) => ({ produitId: produit(D, c.produit).id, qte: num(c.qte, 1) }));
      if (nouveau) D.produits.push(p);
      return (nouveau ? "Nouveau produit " : "Mise à jour de ") + "« " + p.nom + " »" + (o.prix != null ? " · " + f.euro(o.prix) : "");
    },
    cliente(D, o) {
      const r = cliente(D, o, true);
      return (r.cree ? "Nouvelle cliente " : "Fiche mise à jour : ") + r.c.nom + (r.c.ville ? " (" + r.c.ville + ")" : "");
    },
    commande(D, o) {
      if (!o.articles || !o.articles.length) throw new Error("aucun article dans la commande");
      const r = cliente(D, o.cliente, true);
      const lignes = o.articles.map((a) => { const p = produit(D, a.produit); return { produitId: p.id, qte: num(a.qte, 1), prix: num(a.prix, Number(p.prix) || 0) }; });
      D.settings.compteurCommande = (Number(D.settings.compteurCommande) || 0) + 1;
      const c = {
        id: U.uid(), numero: "LBE-" + String(D.settings.compteurCommande).padStart(4, "0"), date: date(o.date), clienteId: r.c.id, lignes,
        fraisPort: num(o.port, D.settings.fraisPortClient), remise: num(o.remise, 0), note: o.note || "",
        paiement: { statut: "attente", moyen: "", date: "" }, expedition: { statut: "a_preparer", suivi: "", date: "", coutEtiquette: 0 },
      };
      if (o.paiement && (o.paiement.statut === "recu" || o.paiement === "recu")) c.paiement = { statut: "recu", moyen: moyen(D, o.paiement.moyen), date: date(o.paiement.date || o.date) };
      D.commandes.push(c);
      const total = lignes.reduce((s, l) => s + l.qte * l.prix, 0) + c.fraisPort - c.remise;
      return "Commande " + c.numero + " · " + r.c.nom + (r.cree ? " (nouvelle cliente)" : "") + " · " + lignes.map((l) => l.qte + " × " + D.produits.find((p) => p.id === l.produitId).nom).join(", ") + " · " + f.euro(total) + (c.paiement.statut === "recu" ? " · payée (" + c.paiement.moyen + ")" : " · paiement en attente");
    },
    paiement(D, o) {
      const c = commande(D, o.commande);
      c.paiement = { statut: "recu", moyen: moyen(D, o.moyen), date: date(o.date) };
      return "Paiement reçu pour " + c.numero + " (" + c.paiement.moyen + ")";
    },
    expedition(D, o) {
      const c = commande(D, o.commande);
      if (!o.suivi) throw new Error("numéro de suivi manquant pour " + c.numero);
      c.expedition = { statut: "expediee", suivi: String(o.suivi), date: date(o.date), coutEtiquette: num(o.cout, D.settings.coutEtiquette) };
      return c.numero + " expédiée · suivi " + o.suivi;
    },
    livraison(D, o) {
      const c = commande(D, o.commande);
      if (c.expedition.statut === "a_preparer") c.expedition = { statut: "livree", suivi: c.expedition.suivi, date: date(o.date), coutEtiquette: num(o.cout, D.settings.coutEtiquette) };
      else c.expedition.statut = "livree";
      return c.numero + " livrée";
    },
    annulation(D, o) { const c = commande(D, o.commande); c.annulee = true; return c.numero + " annulée (articles remis en stock)"; },
    arrivage(D, o) {
      if (!o.articles || !o.articles.length) throw new Error("aucun produit dans l'arrivage");
      const lignes = o.articles.map((a) => { const p = produit(D, a.produit); return { produitId: p.id, qte: num(a.qte, 0), prixUnitaire: num(a.prixAchat != null ? a.prixAchat : a.prix, Number(p.prixAchat) || 0) }; });
      const poids = num(o.poidsKg, "");
      const a = { id: U.uid(), date: date(o.date), libelle: o.libelle || "Arrivage n°" + (D.arrivages.length + 1), poidsKg: poids, fret: num(o.fret, poids !== "" ? U.arrondi(poids * D.settings.fretParKg) : 0), transport: num(o.transport, D.settings.transportAdjame), note: o.note || "", lignes };
      D.arrivages.push(a);
      return "Arrivage « " + a.libelle + " » · " + lignes.reduce((s, l) => s + l.qte, 0) + " pièces · fret " + f.euro(a.fret);
    },
    depense(D, o) {
      if (!num(o.montant, 0)) throw new Error("montant de la dépense manquant");
      const cat = trouverPar(D.lists.categoriesDepenses.map((x) => ({ nom: x })), o.categorie);
      const categorieNom = cat ? cat.nom : o.categorie || "Autre";
      if (!cat && o.categorie) D.lists.categoriesDepenses.push(o.categorie);
      D.depenses.push({ id: U.uid(), date: date(o.date), categorie: categorieNom, libelle: o.libelle || "", montant: Number(o.montant) });
      return "Dépense " + categorieNom + " · " + (o.libelle ? o.libelle + " · " : "") + f.euro(o.montant);
    },
    ajustement(D, o) {
      const p = produit(D, o.produit);
      if (!num(o.qte, 0)) throw new Error("quantité manquante");
      D.ajustements.push({ id: U.uid(), date: date(o.date), produitId: p.id, qte: Number(o.qte), motif: o.motif || "" });
      return "Stock " + p.nom + " : " + (o.qte > 0 ? "+" : "") + o.qte + (o.motif ? " (" + o.motif + ")" : "");
    },
    attente(D, o) {
      const p = produit(D, o.produit);
      D.attente.push({ id: U.uid(), date: date(o.date), produitId: p.id, nom: o.nom || "", telephone: o.telephone || "", prevenue: false });
      return (o.nom || "Cliente") + " inscrite en liste d'attente pour " + p.nom;
    },
    publication(D, o) {
      const pr = o.produit ? produit(D, o.produit) : null;
      D.publications.push({ id: U.uid(), date: date(o.date), plateforme: o.plateforme || D.lists.plateformes[0], type: o.type || D.lists.typesContenu[0], produitId: pr ? pr.id : "", titre: o.titre || "Publication", statut: ["idee", "a_tourner", "publie"].includes(o.statut) ? o.statut : "idee", legende: o.legende || "", hashtags: o.hashtags || "", notes: o.notes || "" });
      return "Publication « " + (o.titre || "") + " » le " + f.date(date(o.date));
    },
    idee(D, o) {
      const pr = o.produit ? produit(D, o.produit) : null;
      D.idees.push({ id: U.uid(), titre: o.titre || "Idée", type: o.type || D.lists.typesContenu[0], produitId: pr ? pr.id : "", note: o.note || "" });
      return "Idée : " + o.titre;
    },
    stats(D, o) {
      if (!["TikTok", "Instagram"].includes(o.plateforme)) throw new Error("plateforme des statistiques : TikTok ou Instagram");
      D.stats.push({ id: U.uid(), date: date(o.date), plateforme: o.plateforme, vues: num(o.vues, 0), likes: num(o.likes, 0), abonnes: num(o.abonnes, 0), messages: num(o.messages, 0) });
      return "Statistiques " + o.plateforme + " du " + f.date(date(o.date));
    },
  };

  /* ---------- Lecture du code ---------- */
  function lire(texte) {
    let t = String(texte || "").trim();
    if (!t) throw new Error("Collez d'abord le code de saisie.");
    // Code au format lien (#/saisie/...) ou base64
    const m = t.match(/#\/saisie\/([A-Za-z0-9_-]+)/);
    if (m) t = decoder(m[1]);
    const debut = t.indexOf("{"), fin = t.lastIndexOf("}");
    if (debut < 0 || fin < 0) throw new Error("Code non reconnu : il doit contenir un bloc entre { }.");
    let obj;
    try { obj = JSON.parse(t.slice(debut, fin + 1).replace(/[“”]/g, '"').replace(/[‘’]/g, "'")); }
    catch (e) { throw new Error("Le code est incomplet ou abîmé (copiez-le en entier, du premier { au dernier })."); }
    const ops = Array.isArray(obj) ? obj : obj.operations;
    if (!Array.isArray(ops) || !ops.length) throw new Error("Aucune opération trouvée dans le code.");
    return ops;
  }
  function decoder(b64) {
    const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return decodeURIComponent(Array.from(s, (c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join(""));
  }
  // Simulation sur une copie des données : rien n'est modifié tant que vous n'avez pas validé
  function simuler(ops, actifs) {
    const D = JSON.parse(JSON.stringify(LBE.store.d));
    return ops.map((o, i) => {
      if (actifs && !actifs[i]) return { o, ignore: true, texte: "Ignorée" };
      const fn = OPS[o && o.action];
      if (!fn) return { o, erreur: "action « " + (o && o.action) + " » inconnue" };
      try { return { o, texte: fn(D, o) }; } catch (e) { return { o, erreur: e.message }; }
    });
  }
  function executer(ops, actifs) {
    const D = LBE.store.d;
    let n = 0; const erreurs = [];
    ops.forEach((o, i) => {
      if (!actifs[i]) return;
      try { OPS[o.action](D, o); n++; } catch (e) { erreurs.push(e.message); }
    });
    LBE.store.sauver();
    return { n, erreurs };
  }

  /* ---------- Interface ---------- */
  const ICONES = { commande: "commandes", paiement: "euro", expedition: "camion", livraison: "check", annulation: "annuler", arrivage: "avion", depense: "euro", ajustement: "stocks", attente: "clientes", publication: "social", idee: "etoile", stats: "compta", produit: "catalogue", cliente: "clientes" };

  function ouvrir(texteInitial) {
    let ops = null, actifs = [];
    const m = ui.modale({
      titre: "Saisie depuis Claude", large: true,
      corps: '<p class="doux" style="margin:0">Décrivez vos opérations à Claude dans la conversation (« commande de Fatou, 2 Classique Nacre, payée par Wero »…). Claude vous répond avec un <b>code de saisie</b> : collez-le ici, vérifiez l\'aperçu, puis validez.</p>' +
        '<label class="champ"><span>Code de saisie</span><textarea id="sz-code" rows="6" style="font-family:ui-monospace,Menlo,monospace;font-size:13px" placeholder="Collez ici le code fourni par Claude">' + esc(texteInitial || "") + "</textarea></label>" +
        '<div class="row-flex"><button type="button" class="btn" id="sz-coller">' + icon("copier") + ' Coller</button><button type="button" class="btn sable" id="sz-analyser">' + icon("recherche") + " Vérifier</button></div>" +
        '<div id="sz-apercu"></div>',
      boutons: [{ label: icon("check") + " Valider", cls: "primaire", action: (fermer) => {
        if (!ops) { analyser(); return; }
        const sim = simuler(ops, actifs);
        const okIdx = sim.map((r, i) => (!r.erreur && !r.ignore ? i : -1)).filter((i) => i >= 0);
        if (!okIdx.length) { ui.toast("Aucune opération valide à enregistrer.", true); return; }
        const act = ops.map((_, i) => okIdx.includes(i));
        const r = executer(ops, act);
        fermer();
        ui.toast(r.n + " opération(s) enregistrée(s) ✓" + (r.erreurs.length ? " · " + r.erreurs.length + " erreur(s)" : ""), !!r.erreurs.length);
        LBE.rafraichir();
      } }],
    });
    const el = m.el;
    const zone = el.querySelector("#sz-apercu");
    const ta = el.querySelector("#sz-code");
    function dessiner() {
      const sim = simuler(ops, actifs);
      const nbOk = sim.filter((r) => !r.erreur && !r.ignore).length, nbErr = sim.filter((r) => r.erreur).length;
      zone.innerHTML = '<div class="separateur"></div><div class="card-head"><h3 style="margin:0">Aperçu</h3><span class="badge ' + (nbErr ? "attente" : "ok") + '">' + nbOk + " prête(s)" + (nbErr ? " · " + nbErr + " à corriger" : "") + "</span></div>" +
        '<div class="rows">' + sim.map((r, i) => '<label class="rowi" style="cursor:pointer;align-items:flex-start"><input type="checkbox" data-i="' + i + '"' + (actifs[i] ? " checked" : "") + (r.erreur ? " disabled" : "") + ' style="margin-top:4px">' +
          '<div class="principal"><div class="titre" style="white-space:normal">' + icon(ICONES[r.o && r.o.action] || "info") + " " + esc(r.erreur ? (r.o && r.o.action) || "?" : r.texte) + "</div>" +
          (r.erreur ? '<div class="meta" style="color:var(--danger);white-space:normal">⚠ ' + esc(r.erreur) + " — demandez à Claude de corriger, ou décochez.</div>" : "") + "</div></label>").join("") + "</div>" +
        (nbErr ? '<p class="aide mt">Les lignes en erreur ne seront pas enregistrées.</p>' : '<p class="aide mt">Rien n\'est modifié tant que vous n\'avez pas cliqué sur « Valider ».</p>');
      zone.querySelectorAll("[data-i]").forEach((c) => (c.onchange = () => { actifs[Number(c.dataset.i)] = c.checked; dessiner(); }));
    }
    function analyser() {
      try { ops = lire(ta.value); actifs = ops.map(() => true); dessiner(); }
      catch (e) { ops = null; zone.innerHTML = '<div class="alerte-ligne danger mt">' + icon("alerte") + "<span>" + esc(e.message) + "</span></div>"; }
    }
    el.querySelector("#sz-analyser").onclick = analyser;
    el.querySelector("#sz-coller").onclick = async () => {
      try { ta.value = await navigator.clipboard.readText(); analyser(); }
      catch (e) { ta.focus(); ui.toast("Appuyez longuement dans le cadre puis « Coller ».", true); }
    };
    ta.addEventListener("paste", () => setTimeout(analyser, 50));
    if (texteInitial) analyser();
  }

  // Résumé de l'activité à donner à Claude (pour qu'il connaisse vos produits et commandes)
  function resume() {
    const D = LBE.store.d;
    const etat = calc.etatStocks();
    const enCours = D.commandes.filter((c) => !c.annulee && calc.statutCommande(c).cle !== "livree");
    const lignes = [
      "LBE-ETAT du " + f.date(U.aujourdhui()),
      "",
      "PRODUITS (nom | catégorie | prix | stock) :",
      ...etat.map((e) => "- " + e.p.nom + " | " + LBE.q.nomCategorie(e.p.categorie) + " | " + f.euro(e.p.prix) + " | " + (e.p.statut === "bientot" ? "bientôt" : e.stock)),
      "",
      "CATÉGORIES : " + D.lists.categoriesProduits.map((c) => c.nom).join(", "),
      "CLIENTES : " + D.clientes.map((c) => c.nom + (c.ville ? " (" + c.ville + ")" : "")).join(", "),
      "",
      "COMMANDES EN COURS :",
      ...(enCours.length ? enCours.map((c) => { const cl = LBE.q.cliente(c.clienteId); return "- " + c.numero + " | " + (cl ? cl.nom : "?") + " | " + f.euro(calc.totalCommande(c).total) + " | " + calc.statutCommande(c).label; }) : ["- aucune"]),
      "",
      "MOYENS DE PAIEMENT : " + D.lists.moyensPaiement.join(", "),
      "CATÉGORIES DE DÉPENSES : " + D.lists.categoriesDepenses.join(", "),
      "FRAIS : port facturé " + f.euro(D.settings.fraisPortClient) + " · étiquette " + f.euro(D.settings.coutEtiquette) + " · fret " + f.euro(D.settings.fretParKg) + "/kg · transport Adjamé " + f.euro(D.settings.transportAdjame),
    ];
    ui.copier(lignes.join("\n"), "Résumé copié : collez-le dans la conversation avec Claude ✓");
  }

  LBE.saisie = { ouvrir, resume, lire, simuler };

  // Lien direct : …/#/saisie/<code> ouvre l'aperçu
  function verifierLien() {
    const m = location.hash.match(/^#\/saisie\/([A-Za-z0-9_-]+)/);
    if (!m) return;
    history.replaceState(null, "", location.pathname + "#/dashboard");
    try { const t = decoder(m[1]); setTimeout(() => ouvrir(t), 200); } catch (e) { ui.toast("Lien de saisie illisible.", true); }
  }
  window.addEventListener("hashchange", verifierLien);
  document.addEventListener("DOMContentLoaded", verifierLien);
})();
