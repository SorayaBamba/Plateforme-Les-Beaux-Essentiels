# Les Beaux Essentiels — Plateforme de gestion

*Beauté · Senteurs · Accessoires*

Une mini « application d'entreprise » pour gérer votre activité depuis votre téléphone ou votre ordinateur. Elle fonctionne sans serveur et s'héberge gratuitement sur GitHub Pages.

## Les modules

| | Module | Ce qu'il fait |
|---|---|---|
| 1 | **Tableau de bord** | CA et bénéfice du mois, objectif mensuel, commandes en cours, paiements en attente, relances à faire, alertes stock, prochaines publications, meilleures ventes, meilleures clientes |
| 2 | **Catalogue & création** | Fiches produits, coût de revient calculé automatiquement (achat + part de fret au poids + transport Adjamé + emballage), marge, prix conseillé, atelier de **mélanges** et de **packs**, avec suggestions selon le stock |
| 3 | **Stocks** | Quantités en temps réel, arrivages d'Abidjan (date, poids, fret, transport), mouvements, seuil de sécurité avec alerte, liste d'attente « alerte disponibilité » et réassort conseillé |
| 4 | **Commandes & clientes** | Fiche cliente (point relais, historique, panier moyen), commandes, statut de paiement, expédition Mondial Relay avec numéro de suivi, bouton WhatsApp |
| 5 | **Comptabilité** | Recettes automatiques, dépenses par catégorie (celles des arrivages et des étiquettes sont ajoutées automatiquement), bénéfice par mois, graphiques, **livre des recettes exportable en CSV** |
| 6 | **Social media** | Calendrier éditorial, banque d'idées, légendes et hashtags, statistiques TikTok / Instagram avec graphique d'évolution et taux de conversion |
| 7 | **Messages WhatsApp** | Modèles au vouvoiement, remplis automatiquement depuis une commande, avec un bouton **Copier** et un bouton **Envoyer** |
| 8 | **Paramètres** | Frais, seuils, marge cible, listes modifiables, **sauvegarde / restauration JSON**, effacement des données d'exemple |
| 9 | **Studio créatif** | Studio photo et Studio vidéo, détaillés ci-dessous |

Le **Studio photo** propose :
- 9 filtres « Aube sur la plage » et 13 réglages pro ;
- un **détourage par IA** ;
- des fonds réalistes avec ombre au sol, reflet et effet portrait ;
- des textes, le logo et une pastille prix ;
- 7 modèles de publications ;
- un export HD 1080 px.

Le **Studio vidéo** propose :
- un montage vertical 9:16 ;
- des textes animés et des transitions ;
- une intro et une fin aux couleurs de la marque ;
- une musique ;
- l'export d'une vidéo MP4 prête pour TikTok et les Reels.

## Vos données

- Tout est enregistré **dans le navigateur de l'appareil utilisé** (localStorage). Rien n'est envoyé sur Internet, rien n'est enregistré dans GitHub.
- Conséquence : les données de votre téléphone et celles de votre ordinateur sont **séparées**. Pour passer de l'un à l'autre, utilisez **Paramètres → Exporter (JSON)**, puis **Importer** sur l'autre appareil.
- 👉 **Exportez une sauvegarde chaque semaine** et rangez-la dans votre Drive, votre iCloud ou vos e-mails. Si vous videz les données de votre navigateur, tout est effacé.
- Les visuels et vidéos du Studio enregistrés dans « Mes créations » ne sont pas dans la sauvegarde JSON. Téléchargez ceux que vous voulez garder.

## Mettre la plateforme en ligne avec GitHub Pages (pas à pas)

> ⏱️ Environ 5 minutes. C'est gratuit.

1. **Connectez-vous** sur [github.com](https://github.com) et ouvrez votre dépôt **Plateforme-Les-Beaux-Essentiels**.
2. **Vérifiez que les fichiers sont sur la branche `main`.** Vous devez voir `index.html`, les dossiers `css`, `js` et `icons` à la racine du dépôt.
   - Si le travail est sur une autre branche (par exemple `claude/...`), cliquez sur **Pull requests → New pull request**.
   - Choisissez `base: main` ← `compare: claude/...`, puis cliquez sur **Create pull request** puis **Merge pull request**.
3. Cliquez sur l'onglet **Settings** (Paramètres), en haut à droite du dépôt.
4. Dans le menu de gauche, cliquez sur **Pages**.
5. Réglez la section **Build and deployment** :
   - **Source** : *Deploy from a branch*
   - **Branch** : `main`, dossier `/ (root)`

   Cliquez ensuite sur **Save**.
6. Patientez 1 à 2 minutes, puis rechargez la page. Un bandeau affiche l'adresse de votre plateforme :
   `https://sorayabamba.github.io/Plateforme-Les-Beaux-Essentiels/`
7. **Ouvrez ce lien sur votre téléphone**, puis ajoutez la plateforme à votre écran d'accueil pour l'ouvrir comme une vraie application :
   - **iPhone (Safari)** : bouton Partager ⬆️ → *Sur l'écran d'accueil*
   - **Android (Chrome)** : menu ⋮ → *Ajouter à l'écran d'accueil*
8. Au premier lancement, des **données d'exemple fictives** sont affichées. Quand vous êtes prête, cliquez sur **Effacer les exemples** dans le tableau de bord, puis réglez vos frais dans **Paramètres**.

**Mettre à jour plus tard** : chaque modification envoyée sur la branche `main` est publiée automatiquement en 1 à 2 minutes. Vos données ne sont pas touchées.

**Confidentialité** : avec un compte GitHub gratuit, le dépôt doit être *public* pour utiliser Pages. Le **code** est donc visible, mais **vos données ne le sont pas** : elles restent dans votre navigateur. Une personne qui ouvre le lien voit une plateforme vide (ou les exemples fictifs).

## Conseils pratiques

**Encaisser à distance**, du plus simple au plus protecteur :
1. **Wero** ou **virement instantané** : gratuit et immédiat.
2. **Lien de paiement par carte** (SumUp, Stripe Payment Links…) : environ 1,5 à 2,5 % de frais, et c'est rassurant pour les nouvelles clientes.
3. **PayPal « biens et services »** : protège les deux parties. Évitez « entre proches » pour une activité commerciale.

Règle d'or : faites payer le **produit et le port avant l'envoi**.

**Expédier avec Mondial Relay** :
1. Une fois le paiement reçu, créez l'étiquette sur mondialrelay.fr (envoi de point relais à point relais).
2. Déposez le colis dans un relais.
3. Saisissez le numéro de suivi dans la commande : le message d'expédition se remplit tout seul.

Le coût de l'étiquette est ajouté automatiquement à vos dépenses.

**WhatsApp Business** : la check-list de configuration se trouve dans le module **Messages WhatsApp**.

## Technique

- HTML, CSS et JavaScript, sans dépendance ni étape de compilation. Ouvrez `index.html` ou publiez-le sur n'importe quel hébergement statique.
- Polices : Cormorant Garamond et Jost (Google Fonts).
- Détourage IA : [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (licence AGPL), chargé à la demande depuis un CDN. Il s'exécute dans le navigateur, et les photos ne quittent pas l'appareil.
- Export vidéo : `MediaRecorder` du navigateur. Le fichier est en MP4 sur Safari et Chrome récents, en WebM sinon.
