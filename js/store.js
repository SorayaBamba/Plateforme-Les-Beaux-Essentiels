/* =========================================================
   Données : stockage navigateur (localStorage), calculs métier,
   données d'exemple. Rien n'est jamais envoyé sur un serveur.
   ========================================================= */
(function () {
  "use strict";
  const LBE = (window.LBE = window.LBE || {});
  const CLE = "lbe-donnees-v1";

  /* ---------- Utilitaires ---------- */
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const z = (n) => String(n).padStart(2, "0");
  const isoDate = (d) => d.getFullYear() + "-" + z(d.getMonth() + 1) + "-" + z(d.getDate());
  const aujourdhui = () => isoDate(new Date());
  const ajouterJours = (iso, n) => { const d = new Date(iso + "T12:00:00"); d.setDate(d.getDate() + n); return isoDate(d); };
  const mois = (iso) => (iso || "").slice(0, 7);
  const ecartJours = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const arrondi = (n) => Math.round((Number(n) || 0) * 100) / 100;
  LBE.util = { uid, isoDate, aujourdhui, ajouterJours, mois, ecartJours, arrondi };

  /* ---------- Structure par défaut ---------- */
  function modelesParDefaut() {
    return [
      { id: "m_conf", titre: "Confirmation de commande", texte:
"Bonjour {prenom} ✨\n\nMerci pour votre commande chez Les Beaux Essentiels !\n\nRécapitulatif ({numero}) :\n{produits}\n\nFrais de port : {port}\nTotal : {total}\n\nLivraison en point relais Mondial Relay : {relais}\n\nVous pouvez régler par {moyens}. Dès réception de votre paiement, je prépare votre colis avec soin.\n\nBelle journée à vous 🌊" },
      { id: "m_paie", titre: "Rappel de paiement", texte:
"Bonjour {prenom},\n\nJe me permets de revenir vers vous concernant votre commande {numero} d'un montant de {total}.\n\nVos articles vous attendent ! Vous pouvez régler par {moyens}. N'hésitez pas à me dire si vous avez la moindre question.\n\nBelle journée à vous ✨" },
      { id: "m_recu", titre: "Paiement reçu", texte:
"Bonjour {prenom} 🤍\n\nJ'ai bien reçu votre paiement de {total} pour la commande {numero}. Merci beaucoup !\n\nVotre colis est en préparation et partira très prochainement. Je vous enverrai le numéro de suivi dès l'expédition." },
      { id: "m_exp", titre: "Expédition + numéro de suivi", texte:
"Bonjour {prenom} 📦\n\nBonne nouvelle : votre commande {numero} vient d'être expédiée via Mondial Relay !\n\nNuméro de suivi : {suivi}\nSuivre votre colis : {lien_suivi}\n\nPoint relais : {relais}\nVous recevrez un SMS de Mondial Relay dès son arrivée.\n\nMerci pour votre confiance ✨" },
      { id: "m_relais", titre: "Colis arrivé au point relais", texte:
"Bonjour {prenom},\n\nVotre colis est disponible au point relais {relais} 🎉\nPensez à vous munir d'une pièce d'identité et du code reçu par SMS.\n\nJ'espère que vos Beaux Essentiels vous plairont !" },
      { id: "m_dispo", titre: "Produit de nouveau disponible", texte:
"Bonjour {prenom} ✨\n\nVous m'aviez demandé d'être prévenue : {produit} est de nouveau disponible !\n\nLes quantités sont limitées. Souhaitez-vous que je vous en réserve ?\n\nBelle journée à vous 🌊" },
      { id: "m_avis", titre: "Remerciement & avis", texte:
"Bonjour {prenom} 🤍\n\nJ'espère que vous êtes ravie de votre commande !\n\nSi vous avez un instant, votre avis (ou une petite photo/vidéo) me ferait très plaisir et aiderait beaucoup ma jeune marque.\n\nVous pouvez aussi me retrouver sur TikTok et Instagram ✨\nMerci infiniment !" },
    ];
  }

  function structureVide() {
    return {
      version: 1,
      demo: false,
      settings: {
        fretParKg: 12,
        transportAdjame: 7.62,
        emballageDefaut: 0.5,
        fraisPortClient: 4.9,
        coutEtiquette: 4.4,
        margeCible: 60,
        objectifMensuel: 600,
        seuilDefaut: 3,
        relancePaiementJours: 3,
        relanceExpeditionJours: 2,
        compteurCommande: 0,
        lienSuivi: "https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition={suivi}",
        numeroWhatsApp: "",
      },
      lists: {
        categoriesProduits: [
          { id: "cat_classique", nom: "Bayas Classiques", seuil: 5, baya: true },
          { id: "cat_grandes", nom: "Bayas Grandes Perles", seuil: 5, baya: true },
          { id: "cat_melange", nom: "Mélanges de bayas", seuil: 2, compose: true },
          { id: "cat_musc", nom: "Mini muscs", seuil: 3 },
          { id: "cat_huile", nom: "Huiles corporelles", seuil: 3 },
          { id: "cat_pack", nom: "Packs", seuil: 2, compose: true },
        ],
        categoriesDepenses: ["Marchandise", "Fret", "Transport Abidjan", "Emballages", "Expédition", "Publicité", "Téléphone", "Matériel", "Autre"],
        moyensPaiement: ["Wero", "Virement instantané", "PayPal (biens et services)", "Lien de paiement carte", "Espèces"],
        plateformes: ["TikTok + Instagram", "TikTok", "Instagram"],
        typesContenu: ["Présentation produit", "Tutoriel / porté", "Unboxing / préparation colis", "Avis cliente", "Coulisses Abidjan", "Tendance / son viral", "Live", "Promo / annonce"],
      },
      produits: [],
      arrivages: [],
      ajustements: [],
      attente: [],
      clientes: [],
      commandes: [],
      depenses: [],
      publications: [],
      idees: [],
      legendes: [],
      stats: [],
      modeles: modelesParDefaut(),
    };
  }

  /* ---------- Chargement / sauvegarde ---------- */
  let data;
  function fusionDefauts(d) {
    const base = structureVide();
    const out = Object.assign({}, base, d);
    out.settings = Object.assign({}, base.settings, d.settings || {});
    out.lists = Object.assign({}, base.lists, d.lists || {});
    for (const k of Object.keys(base)) if (Array.isArray(base[k]) && !Array.isArray(out[k])) out[k] = base[k];
    return out;
  }
  function charger() {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) { data = fusionDefauts(JSON.parse(brut)); return; }
    } catch (e) { console.warn("Lecture impossible", e); }
    data = structureVide();
    remplirExemple(data);
    sauver();
  }
  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(data)); return true; }
    catch (e) {
      console.error(e);
      if (LBE.ui) LBE.ui.toast("Espace de stockage plein : exportez une sauvegarde puis supprimez d'anciennes données.", true);
      return false;
    }
  }

  LBE.store = {
    get d() { return data; },
    sauver,
    exporter() { return JSON.stringify(data, null, 2); },
    importer(texte) {
      const obj = JSON.parse(texte);
      if (!obj || typeof obj !== "object" || !obj.settings || !Array.isArray(obj.produits)) throw new Error("Ce fichier n'est pas une sauvegarde Les Beaux Essentiels.");
      data = fusionDefauts(obj);
      sauver();
    },
    effacerExemples() {
      for (const k of Object.keys(data)) if (Array.isArray(data[k])) data[k] = data[k].filter((x) => !(x && x.demo));
      data.demo = false;
      sauver();
    },
    toutEffacer() {
      const s = data.settings, l = data.lists, m = data.modeles;
      data = structureVide();
      data.settings = s; data.lists = l; data.modeles = m;
      sauver();
    },
    recharger() { data = structureVide(); remplirExemple(data); sauver(); },
    aDesExemples() { return Object.values(data).some((v) => Array.isArray(v) && v.some((x) => x && x.demo)); },
  };

  /* ---------- Accès ---------- */
  const trouver = (liste, id) => data[liste].find((x) => x.id === id);
  LBE.q = {
    produit: (id) => trouver("produits", id),
    cliente: (id) => trouver("clientes", id),
    commande: (id) => trouver("commandes", id),
    arrivage: (id) => trouver("arrivages", id),
    categorie: (id) => data.lists.categoriesProduits.find((c) => c.id === id),
    nomCategorie: (id) => (LBE.q.categorie(id) || {}).nom || "Sans catégorie",
    estCompose: (p) => !!(p && p.composants && p.composants.length),
    produitsSimples: () => data.produits.filter((p) => !LBE.q.estCompose(p) && p.statut !== "archive"),
    produitsActifs: () => data.produits.filter((p) => p.statut !== "archive"),
    estBaya: (p) => { const c = LBE.q.categorie(p.categorie); return !!(c && c.baya); },
  };

  /* ---------- Calculs : coûts ---------- */
  function poidsProduit(p) {
    if (!p) return 0;
    if (LBE.q.estCompose(p)) return p.composants.reduce((s, c) => s + poidsProduit(LBE.q.produit(c.produitId)) * c.qte, 0);
    return Number(p.poids) || 0;
  }
  // Répartition du fret + transport d'un arrivage sur ses lignes, au prorata du poids
  function detailArrivage(a) {
    const s = data.settings;
    const lignes = a.lignes.map((l) => {
      const p = LBE.q.produit(l.produitId);
      return { ...l, produit: p, poidsLigne: (Number(l.qte) || 0) * (poidsProduit(p) || 0) };
    });
    let poidsTotal = lignes.reduce((t, l) => t + l.poidsLigne, 0);
    const qteTotale = lignes.reduce((t, l) => t + (Number(l.qte) || 0), 0);
    const fraisCommuns = (Number(a.fret) || 0) + (Number(a.transport) || 0);
    lignes.forEach((l) => {
      const part = poidsTotal > 0 ? l.poidsLigne / poidsTotal : qteTotale > 0 ? l.qte / qteTotale : 0;
      l.fraisAlloues = fraisCommuns * part;
      l.fraisUnitaires = l.qte > 0 ? l.fraisAlloues / l.qte : 0;
      l.coutUnitaire = (Number(l.prixUnitaire) || 0) + l.fraisUnitaires;
    });
    const marchandise = lignes.reduce((t, l) => t + l.qte * (Number(l.prixUnitaire) || 0), 0);
    return { lignes, marchandise, fraisCommuns, total: marchandise + fraisCommuns, qteTotale, poidsTotal, s };
  }
  // Coût marchandise (achat + part de fret/transport), hors emballage
  function coutDetail(p) {
    if (!p) return { achat: 0, frais: 0 };
    if (LBE.q.estCompose(p)) {
      return p.composants.reduce((acc, c) => {
        const d = coutDetail(LBE.q.produit(c.produitId));
        acc.achat += d.achat * c.qte; acc.frais += d.frais * c.qte; return acc;
      }, { achat: 0, frais: 0 });
    }
    // Moyenne pondérée sur les arrivages
    let q = 0, achat = 0, frais = 0;
    for (const a of data.arrivages) {
      const det = detailArrivage(a);
      for (const l of det.lignes) if (l.produitId === p.id && l.qte > 0) {
        q += Number(l.qte); achat += l.qte * (Number(l.prixUnitaire) || 0); frais += l.fraisAlloues;
      }
    }
    if (q > 0) return { achat: achat / q, frais: frais / q, source: "arrivages" };
    // Estimation à partir du prix d'achat saisi sur la fiche
    const s = data.settings;
    return { achat: Number(p.prixAchat) || 0, frais: (poidsProduit(p) / 1000) * s.fretParKg, source: "estimation" };
  }
  function emballage(p) { return p.emballage === "" || p.emballage == null ? data.settings.emballageDefaut : Number(p.emballage) || 0; }
  function coutRevient(p) { const d = coutDetail(p); return d.achat + d.frais + emballage(p); }
  function marge(p) { const c = coutRevient(p); const prix = Number(p.prix) || 0; return { cout: c, marge: prix - c, pct: prix > 0 ? (prix - c) / prix : 0 }; }
  function prixConseille(cout) { const m = Math.min(Number(data.settings.margeCible) || 0, 95) / 100; const brut = cout / (1 - m); return Math.ceil(brut) - 0.1 > brut ? Math.ceil(brut) - 0.1 : Math.ceil(brut) + 0.9; }

  /* ---------- Calculs : stocks ---------- */
  function consommation() {
    // Quantités vendues par produit simple (les mélanges/packs consomment leurs composants)
    const conso = {};
    const ajoute = (pid, q, date, cmd) => { (conso[pid] = conso[pid] || []).push({ q, date, cmd }); };
    for (const c of data.commandes) {
      if (c.annulee) continue;
      for (const l of c.lignes) {
        const p = LBE.q.produit(l.produitId);
        if (LBE.q.estCompose(p)) p.composants.forEach((k) => ajoute(k.produitId, k.qte * l.qte, c.date, c));
        else ajoute(l.produitId, Number(l.qte) || 0, c.date, c);
      }
    }
    return conso;
  }
  function stockSimple(pid, conso) {
    let s = 0;
    for (const a of data.arrivages) for (const l of a.lignes) if (l.produitId === pid) s += Number(l.qte) || 0;
    for (const j of data.ajustements) if (j.produitId === pid) s += Number(j.qte) || 0;
    for (const v of (conso[pid] || [])) s -= v.q;
    return s;
  }
  function stock(p, conso) {
    conso = conso || consommation();
    if (!p) return 0;
    if (LBE.q.estCompose(p)) {
      let min = Infinity;
      for (const c of p.composants) min = Math.min(min, Math.floor(Math.max(0, stockSimple(c.produitId, conso)) / (c.qte || 1)));
      return min === Infinity ? 0 : min;
    }
    return stockSimple(p.id, conso);
  }
  function seuil(p) {
    if (p.seuil !== "" && p.seuil != null) return Number(p.seuil);
    const c = LBE.q.categorie(p.categorie);
    return c && c.seuil != null ? Number(c.seuil) : data.settings.seuilDefaut;
  }
  function niveau(p, st) {
    if (p.statut === "bientot") return "bientot";
    if (st <= 0) return "rupture";
    if (st <= seuil(p)) return "bas";
    return "ok";
  }
  function etatStocks() {
    const conso = consommation();
    return LBE.q.produitsActifs().map((p) => { const st = stock(p, conso); return { p, stock: st, seuil: seuil(p), niveau: niveau(p, st), attente: data.attente.filter((a) => a.produitId === p.id && !a.prevenue).length }; });
  }
  function mouvements() {
    const m = [];
    for (const a of data.arrivages) for (const l of a.lignes) m.push({ date: a.date, produitId: l.produitId, qte: Number(l.qte), type: "Arrivage", ref: a.libelle || "Arrivage Abidjan", lien: "#/stocks/arrivages" });
    for (const j of data.ajustements) m.push({ date: j.date, produitId: j.produitId, qte: Number(j.qte), type: "Ajustement", ref: j.motif || "", id: j.id });
    for (const c of data.commandes) {
      if (c.annulee) continue;
      for (const l of c.lignes) {
        const p = LBE.q.produit(l.produitId);
        if (LBE.q.estCompose(p)) p.composants.forEach((k) => m.push({ date: c.date, produitId: k.produitId, qte: -k.qte * l.qte, type: "Vente", ref: c.numero + " · " + p.nom, lien: "#/commandes/fiche/" + c.id }));
        else m.push({ date: c.date, produitId: l.produitId, qte: -l.qte, type: "Vente", ref: c.numero, lien: "#/commandes/fiche/" + c.id });
      }
    }
    return m.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
  }

  /* ---------- Calculs : commandes ---------- */
  function totalCommande(c) {
    const sousTotal = c.lignes.reduce((s, l) => s + (Number(l.qte) || 0) * (Number(l.prix) || 0), 0);
    return { sousTotal, port: Number(c.fraisPort) || 0, remise: Number(c.remise) || 0, total: sousTotal + (Number(c.fraisPort) || 0) - (Number(c.remise) || 0) };
  }
  function coutCommande(c) {
    return c.lignes.reduce((s, l) => { const p = LBE.q.produit(l.produitId); return s + (p ? coutRevient(p) * l.qte : 0); }, 0);
  }
  function statutCommande(c) {
    if (c.annulee) return { cle: "annulee", label: "Annulée", cls: "nodot" };
    if (c.paiement.statut !== "recu") return { cle: "paiement", label: "Paiement en attente", cls: "attente" };
    if (c.expedition.statut === "livree") return { cle: "livree", label: "Livrée", cls: "ok" };
    if (c.expedition.statut === "expediee") return { cle: "expediee", label: "Expédiée", cls: "info" };
    return { cle: "a_preparer", label: "À préparer", cls: "rose" };
  }
  function nouveauNumero() {
    data.settings.compteurCommande = (Number(data.settings.compteurCommande) || 0) + 1;
    return "LBE-" + String(data.settings.compteurCommande).padStart(4, "0");
  }

  /* ---------- Calculs : comptabilité ---------- */
  function recettes() {
    return data.commandes.filter((c) => !c.annulee && c.paiement.statut === "recu").map((c) => {
      const cl = LBE.q.cliente(c.clienteId);
      const t = totalCommande(c);
      return { date: c.paiement.date || c.date, ref: c.numero, cliente: cl ? cl.nom : "", nature: c.lignes.map((l) => { const p = LBE.q.produit(l.produitId); return l.qte + " × " + (p ? p.nom : "Produit supprimé"); }).join(", "), montant: t.total, port: t.port, moyen: c.paiement.moyen || "", commandeId: c.id };
    }).sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function depenses() {
    const out = data.depenses.map((d) => ({ ...d, montant: Number(d.montant) || 0, source: "manuelle" }));
    for (const a of data.arrivages) {
      const det = detailArrivage(a);
      const lib = a.libelle || "Arrivage Abidjan";
      if (det.marchandise) out.push({ id: "auto_m_" + a.id, date: a.date, categorie: "Marchandise", libelle: "Achats Adjamé — " + lib, montant: det.marchandise, source: "arrivage", demo: a.demo });
      if (Number(a.fret)) out.push({ id: "auto_f_" + a.id, date: a.date, categorie: "Fret", libelle: "Fret avion " + (a.poidsKg || "?") + " kg — " + lib, montant: Number(a.fret), source: "arrivage" });
      if (Number(a.transport)) out.push({ id: "auto_t_" + a.id, date: a.date, categorie: "Transport Abidjan", libelle: "Transport marché d'Adjamé — " + lib, montant: Number(a.transport), source: "arrivage" });
    }
    for (const c of data.commandes) {
      if (c.annulee) continue;
      if ((c.expedition.statut === "expediee" || c.expedition.statut === "livree") && Number(c.expedition.coutEtiquette)) {
        out.push({ id: "auto_e_" + c.id, date: c.expedition.date || c.date, categorie: "Expédition", libelle: "Étiquette Mondial Relay — " + c.numero, montant: Number(c.expedition.coutEtiquette), source: "commande" });
      }
    }
    return out.sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  function bilanMois(m, rec, dep) {
    rec = rec || recettes(); dep = dep || depenses();
    const r = rec.filter((x) => mois(x.date) === m).reduce((s, x) => s + x.montant, 0);
    const d = dep.filter((x) => mois(x.date) === m).reduce((s, x) => s + x.montant, 0);
    // Marge sur les ventes du mois (prix - coût de revient), pour un bénéfice « lissé »
    const ventes = data.commandes.filter((c) => !c.annulee && c.paiement.statut === "recu" && mois(c.paiement.date || c.date) === m);
    const margeVentes = ventes.reduce((s, c) => s + totalCommande(c).sousTotal - Number(c.remise || 0) - coutCommande(c), 0);
    return { recettes: r, depenses: d, benefice: r - d, margeVentes, nbVentes: ventes.length };
  }
  function derniersMois(n) {
    const out = []; const d = new Date(); d.setDate(1);
    for (let i = n - 1; i >= 0; i--) { const x = new Date(d.getFullYear(), d.getMonth() - i, 1); out.push(x.getFullYear() + "-" + z(x.getMonth() + 1)); }
    return out;
  }

  LBE.calc = { poidsProduit, detailArrivage, coutDetail, emballage, coutRevient, marge, prixConseille, consommation, stock, seuil, niveau, etatStocks, mouvements, totalCommande, coutCommande, statutCommande, nouveauNumero, recettes, depenses, bilanMois, derniersMois };

  /* =========================================================
     Données d'exemple (fictives) — toutes marquées demo: true
     ========================================================= */
  function remplirExemple(d) {
    const J = (n) => ajouterJours(aujourdhui(), n);
    d.demo = true;
    const P = (id, nom, categorie, prix, poids, prixAchat, description, extra) => Object.assign({ id, nom, categorie, prix, poids, prixAchat, description, photo: "", emballage: "", seuil: "", statut: "actif", composants: [], demo: true, cree: J(-60) }, extra || {});
    d.produits = [
      P("p_cl_nacre", "Classique Nacre", "cat_classique", 9, 40, 1.4, "Bayas à petites perles blanc nacré, deux rangs. Élégance discrète au quotidien."),
      P("p_cl_corail", "Classique Corail", "cat_classique", 9, 40, 1.4, "Petites perles corail lumineux, parfaites sur peau dorée."),
      P("p_cl_lagon", "Classique Lagon", "cat_classique", 9, 40, 1.4, "Petites perles bleu lagon, un éclat d'océan."),
      P("p_cl_or", "Classique Or", "cat_classique", 10, 40, 1.7, "Petites perles dorées, le classique incontournable."),
      P("p_gp_ivoire", "Grandes Perles Ivoire", "cat_grandes", 13, 75, 2.6, "Grandes perles ivoire au toucher soyeux."),
      P("p_gp_ambre", "Grandes Perles Ambre", "cat_grandes", 13, 75, 2.6, "Grandes perles ambrées, chaleureuses et généreuses."),
      P("p_gp_saphir", "Grandes Perles Saphir", "cat_grandes", 14, 75, 2.9, "Grandes perles bleu saphir, intenses et précieuses."),
      P("p_mu_vanille", "Mini musc Vanille", "cat_musc", 7, 30, 1.9, "Mini musc parfumé à la vanille, tenue longue durée."),
      P("p_mu_coton", "Mini musc Fleur de coton", "cat_musc", 7, 30, 1.9, "Mini musc propre et poudré, sensation de linge frais."),
      P("p_mu_ambre", "Mini musc Ambre doux", "cat_musc", 7, 30, 1.9, "Mini musc ambré, chaud et enveloppant."),
      P("p_hu_eclat", "Huile corporelle Éclat nacré", "cat_huile", 18, 120, 4.5, "Huile sèche aux reflets nacrés. Bientôt disponible !", { statut: "bientot" }),
      P("p_mel_aube", "Mélange Aube", "cat_melange", 25, 0, 0, "Trio Nacre, Corail et Grandes Perles Ivoire : la douceur d'un lever de soleil.", { composants: [{ produitId: "p_cl_nacre", qte: 1 }, { produitId: "p_cl_corail", qte: 1 }, { produitId: "p_gp_ivoire", qte: 1 }], emballage: 0.8 }),
      P("p_pack_douceur", "Pack Douceur", "cat_pack", 14.5, 0, 0, "Une Classique Lagon et un mini musc Fleur de coton.", { composants: [{ produitId: "p_cl_lagon", qte: 1 }, { produitId: "p_mu_coton", qte: 1 }], emballage: 0.7 }),
    ];

    d.arrivages = [
      { id: "a1", demo: true, date: J(-48), libelle: "Arrivage n°1", poidsKg: 3.8, fret: 45.6, transport: 7.62, note: "Premier arrivage, envoi par avion.", lignes: [
        { produitId: "p_cl_nacre", qte: 15, prixUnitaire: 1.4 }, { produitId: "p_cl_corail", qte: 12, prixUnitaire: 1.4 }, { produitId: "p_cl_lagon", qte: 12, prixUnitaire: 1.4 },
        { produitId: "p_gp_ivoire", qte: 8, prixUnitaire: 2.6 }, { produitId: "p_gp_ambre", qte: 8, prixUnitaire: 2.6 }, { produitId: "p_mu_vanille", qte: 10, prixUnitaire: 1.9 }, { produitId: "p_mu_coton", qte: 10, prixUnitaire: 1.9 } ] },
      { id: "a2", demo: true, date: J(-12), libelle: "Arrivage n°2", poidsKg: 2.9, fret: 34.8, transport: 7.62, note: "Réassort + nouveaux coloris.", lignes: [
        { produitId: "p_cl_nacre", qte: 10, prixUnitaire: 1.4 }, { produitId: "p_cl_or", qte: 12, prixUnitaire: 1.7 }, { produitId: "p_gp_saphir", qte: 6, prixUnitaire: 2.9 },
        { produitId: "p_gp_ivoire", qte: 5, prixUnitaire: 2.6 }, { produitId: "p_mu_ambre", qte: 10, prixUnitaire: 1.9 } ] },
    ];
    d.ajustements = [{ id: "aj1", demo: true, date: J(-30), produitId: "p_cl_corail", qte: -1, motif: "Perle cassée" }];

    d.clientes = [
      { id: "c1", nom: "Aïcha Koné", telephone: "+33 6 00 00 00 01", ville: "Lyon", relais: "Tabac de la Place — 69003", notes: "Adore les tons nacrés.", demo: true, cree: J(-45) },
      { id: "c2", nom: "Fatou Diallo", telephone: "+33 6 00 00 00 02", ville: "Paris 18e", relais: "Pressing Barbès — 75018", notes: "", demo: true, cree: J(-40) },
      { id: "c3", nom: "Mariam Traoré", telephone: "+33 6 00 00 00 03", ville: "Marseille", relais: "Épicerie du Port — 13002", notes: "Cliente fidèle, 3e commande.", demo: true, cree: J(-38) },
      { id: "c4", nom: "Nadia Benali", telephone: "+33 6 00 00 00 04", ville: "Lille", relais: "Relais Fleurs — 59000", notes: "", demo: true, cree: J(-20) },
      { id: "c5", nom: "Grâce Mbemba", telephone: "+33 6 00 00 00 05", ville: "Bordeaux", relais: "Librairie Saint-Pierre — 33000", notes: "Vue sur TikTok.", demo: true, cree: J(-9) },
      { id: "c6", nom: "Inès Lambert", telephone: "+33 6 00 00 00 06", ville: "Toulouse", relais: "Supérette Capitole — 31000", notes: "", demo: true, cree: J(-4) },
    ];
    const C = (n, jours, clienteId, lignes, pay, exp, extra) => Object.assign({
      id: "o" + n, demo: true, numero: "LBE-" + String(n).padStart(4, "0"), date: J(jours), clienteId,
      lignes: lignes.map(([produitId, qte]) => ({ produitId, qte, prix: d.produits.find((p) => p.id === produitId).prix })),
      fraisPort: 4.9, remise: 0, note: "",
      paiement: pay ? { statut: "recu", moyen: pay[0], date: J(jours + pay[1]) } : { statut: "attente", moyen: "", date: "" },
      expedition: exp ? { statut: exp[0], suivi: exp[1] || "", date: exp[2] != null ? J(jours + exp[2]) : "", coutEtiquette: 4.4 } : { statut: "a_preparer", suivi: "", date: "", coutEtiquette: 0 },
    }, extra || {});
    d.commandes = [
      C(1, -44, "c1", [["p_cl_nacre", 2], ["p_mu_vanille", 1]], ["Wero", 0], ["livree", "39871524", 1]),
      C(2, -40, "c2", [["p_gp_ambre", 1], ["p_cl_corail", 1]], ["PayPal (biens et services)", 1], ["livree", "39871877", 2]),
      C(3, -37, "c3", [["p_mel_aube", 1]], ["Virement instantané", 0], ["livree", "39872210", 1]),
      C(4, -33, "c1", [["p_pack_douceur", 2]], ["Wero", 0], ["livree", "39872901", 1]),
      C(5, -27, "c3", [["p_cl_corail", 3], ["p_gp_ivoire", 1]], ["Lien de paiement carte", 0], ["livree", "39873455", 2], { remise: 2 }),
      C(6, -19, "c4", [["p_cl_lagon", 2], ["p_mu_coton", 2]], ["Wero", 1], ["livree", "39874012", 1]),
      C(7, -10, "c3", [["p_gp_saphir", 2], ["p_cl_or", 1]], ["Virement instantané", 0], ["livree", "39874630", 1]),
      C(8, -7, "c2", [["p_cl_corail", 3], ["p_mu_ambre", 1]], ["Wero", 0], ["expediee", "39875118", 2]),
      C(9, -5, "c5", [["p_mel_aube", 1], ["p_mu_vanille", 1]], ["PayPal (biens et services)", 0], null),
      C(10, -3, "c6", [["p_gp_saphir", 2]], ["Wero", 1], null),
      C(11, -4, "c4", [["p_cl_or", 2], ["p_mu_ambre", 1]], null, null),
      C(12, -1, "c5", [["p_cl_lagon", 1], ["p_gp_ivoire", 1]], null, null),
    ];
    d.settings.compteurCommande = 12;

    d.attente = [
      ...["Sarah", "Kadiatou", "Léa", "Awa", "Mélissa", "Bintou"].map((n, i) => ({ id: "w_h" + i, demo: true, produitId: "p_hu_eclat", nom: n, telephone: "+33 6 00 00 01 0" + i, date: J(-20 + i * 3), prevenue: false })),
      ...["Christelle", "Yasmine", "Océane"].map((n, i) => ({ id: "w_s" + i, demo: true, produitId: "p_gp_saphir", nom: n, telephone: "+33 6 00 00 02 0" + i, date: J(-6 + i), prevenue: false })),
      { id: "w_c1", demo: true, produitId: "p_cl_corail", nom: "Rokia", telephone: "+33 6 00 00 03 01", date: J(-2), prevenue: false },
    ];

    d.depenses = [];
    for (let m = 0; m < 3; m++) {
      d.depenses.push({ id: "dt" + m, demo: true, date: J(-55 + m * 30), categorie: "Téléphone", libelle: "Forfait mobile (WhatsApp Business)", montant: 9.99 });
    }
    d.depenses.push(
      { id: "de1", demo: true, date: J(-50), categorie: "Emballages", libelle: "Commande Shein : pochettes satin + boîtes", montant: 23.9 },
      { id: "de2", demo: true, date: J(-15), categorie: "Emballages", libelle: "Commande Shein : stickers logo + papier de soie", montant: 14.5 },
      { id: "dp1", demo: true, date: J(-26), categorie: "Publicité", libelle: "Promotion TikTok (vidéo Mélange Aube)", montant: 15 },
      { id: "dm1", demo: true, date: J(-46), categorie: "Matériel", libelle: "Anneau lumineux pour les vidéos", montant: 18.99 },
    );

    const PUB = (id, j, plateforme, type, produitId, titre, statut, legende) => ({ id, demo: true, date: J(j), plateforme, type, produitId, titre, statut, legende: legende || "", hashtags: "#bayas #waistbeads #lesbeauxessentiels" });
    d.publications = [
      PUB("pu1", -9, "TikTok + Instagram", "Présentation produit", "p_gp_saphir", "Découverte des Grandes Perles Saphir", "publie"),
      PUB("pu2", -6, "TikTok", "Unboxing / préparation colis", "", "Préparation d'une commande en ASMR", "publie"),
      PUB("pu3", -3, "TikTok + Instagram", "Avis cliente", "p_mel_aube", "Retour de Mariam sur le Mélange Aube", "publie"),
      PUB("pu4", 1, "TikTok + Instagram", "Tutoriel / porté", "p_cl_or", "Comment porter ses bayas avec un jean taille haute", "a_tourner"),
      PUB("pu5", 3, "Instagram", "Présentation produit", "p_mu_ambre", "Carrousel : nos 3 mini muscs", "a_tourner"),
      PUB("pu6", 5, "TikTok", "Coulisses Abidjan", "", "Au cœur du marché d'Adjamé", "idee"),
      PUB("pu7", 8, "TikTok + Instagram", "Promo / annonce", "p_hu_eclat", "Teasing : l'huile Éclat nacré arrive", "idee"),
    ];
    d.idees = [
      { id: "i1", demo: true, titre: "Avant / après : tenue de plage avec bayas", type: "Tendance / son viral", produitId: "p_cl_lagon", note: "Lumière du matin, sur fond de mer si possible." },
      { id: "i2", demo: true, titre: "Les 3 erreurs à éviter quand on choisit sa taille de bayas", type: "Tutoriel / porté", produitId: "", note: "Format face caméra, sous-titres." },
      { id: "i3", demo: true, titre: "Composer son mélange en direct", type: "Live", produitId: "p_mel_aube", note: "Faire voter les abonnées pour les couleurs." },
      { id: "i4", demo: true, titre: "Signification des couleurs de perles", type: "Présentation produit", produitId: "", note: "Série en 3 épisodes." },
    ];
    d.legendes = [
      { id: "l1", demo: true, titre: "Lancement produit", texte: "✨ Nouveauté chez Les Beaux Essentiels ✨\nDes perles choisies une à une au marché d'Adjamé, pour sublimer vos courbes.\nCommandez directement sur WhatsApp (lien en bio) 🌊", hashtags: "#bayas #waistbeads #perlesdehanche #lesbeauxessentiels #beautenoire #madeinabidjan" },
      { id: "l2", demo: true, titre: "Avis cliente", texte: "Vos retours me touchent tellement 🤍 Merci pour votre confiance !\nVous aussi, partagez vos photos en m'identifiant ✨", hashtags: "#avisclient #bayas #waistbeads #lesbeauxessentiels" },
      { id: "l3", demo: true, titre: "Mini muscs", texte: "Petit format, grand sillage 🌸\nNos mini muscs se glissent partout : sac, poche, trousse.\nQuelle senteur vous ressemble ?", hashtags: "#musc #parfum #minimusc #lesbeauxessentiels #senteurs" },
    ];
    d.stats = [];
    let abT = 120, abI = 210;
    for (let s = 8; s >= 0; s--) {
      const date = J(-s * 7);
      const k = 8 - s;
      abT += 30 + k * 9 + (k % 3) * 7; abI += 12 + k * 4;
      d.stats.push({ id: "st_t" + s, demo: true, date, plateforme: "TikTok", vues: 900 + k * 420 + (k % 2) * 650, likes: 70 + k * 35, abonnes: abT, messages: 2 + Math.round(k * 1.2) });
      d.stats.push({ id: "st_i" + s, demo: true, date, plateforme: "Instagram", vues: 400 + k * 150, likes: 45 + k * 14, abonnes: abI, messages: 1 + Math.round(k * 0.6) });
    }
  }

  charger();
})();
