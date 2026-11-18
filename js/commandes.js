/* =========================================================
   Module 4 — Commandes & clientes
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, q } = LBE;
  const S = () => LBE.store.d;
  let filtre = "actives", recherche = "", rechCli = "";

  const FILTRES = [["actives", "En cours"], ["paiement", "À encaisser"], ["a_preparer", "À préparer"], ["expediee", "Expédiées"], ["livree", "Livrées"], ["toutes", "Toutes"], ["annulee", "Annulées"]];

  function rendre(el, params) {
    const vue = params[0] || "liste";
    if (vue === "fiche") return rendreFiche(el, params[1]);
    if (vue === "cliente") return rendreCliente(el, params[1]);
    el.innerHTML = ui.entete("Module 4", "Commandes & clientes",
      (vue === "clientes" ? '<button class="btn primaire" data-act="cli">' + icon("plus") + " Nouvelle cliente</button>" : '<button class="btn primaire" data-act="cmd">' + icon("plus") + " Nouvelle commande</button>")) +
      ui.tabs("commandes", [["liste", "Commandes"], ["clientes", "Clientes"]], vue === "clientes" ? "clientes" : "liste") + '<div id="cmd-contenu"></div>';
    const b = el.querySelector("[data-act]");
    b.onclick = () => (vue === "clientes" ? ficheClienteModale(null) : ficheCommande(null));
    const c = el.querySelector("#cmd-contenu");
    if (vue === "clientes") rendreClientes(c); else rendreListe(c);
  }

  /* ---------- Liste des commandes ---------- */
  function ligneCommande(c) {
    const cl = q.cliente(c.clienteId);
    const t = calc.totalCommande(c);
    const s = calc.statutCommande(c);
    const nb = c.lignes.reduce((n, l) => n + Number(l.qte), 0);
    return '<div class="rowi cliquable" data-cmd="' + c.id + '"><div class="avatar">' + esc(f.initiales(cl ? cl.nom : "?")) + '</div><div class="principal"><div class="titre">' + esc(cl ? cl.nom : "Cliente supprimée") + '</div><div class="meta">' + esc(c.numero) + " · " + f.date(c.date) + " · " + nb + " article" + (nb > 1 ? "s" : "") + '</div></div><div class="droite"><span class="montant">' + f.euro(t.total) + '</span><span class="badge ' + s.cls + '">' + s.label + "</span></div></div>";
  }
  function rendreListe(el) {
    let cmds = [...S().commandes].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.numero.localeCompare(a.numero)));
    const compte = {};
    cmds.forEach((c) => { const k = calc.statutCommande(c).cle; compte[k] = (compte[k] || 0) + 1; });
    compte.actives = (compte.paiement || 0) + (compte.a_preparer || 0) + (compte.expediee || 0);
    compte.toutes = cmds.length;
    cmds = cmds.filter((c) => { const k = calc.statutCommande(c).cle; return filtre === "toutes" || (filtre === "actives" ? ["paiement", "a_preparer", "expediee"].includes(k) : k === filtre); });
    if (recherche) { const r = recherche.toLowerCase(); cmds = cmds.filter((c) => { const cl = q.cliente(c.clienteId); return (c.numero + " " + (cl ? cl.nom + " " + cl.ville : "") + " " + (c.expedition.suivi || "")).toLowerCase().includes(r); }); }
    el.innerHTML = '<div class="row-flex mb"><label class="search">' + icon("recherche") + '<input type="search" id="rech" placeholder="Cliente, n° de commande, n° de suivi…" value="' + esc(recherche) + '"></label></div>' +
      '<nav class="tabs">' + FILTRES.map(([k, l]) => '<a href="#" data-f="' + k + '" class="' + (k === filtre ? "actif" : "") + '">' + l + (compte[k] ? " · " + compte[k] : "") + "</a>").join("") + "</nav>" +
      '<div class="card">' + (cmds.length ? '<div class="rows">' + cmds.map(ligneCommande).join("") + "</div>" : ui.vide("Aucune commande dans cette vue.")) + "</div>";
    el.querySelectorAll("[data-f]").forEach((a) => (a.onclick = (e) => { e.preventDefault(); filtre = a.dataset.f; rendreListe(el); }));
    el.querySelectorAll("[data-cmd]").forEach((r) => (r.onclick = () => LBE.aller("#/commandes/fiche/" + r.dataset.cmd)));
    const r = el.querySelector("#rech");
    r.oninput = () => { recherche = r.value; rendreListe(el); const n = el.querySelector("#rech"); n.focus(); n.setSelectionRange(recherche.length, recherche.length); };
  }

  /* ---------- Fiche commande ---------- */
  function rendreFiche(el, id) {
    const c = q.commande(id);
    if (!c) { el.innerHTML = '<div class="card">' + ui.vide("Commande introuvable.", '<a class="btn" href="#/commandes">Retour</a>') + "</div>"; return; }
    const cl = q.cliente(c.clienteId) || { nom: "Cliente supprimée", telephone: "" };
    const t = calc.totalCommande(c);
    const s = calc.statutCommande(c);
    const cout = calc.coutCommande(c);
    const benef = t.total - cout - (Number(c.expedition.coutEtiquette) || (c.expedition.statut === "a_preparer" ? S().settings.coutEtiquette : 0));
    const lien = c.expedition.suivi ? S().settings.lienSuivi.replace("{suivi}", encodeURIComponent(c.expedition.suivi)) : "";
    const paye = c.paiement.statut === "recu";
    const etapes = [["Commande", true], ["Payée", paye], ["Expédiée", c.expedition.statut !== "a_preparer"], ["Livrée", c.expedition.statut === "livree"]];
    // Messages proposés selon l'étape
    const suggeres = c.annulee ? [] : !paye ? ["m_conf", "m_paie"] : c.expedition.statut === "a_preparer" ? ["m_recu"] : c.expedition.statut === "expediee" ? ["m_exp", "m_relais"] : ["m_avis"];
    el.innerHTML =
      '<div class="page-head" style="align-items:center"><div class="row-flex"><a class="btn icone" href="#/commandes" aria-label="Retour">' + icon("retour") + '</a><div><div class="sur-titre" style="display:block">Commande</div><h1 style="display:block">' + esc(c.numero) + '</h1></div></div><div class="actions"><button class="btn" data-act="modif">' + icon("crayon") + ' Modifier</button><button class="btn" data-act="annul">' + (c.annulee ? "Réactiver" : "Annuler la commande") + "</button></div></div>" +
      '<div class="card mb"><div class="row-flex" style="justify-content:space-between">' +
      '<div class="row-flex" style="gap:6px">' + etapes.map(([l, ok], i) => '<span class="badge ' + (ok ? "ok" : "nodot") + '">' + (i + 1) + ". " + l + "</span>").join("") + '</div><span class="badge ' + s.cls + '">' + s.label + "</span></div></div>" +
      '<div class="grid g2">' +
      // Colonne gauche
      '<div class="stack">' +
      '<div class="card"><div class="card-head"><h3>' + icon("clientes") + " " + esc(cl.nom) + '</h3><a class="btn petit" href="#/commandes/cliente/' + c.clienteId + '">Fiche</a></div>' +
      '<div class="rows"><div class="rowi"><div class="principal"><div class="meta">Téléphone</div><div class="titre">' + esc(cl.telephone || "—") + "</div></div>" + (cl.telephone ? '<a class="btn petit whatsapp" target="_blank" rel="noopener" href="' + ui.lienWhatsApp(cl.telephone) + '">' + icon("whatsapp") + " WhatsApp</a>" : "") + "</div>" +
      '<div class="rowi"><div class="principal"><div class="meta">Ville</div><div class="titre">' + esc(cl.ville || "—") + '</div></div></div><div class="rowi"><div class="principal"><div class="meta">Point relais Mondial Relay</div><div class="titre">' + esc(cl.relais || "—") + "</div></div></div></div></div>" +
      '<div class="card"><h3>' + icon("commandes") + " Articles</h3><div class=\"rows\">" + c.lignes.map((l) => { const p = q.produit(l.produitId); return '<div class="rowi">' + ui.vignette(p) + '<div class="principal"><div class="titre">' + esc(p ? p.nom : "Produit supprimé") + '</div><div class="meta">' + l.qte + " × " + f.euro(l.prix) + '</div></div><span class="montant">' + f.euro(l.qte * l.prix) + "</span></div>"; }).join("") + "</div>" +
      '<div class="recap mt"><div class="l"><span>Sous-total</span><span>' + f.euro(t.sousTotal) + '</span></div><div class="l"><span>Frais de port</span><span>' + f.euro(t.port) + "</span></div>" + (t.remise ? '<div class="l"><span>Remise</span><span>−' + f.euro(t.remise) + "</span></div>" : "") + '<div class="l total"><span>Total à payer</span><span>' + f.euro(t.total) + '</span></div><div class="l doux"><span>Bénéfice estimé (après coût de revient et étiquette)</span><span>' + f.euro(benef) + "</span></div></div>" +
      (c.note ? '<p class="mt doux"><b>Note :</b> ' + esc(c.note) + "</p>" : "") + "</div></div>" +
      // Colonne droite
      '<div class="stack">' +
      '<div class="card"><div class="card-head"><h3>' + icon("euro") + ' Paiement</h3><span class="badge ' + (paye ? "ok" : "attente") + '">' + (paye ? "Reçu" : "En attente") + "</span></div>" +
      (paye ? '<p class="doux" style="margin:0 0 10px">Reçu le ' + f.date(c.paiement.date) + " par <b>" + esc(c.paiement.moyen || "—") + '</b>.</p><button class="btn petit" data-act="impaye">' + icon("annuler") + " Repasser en attente</button>"
        : '<div class="form"><div class="g2 grid">' + ui.champ("Moyen de paiement", "moyen", c.paiement.moyen || S().lists.moyensPaiement[0], { type: "select", options: S().lists.moyensPaiement }) + ui.champ("Date de réception", "datePaie", LBE.util.aujourdhui(), { type: "date" }) + '</div><button class="btn primaire" data-act="paye">' + icon("check") + " Marquer comme payée</button></div>") + "</div>" +
      '<div class="card"><div class="card-head"><h3>' + icon("camion") + ' Expédition Mondial Relay</h3><span class="badge ' + (c.expedition.statut === "livree" ? "ok" : c.expedition.statut === "expediee" ? "info" : "rose") + '">' + ({ a_preparer: "À préparer", expediee: "Expédiée", livree: "Livrée" }[c.expedition.statut]) + "</span></div>" +
      (c.expedition.statut === "a_preparer"
        ? (paye ? "" : '<div class="alerte-ligne">' + icon("alerte") + "<span>Attendez la réception du paiement avant d'expédier.</span></div>") +
          '<ol class="doux" style="padding-left:18px;margin:0 0 12px;font-size:.88rem"><li>Créez l\'étiquette sur le site Mondial Relay (envoi depuis un point relais).</li><li>Déposez le colis dans un point relais proche de chez vous.</li><li>Saisissez le numéro de suivi ci-dessous puis envoyez le message d\'expédition.</li></ol>' +
          '<div class="form"><div class="g2 grid">' + ui.champ("N° de suivi", "suivi", c.expedition.suivi, { placeholder: "ex. 39876543" }) + ui.champ("Coût de l'étiquette (€)", "coutEtiquette", S().settings.coutEtiquette, { type: "number" }) + '</div><div class="row-flex"><button class="btn primaire" data-act="expedier">' + icon("camion") + ' Marquer comme expédiée</button><a class="btn" href="https://www.mondialrelay.fr/" target="_blank" rel="noopener">' + icon("lien") + " Site Mondial Relay</a></div></div>"
        : '<div class="rows"><div class="rowi"><div class="principal"><div class="meta">N° de suivi</div><div class="titre">' + esc(c.expedition.suivi || "—") + "</div></div>" + (c.expedition.suivi ? '<button class="btn icone petit" data-copie="' + esc(c.expedition.suivi) + '">' + icon("copier") + '</button><a class="btn petit" target="_blank" rel="noopener" href="' + esc(lien) + '">Suivre</a>' : "") + '</div><div class="rowi"><div class="principal"><div class="meta">Expédiée le</div><div class="titre">' + f.date(c.expedition.date) + '</div></div><div class="droite"><span class="doux" style="font-size:.8rem">étiquette ' + f.euro(c.expedition.coutEtiquette) + "</span></div></div></div>" +
          '<div class="row-flex mt">' + (c.expedition.statut === "expediee" ? '<button class="btn primaire" data-act="livree">' + icon("check") + " Marquer comme livrée</button>" : "") + '<button class="btn petit" data-act="reexp">' + icon("annuler") + " Revenir à « à préparer »</button></div>") + "</div>" +
      '<div class="card"><h3>' + icon("messages") + " Messages WhatsApp</h3>" +
      '<div class="row-flex">' + S().modeles.map((m) => '<button class="btn petit ' + (suggeres.includes(m.id) ? "sable" : "") + '" data-msg="' + m.id + '">' + esc(m.titre) + "</button>").join("") + '</div><p class="aide mt">Les boutons dorés correspondent à l\'étape actuelle de la commande.</p></div>' +
      "</div></div>";

    const act = (k, fn) => { const b = el.querySelector('[data-act="' + k + '"]'); if (b) b.onclick = fn; };
    const save = (msg) => { LBE.store.sauver(); if (msg) ui.toast(msg); LBE.rafraichir(); };
    act("modif", () => ficheCommande(c));
    act("annul", () => ui.confirmer(c.annulee ? "Réactiver cette commande ?" : "Annuler cette commande ? Les articles seront remis en stock.", () => { c.annulee = !c.annulee; save(c.annulee ? "Commande annulée" : "Commande réactivée"); }));
    act("paye", () => { c.paiement = { statut: "recu", moyen: el.querySelector('[name="moyen"]').value, date: el.querySelector('[name="datePaie"]').value || LBE.util.aujourdhui() }; save("Paiement enregistré ✓"); proposerMessage(c, "m_recu"); });
    act("impaye", () => { c.paiement = { statut: "attente", moyen: c.paiement.moyen, date: "" }; save("Paiement repassé en attente"); });
    act("expedier", () => {
      const suivi = el.querySelector('[name="suivi"]').value.trim();
      if (!suivi) { ui.toast("Saisissez le numéro de suivi Mondial Relay.", true); return; }
      c.expedition = { statut: "expediee", suivi, date: LBE.util.aujourdhui(), coutEtiquette: Number(el.querySelector('[name="coutEtiquette"]').value) || 0 };
      save("Commande expédiée ✓"); proposerMessage(c, "m_exp");
    });
    act("livree", () => { c.expedition.statut = "livree"; save("Commande livrée 🎉"); proposerMessage(c, "m_avis"); });
    act("reexp", () => { c.expedition = { statut: "a_preparer", suivi: c.expedition.suivi, date: "", coutEtiquette: 0 }; save(); });
    el.querySelectorAll("[data-msg]").forEach((b) => (b.onclick = () => proposerMessage(c, b.dataset.msg)));
    el.querySelectorAll("[data-copie]").forEach((b) => (b.onclick = () => ui.copier(b.dataset.copie, "Numéro de suivi copié ✓")));
  }

  function proposerMessage(c, modeleId) {
    const cl = q.cliente(c.clienteId) || {};
    const m = S().modeles.find((x) => x.id === modeleId);
    if (!m) return;
    const texte = LBE.messages.remplir(modeleId, LBE.messages.contexteCommande(c));
    ui.modale({
      titre: m.titre,
      corps: '<div class="message-modele bulle">' + esc(texte) + "</div>",
      boutons: [
        { label: icon("copier") + " Copier", action: () => ui.copier(texte, "Message copié ✓") },
        { label: icon("whatsapp") + " Envoyer sur WhatsApp", cls: "whatsapp", action: (fermer) => { window.open(ui.lienWhatsApp(cl.telephone, texte), "_blank"); fermer(); } },
      ],
    });
  }

  /* ---------- Création / modification de commande ---------- */
  function ficheCommande(c, clienteIdPreset) {
    const nouveau = !c;
    const s = S().settings;
    c = c || { id: "", numero: "", date: LBE.util.aujourdhui(), clienteId: clienteIdPreset || "", lignes: [], fraisPort: s.fraisPortClient, remise: 0, note: "", paiement: { statut: "attente", moyen: "", date: "" }, expedition: { statut: "a_preparer", suivi: "", date: "", coutEtiquette: 0 } };
    const clientes = [...S().clientes].sort((a, b) => a.nom.localeCompare(b.nom));
    const prods = q.produitsActifs().filter((p) => p.statut === "actif" || c.lignes.some((l) => l.produitId === p.id));
    const conso = calc.consommation();
    // Le stock affiché ajoute ce que la commande en cours consomme déjà (en modification)
    const opts = prods.map((p) => '<option value="' + p.id + '" data-prix="' + p.prix + '">' + esc(p.nom) + " — " + f.euro(p.prix) + " (stock " + calc.stock(p, conso) + ")</option>").join("");
    const ligne = (l) => '<div class="ligne-edit" data-ligne><select data-k="produitId">' + opts.replace('value="' + l.produitId + '"', 'value="' + l.produitId + '" selected') + '</select><input type="number" data-k="qte" min="1" step="1" value="' + (l.qte || 1) + '" inputmode="numeric"><input type="number" data-k="prix" step="0.01" value="' + (l.prix != null ? l.prix : "") + '" inputmode="decimal"><button type="button" class="btn icone petit fantome" data-suppr>' + icon("fermer") + "</button></div>";
    const corps =
      '<div class="champ"><span>Cliente *</span><select name="clienteId"><option value="">— Choisir une cliente —</option><option value="__new">＋ Nouvelle cliente…</option>' + clientes.map((x) => '<option value="' + x.id + '"' + (x.id === c.clienteId ? " selected" : "") + ">" + esc(x.nom) + (x.ville ? " · " + esc(x.ville) : "") + "</option>").join("") + "</select></div>" +
      '<div id="new-cli" class="hidden card nacre" style="padding:14px"><div class="form"><div class="g2 grid">' + ui.champ("Nom", "n_nom", "") + ui.champ("Téléphone", "n_tel", "", { type: "tel", placeholder: "+33 6 …" }) + "</div>" + '<div class="g2 grid">' + ui.champ("Ville", "n_ville", "") + ui.champ("Point relais", "n_relais", "", { placeholder: "Nom + code postal" }) + "</div></div></div>" +
      ui.champ("Date de commande", "date", c.date, { type: "date" }) +
      '<div class="champ"><span>Articles <small class="doux">(produit · quantité · prix unitaire)</small></span><div class="lignes-edit" id="lignes">' + (c.lignes.length ? c.lignes : [{ produitId: prods[0] && prods[0].id, qte: 1, prix: prods[0] && prods[0].prix }]).map(ligne).join("") + '</div><button type="button" class="btn petit mt" id="ajout-l">' + icon("plus") + " Ajouter un article</button></div>" +
      '<div class="g2 grid">' + ui.champ("Frais de port facturés (€)", "fraisPort", c.fraisPort, { type: "number" }) + ui.champ("Remise (€)", "remise", c.remise || "", { type: "number" }) + "</div>" +
      (nouveau ? '<div class="g2 grid">' + ui.champ("Paiement", "paieStatut", "attente", { type: "select", options: [["attente", "En attente"], ["recu", "Déjà reçu"]] }) + ui.champ("Moyen de paiement", "paieMoyen", S().lists.moyensPaiement[0], { type: "select", options: S().lists.moyensPaiement }) + "</div>" : "") +
      ui.champ("Note", "note", c.note, { type: "textarea", placeholder: "Taille souhaitée, emballage cadeau…" }) +
      '<div id="recap-cmd"></div>';
    ui.modale({
      titre: nouveau ? "Nouvelle commande" : "Modifier " + c.numero, corps, large: true,
      supprimer: nouveau ? null : () => { S().commandes = S().commandes.filter((x) => x.id !== c.id); LBE.store.sauver(); ui.toast("Commande supprimée"); LBE.aller("#/commandes"); },
      onOuvrir: (el) => {
        const zone = el.querySelector("#lignes");
        const lire = () => [...zone.querySelectorAll("[data-ligne]")].map((l) => ({ produitId: l.querySelector('[data-k="produitId"]').value, qte: Number(l.querySelector('[data-k="qte"]').value) || 0, prix: Number(l.querySelector('[data-k="prix"]').value) || 0 })).filter((l) => l.produitId && l.qte > 0);
        el._lire = lire;
        const sel = el.querySelector('[name="clienteId"]');
        sel.onchange = () => el.querySelector("#new-cli").classList.toggle("hidden", sel.value !== "__new");
        const maj = () => {
          const v = ui.valeurs(el.querySelector("form"));
          const tmp = { lignes: lire(), fraisPort: v.fraisPort, remise: v.remise };
          const t = calc.totalCommande(tmp);
          // Vérification des stocks
          const besoin = {};
          tmp.lignes.forEach((l) => { const p = q.produit(l.produitId); if (q.estCompose(p)) p.composants.forEach((k) => (besoin[k.produitId] = (besoin[k.produitId] || 0) + k.qte * l.qte)); else besoin[l.produitId] = (besoin[l.produitId] || 0) + l.qte; });
          const deja = {};
          if (!nouveau) c.lignes.forEach((l) => { const p = q.produit(l.produitId); if (q.estCompose(p)) p.composants.forEach((k) => (deja[k.produitId] = (deja[k.produitId] || 0) + k.qte * l.qte)); else deja[l.produitId] = (deja[l.produitId] || 0) + Number(l.qte); });
          const manques = Object.entries(besoin).filter(([pid, n]) => n > calc.stock(q.produit(pid), conso) + (deja[pid] || 0)).map(([pid]) => q.produit(pid).nom);
          el.querySelector("#recap-cmd").innerHTML = (manques.length ? '<div class="alerte-ligne danger">' + icon("alerte") + "<span>Stock insuffisant : " + manques.map(esc).join(", ") + "</span></div>" : "") +
            '<div class="recap"><div class="l"><span>Sous-total</span><span>' + f.euro(t.sousTotal) + '</span></div><div class="l"><span>Port</span><span>' + f.euro(t.port) + "</span></div>" + (t.remise ? '<div class="l"><span>Remise</span><span>−' + f.euro(t.remise) + "</span></div>" : "") + '<div class="l total"><span>Total</span><span>' + f.euro(t.total) + "</span></div></div>";
        };
        el.querySelector("#ajout-l").onclick = () => { zone.insertAdjacentHTML("beforeend", ligne({ produitId: prods[0] && prods[0].id, qte: 1, prix: prods[0] && prods[0].prix })); maj(); };
        zone.addEventListener("change", (e) => { if (e.target.matches("select")) { const o = e.target.selectedOptions[0]; e.target.closest("[data-ligne]").querySelector('[data-k="prix"]').value = o.dataset.prix; maj(); } });
        zone.addEventListener("click", (e) => { const b = e.target.closest("[data-suppr]"); if (b) { b.closest("[data-ligne]").remove(); maj(); } });
        el.querySelector("form").addEventListener("input", maj);
        maj();
      },
      soumettre: { label: nouveau ? "Créer la commande" : "Enregistrer", action: (v, el) => {
        const lignes = el._lire();
        if (!lignes.length) { ui.toast("Ajoutez au moins un article.", true); return false; }
        let clienteId = v.clienteId;
        if (clienteId === "__new") {
          if (!v.n_nom) { ui.toast("Indiquez le nom de la nouvelle cliente.", true); return false; }
          const cl = { id: LBE.util.uid(), nom: v.n_nom, telephone: v.n_tel, ville: v.n_ville, relais: v.n_relais, notes: "", cree: LBE.util.aujourdhui() };
          S().clientes.push(cl); clienteId = cl.id;
        }
        if (!clienteId) { ui.toast("Choisissez une cliente.", true); return false; }
        Object.assign(c, { clienteId, date: v.date || LBE.util.aujourdhui(), lignes, fraisPort: v.fraisPort || 0, remise: v.remise || 0, note: v.note });
        if (nouveau) {
          c.id = LBE.util.uid(); c.numero = calc.nouveauNumero();
          if (v.paieStatut === "recu") c.paiement = { statut: "recu", moyen: v.paieMoyen, date: c.date };
          S().commandes.push(c);
        }
        LBE.store.sauver(); ui.toast(nouveau ? "Commande " + c.numero + " créée ✓" : "Commande enregistrée ✓");
        if (nouveau) { LBE.aller("#/commandes/fiche/" + c.id); setTimeout(() => proposerMessage(c, "m_conf"), 150); } else LBE.rafraichir();
      } },
    });
  }

  /* ---------- Clientes ---------- */
  function statsCliente(id) {
    const cmds = S().commandes.filter((c) => c.clienteId === id && !c.annulee);
    const total = cmds.filter((c) => c.paiement.statut === "recu").reduce((s, c) => s + calc.totalCommande(c).total, 0);
    const derniere = cmds.map((c) => c.date).sort().pop();
    return { cmds, nb: cmds.length, total, derniere };
  }
  function rendreClientes(el) {
    let cl = S().clientes.map((c) => ({ c, ...statsCliente(c.id) })).sort((a, b) => b.total - a.total || a.c.nom.localeCompare(b.c.nom));
    if (rechCli) { const r = rechCli.toLowerCase(); cl = cl.filter((x) => (x.c.nom + " " + x.c.ville + " " + x.c.telephone).toLowerCase().includes(r)); }
    el.innerHTML = '<div class="row-flex mb"><label class="search">' + icon("recherche") + '<input type="search" id="rech-cli" placeholder="Nom, ville, téléphone…" value="' + esc(rechCli) + '"></label></div>' +
      '<div class="card">' + (cl.length ? '<div class="rows">' + cl.map((x) => '<div class="rowi cliquable" data-cli="' + x.c.id + '"><div class="avatar">' + esc(f.initiales(x.c.nom)) + '</div><div class="principal"><div class="titre">' + esc(x.c.nom) + (x.nb >= 3 ? ' <span class="badge sable nodot">Fidèle</span>' : "") + '</div><div class="meta">' + esc(x.c.ville || "—") + " · " + x.nb + " commande" + (x.nb > 1 ? "s" : "") + (x.derniere ? " · dernière le " + f.date(x.derniere) : "") + '</div></div><div class="droite"><span class="montant">' + f.euro(x.total) + "</span></div></div>").join("") + "</div>" : ui.vide("Aucune cliente.")) + "</div>";
    el.querySelectorAll("[data-cli]").forEach((r) => (r.onclick = () => LBE.aller("#/commandes/cliente/" + r.dataset.cli)));
    const r = el.querySelector("#rech-cli");
    r.oninput = () => { rechCli = r.value; rendreClientes(el); const n = el.querySelector("#rech-cli"); n.focus(); n.setSelectionRange(rechCli.length, rechCli.length); };
  }
  function rendreCliente(el, id) {
    const c = q.cliente(id);
    if (!c) { el.innerHTML = '<div class="card">' + ui.vide("Cliente introuvable.", '<a class="btn" href="#/commandes/clientes">Retour</a>') + "</div>"; return; }
    const st = statsCliente(id);
    const panier = st.nb ? st.total / Math.max(1, st.cmds.filter((x) => x.paiement.statut === "recu").length) : 0;
    const favoris = {};
    st.cmds.forEach((cmd) => cmd.lignes.forEach((l) => (favoris[l.produitId] = (favoris[l.produitId] || 0) + Number(l.qte))));
    const top = Object.entries(favoris).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const attente = S().attente.filter((a) => a.telephone && c.telephone && a.telephone.replace(/\D/g, "") === c.telephone.replace(/\D/g, ""));
    el.innerHTML =
      '<div class="page-head" style="align-items:center"><div class="row-flex"><a class="btn icone" href="#/commandes/clientes" aria-label="Retour">' + icon("retour") + '</a><div class="avatar" style="width:52px;height:52px;font-size:1.1rem">' + esc(f.initiales(c.nom)) + '</div><div><div class="sur-titre" style="display:block">Fiche cliente</div><h1 style="display:block">' + esc(c.nom) + '</h1></div></div><div class="actions"><button class="btn" data-act="modif">' + icon("crayon") + ' Modifier</button><button class="btn primaire" data-act="cmd">' + icon("plus") + " Nouvelle commande</button></div></div>" +
      '<div class="grid g3 mb"><div class="card kpi"><div class="label">Commandes</div><div class="valeur">' + st.nb + '</div></div><div class="card kpi sable"><div class="label">Total dépensé</div><div class="valeur">' + f.euro(st.total) + '</div></div><div class="card kpi rose"><div class="label">Panier moyen</div><div class="valeur">' + f.euro(panier) + "</div></div></div>" +
      '<div class="grid g2"><div class="card"><h3>Coordonnées</h3><div class="rows">' +
      '<div class="rowi"><div class="principal"><div class="meta">Téléphone</div><div class="titre">' + esc(c.telephone || "—") + "</div></div>" + (c.telephone ? '<a class="btn petit whatsapp" target="_blank" rel="noopener" href="' + ui.lienWhatsApp(c.telephone) + '">' + icon("whatsapp") + " Écrire</a>" : "") + "</div>" +
      '<div class="rowi"><div class="principal"><div class="meta">Ville</div><div class="titre">' + esc(c.ville || "—") + "</div></div></div>" +
      '<div class="rowi"><div class="principal"><div class="meta">Point relais</div><div class="titre">' + esc(c.relais || "—") + "</div></div></div>" +
      (c.notes ? '<div class="rowi"><div class="principal"><div class="meta">Notes</div><div>' + esc(c.notes) + "</div></div></div>" : "") +
      "</div>" + (top.length ? '<div class="separateur"></div><div class="meta doux" style="font-size:.82rem;margin-bottom:6px">Produits préférés</div><div class="chips">' + top.map(([pid, n]) => '<span class="chip" style="padding-right:12px">' + esc((q.produit(pid) || {}).nom || "?") + " · " + n + "</span>").join("") + "</div>" : "") +
      (attente.length ? '<div class="separateur"></div><div class="meta doux" style="font-size:.82rem;margin-bottom:6px">En liste d\'attente pour</div><div class="chips">' + attente.map((a) => '<span class="chip" style="padding-right:12px">' + esc((q.produit(a.produitId) || {}).nom || "?") + "</span>").join("") + "</div>" : "") +
      '</div><div class="card"><h3>Historique</h3>' + (st.cmds.length ? '<div class="rows">' + [...S().commandes.filter((x) => x.clienteId === id)].sort((a, b) => (a.date < b.date ? 1 : -1)).map(ligneCommande).join("") + "</div>" : ui.vide("Pas encore de commande.")) + "</div></div>";
    el.querySelector('[data-act="modif"]').onclick = () => ficheClienteModale(c);
    el.querySelector('[data-act="cmd"]').onclick = () => ficheCommande(null, c.id);
    el.querySelectorAll("[data-cmd]").forEach((r) => (r.onclick = () => LBE.aller("#/commandes/fiche/" + r.dataset.cmd)));
  }
  function ficheClienteModale(c) {
    const nouveau = !c;
    c = c || { id: "", nom: "", telephone: "", ville: "", relais: "", notes: "" };
    ui.modale({
      titre: nouveau ? "Nouvelle cliente" : "Modifier la fiche",
      corps: ui.champ("Nom et prénom", "nom", c.nom, { requis: true }) +
        '<div class="g2 grid">' + ui.champ("Téléphone (WhatsApp)", "telephone", c.telephone, { type: "tel", placeholder: "+33 6 …" }) + ui.champ("Ville", "ville", c.ville) + "</div>" +
        ui.champ("Point relais Mondial Relay", "relais", c.relais, { placeholder: "Nom du relais + code postal (ou n° du point relais)" }) +
        ui.champ("Notes", "notes", c.notes, { type: "textarea", placeholder: "Préférences, tour de hanche, comment elle vous a connue…" }),
      supprimer: nouveau ? null : () => {
        if (S().commandes.some((x) => x.clienteId === c.id)) { ui.toast("Cette cliente a des commandes : supprimez-les d'abord.", true); return; }
        S().clientes = S().clientes.filter((x) => x.id !== c.id); LBE.store.sauver(); LBE.aller("#/commandes/clientes");
      },
      soumettre: { action: (v) => {
        Object.assign(c, v);
        if (nouveau) { c.id = LBE.util.uid(); c.cree = LBE.util.aujourdhui(); S().clientes.push(c); }
        LBE.store.sauver(); ui.toast("Fiche enregistrée ✓");
        if (nouveau) LBE.aller("#/commandes/cliente/" + c.id); else LBE.rafraichir();
      } },
    });
  }

  LBE.modules.commandes = { rendre };
  LBE.commandes = { ficheCommande, proposerMessage };
})();
