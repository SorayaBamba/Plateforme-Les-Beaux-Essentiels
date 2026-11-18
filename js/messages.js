/* =========================================================
   Module 7 — Modèles de messages WhatsApp (vouvoiement)
   ========================================================= */
(function () {
  "use strict";
  const LBE = window.LBE;
  const { ui, f, esc, icon, calc, q } = LBE;
  const S = () => LBE.store.d;

  const VARIABLES = [
    ["prenom", "Prénom de la cliente"], ["numero", "N° de commande"], ["produits", "Liste des articles"], ["port", "Frais de port"],
    ["total", "Total"], ["relais", "Point relais"], ["suivi", "N° de suivi"], ["lien_suivi", "Lien de suivi"], ["moyens", "Moyens de paiement"], ["produit", "Produit (liste d'attente)"],
  ];
  const EXEMPLE = { prenom: "Aïcha", numero: "LBE-0042", produits: "• 1 × Classique Nacre — 9,00 €\n• 1 × Mini musc Vanille — 7,00 €", port: "4,90 €", total: "20,90 €", relais: "Tabac de la Place — 69003", suivi: "39876543", lien_suivi: "https://www.mondialrelay.fr/suivi-de-colis/?NumeroExpedition=39876543", moyens: "Wero, Virement instantané ou PayPal", produit: "Grandes Perles Saphir" };

  function moyensTexte() {
    const l = S().lists.moyensPaiement.filter((m) => !/esp[eè]ces/i.test(m));
    return l.length > 1 ? l.slice(0, -1).join(", ") + " ou " + l[l.length - 1] : l[0] || "";
  }
  function contexteCommande(c) {
    const cl = q.cliente(c.clienteId) || {};
    const t = calc.totalCommande(c);
    return {
      prenom: (cl.nom || "").split(" ")[0], numero: c.numero,
      produits: c.lignes.map((l) => { const p = q.produit(l.produitId); return "• " + l.qte + " × " + (p ? p.nom : "?") + " — " + f.euro(l.qte * l.prix); }).join("\n") + (t.remise ? "\n• Remise : −" + f.euro(t.remise) : ""),
      port: f.euro(t.port), total: f.euro(t.total), relais: cl.relais || "(à préciser)",
      suivi: c.expedition.suivi || "(à venir)", lien_suivi: c.expedition.suivi ? S().settings.lienSuivi.replace("{suivi}", encodeURIComponent(c.expedition.suivi)) : "(à venir)",
      moyens: moyensTexte(),
    };
  }
  function remplir(modeleIdOuTexte, ctx) {
    const m = S().modeles.find((x) => x.id === modeleIdOuTexte);
    const texte = m ? m.texte : modeleIdOuTexte;
    const c = Object.assign({ moyens: moyensTexte() }, ctx || {});
    return texte.replace(/\{(\w+)\}/g, (all, k) => (c[k] != null && c[k] !== "" ? c[k] : all));
  }
  const surligner = (t) => esc(t).replace(/\{(\w+)\}/g, '<span class="var">{$1}</span>');

  function rendre(el) {
    const cmds = [...S().commandes].filter((c) => !c.annulee).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 30);
    el.innerHTML = ui.entete("Module 7", "Messages WhatsApp", '<button class="btn primaire" data-act="nouveau">' + icon("plus") + " Nouveau modèle</button>") +
      '<div class="card nacre mb"><div class="row-flex"><div style="flex:1;min-width:220px"><b>Remplir automatiquement avec une commande</b><div class="aide">Les zones <span class="var">{prenom}</span>, <span class="var">{total}</span>, <span class="var">{suivi}</span>… seront complétées.</div></div>' +
      '<select id="ctx" style="max-width:340px"><option value="">Aperçu avec un exemple</option>' + cmds.map((c) => { const cl = q.cliente(c.clienteId); return '<option value="' + c.id + '">' + esc(c.numero + " · " + (cl ? cl.nom : "")) + "</option>"; }).join("") + "</select></div></div>" +
      '<div class="grid g2" id="liste-modeles"></div>' +
      '<div class="card mt"><h3>' + icon("info") + " Bien paramétrer WhatsApp Business</h3><ol style=\"padding-left:18px;margin:0;line-height:1.8\">" +
      "<li><b>Profil professionnel</b> : logo, description « Beauté · Senteurs · Accessoires », horaires, lien TikTok/Instagram.</li>" +
      "<li><b>Catalogue</b> : ajoutez vos produits (photos du Studio) avec prix ; partagez-les en un clic dans les discussions.</li>" +
      "<li><b>Message d'accueil</b> (Outils pro → Message d'accueil) : « Bonjour et bienvenue chez Les Beaux Essentiels ✨ Comment puis-je vous aider ? »</li>" +
      "<li><b>Message d'absence</b> en dehors de vos horaires.</li>" +
      "<li><b>Réponses rapides</b> : copiez ces modèles et associez-les à un raccourci (ex. <code>/merci</code>, <code>/suivi</code>).</li>" +
      "<li><b>Étiquettes</b> : « Nouvelle commande », « Paiement en attente », « Payée », « Expédiée », « Liste d'attente ».</li>" +
      "<li><b>Lien court</b> : mettez votre lien wa.me dans la bio TikTok et Instagram.</li></ol></div>";
    el.querySelector('[data-act="nouveau"]').onclick = () => editer(null);
    const ctxSel = el.querySelector("#ctx");
    const dessiner = () => {
      const c = ctxSel.value ? q.commande(ctxSel.value) : null;
      const ctx = c ? contexteCommande(c) : EXEMPLE;
      const tel = c ? (q.cliente(c.clienteId) || {}).telephone : "";
      el.querySelector("#liste-modeles").innerHTML = S().modeles.map((m) => {
        const txt = remplir(m.id, ctx);
        return '<div class="card"><div class="card-head"><h3>' + esc(m.titre) + '</h3><button class="btn icone petit fantome" data-edit="' + m.id + '" title="Modifier">' + icon("crayon") + '</button></div><div class="message-modele bulle">' + surligner(txt) + '</div><div class="row-flex mt"><button class="btn primaire" data-copy="' + m.id + '">' + icon("copier") + " Copier</button>" + (tel ? '<a class="btn whatsapp" target="_blank" rel="noopener" href="' + ui.lienWhatsApp(tel, txt) + '">' + icon("whatsapp") + " Envoyer</a>" : "") + "</div></div>";
      }).join("");
      el.querySelectorAll("[data-copy]").forEach((b) => (b.onclick = () => ui.copier(remplir(b.dataset.copy, ctx), "Message copié ✓")));
      el.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => editer(S().modeles.find((m) => m.id === b.dataset.edit))));
    };
    ctxSel.onchange = dessiner;
    dessiner();
  }

  function editer(m) {
    const nouveau = !m;
    m = m || { id: "", titre: "", texte: "Bonjour {prenom},\n\n" };
    ui.modale({
      titre: nouveau ? "Nouveau modèle" : "Modifier le modèle", large: true,
      corps: ui.champ("Titre", "titre", m.titre, { requis: true }) + ui.champ("Message", "texte", m.texte, { type: "textarea", attrs: ' rows="10" style="min-height:220px"' }) +
        '<div class="champ"><span>Insérer une variable</span><div class="chips">' + VARIABLES.map(([k, l]) => '<button type="button" class="chip" style="padding-right:12px;cursor:pointer" data-var="' + k + '" title="' + esc(l) + '">{' + k + "}</button>").join("") + "</div></div>" +
        '<p class="aide">Pensez au vouvoiement 🤍 Les emojis sont les bienvenus.</p>',
      onOuvrir: (el) => {
        const ta = el.querySelector('[name="texte"]');
        el.querySelectorAll("[data-var]").forEach((b) => (b.onclick = () => { const s = ta.selectionStart, e = ta.selectionEnd, ins = "{" + b.dataset.var + "}"; ta.value = ta.value.slice(0, s) + ins + ta.value.slice(e); ta.focus(); ta.setSelectionRange(s + ins.length, s + ins.length); }));
      },
      supprimer: nouveau ? null : () => { S().modeles = S().modeles.filter((x) => x.id !== m.id); LBE.store.sauver(); LBE.rafraichir(); },
      soumettre: { action: (v) => { Object.assign(m, v); if (nouveau) { m.id = LBE.util.uid(); S().modeles.push(m); } LBE.store.sauver(); ui.toast("Modèle enregistré ✓"); LBE.rafraichir(); } },
    });
  }

  LBE.modules.messages = { rendre };
  LBE.messages = { remplir, contexteCommande };
})();
