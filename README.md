# GVI International — Gestion des colis

Version 1 du nouveau site, reconstruite à partir des caractéristiques fournies.

## Ce qui est déjà inclus

- Interface responsive pensée d'abord pour téléphone.
- Logo officiel GVI dans `assets/gvi-logo.jpeg`.
- Connexion avec deux niveaux : **Administrateur** et **Collaborateur**.
- Tableau de bord.
- Création d'un colis.
- Identifiant automatique au format `GVI-YYMMDD-00001`.
- Calcul automatique du prix total = poids × prix/kg.
- Recherche de colis.
- Écran **Fiche colis**.
- Modification des informations.
- Changement de statut.
- Statuts : Réceptionné, En stock, En magasin, Prêt à expédier, En transit, Arrivé à destination, Livré, Récupéré.
- QR Code réel contenant les informations du colis.
- Étiquette imprimable avec QR Code.
- Administration des collaborateurs.
- Administration des tarifs par destination.
- Suppression de colis réservée à l'administrateur.
- Export CSV et sauvegarde JSON.
- Fonctionnement immédiat sans build : HTML/CSS/JS + bibliothèque QR chargée depuis jsDelivr.

## Démarrage

### Option A — GitHub Pages

1. Créez un dépôt GitHub, par exemple `gvi-international`.
2. Envoyez tout le contenu de ce dossier à la racine du dépôt.
3. Dans **Settings → Pages**, choisissez le déploiement depuis la branche principale et le dossier `/root`.
4. Ouvrez l'adresse GitHub Pages fournie par GitHub.

### Option B — test local

Ouvrez `index.html` dans un navigateur moderne. Pour éviter certaines restrictions du navigateur, vous pouvez aussi utiliser un petit serveur local.

Compte de démonstration :

- Email : `admin@gvi-international.ma`
- Mot de passe : `admin123`

## Important pour la vraie mise en ligne

Cette première base est volontairement exploitable immédiatement et stocke les données dans `localStorage`. Ce stockage est propre à chaque navigateur : il **ne constitue pas une base de données sécurisée** et ne permet pas encore à plusieurs collaborateurs de travailler sur les mêmes données.

Pour la version de production, la prochaine étape recommandée est de connecter ce même frontend à une vraie base (par exemple Supabase) avec :

- authentification email/mot de passe,
- rôles protégés côté serveur,
- table `parcels`,
- table `profiles/users`,
- table `tariffs`,
- journal des changements de statut,
- règles RLS pour empêcher un collaborateur de supprimer ou modifier ce qu'il ne doit pas modifier,
- QR public sécurisé via identifiant/URL,
- sauvegardes.

Les tarifs non présents dans les éléments fournis ne sont pas inventés : seul l'exemple **Ghana — 90 DH/kg** est préchargé pour permettre le test du calcul.

## Structure

```text
gvi-international/
├── index.html
├── app.js
├── styles.css
├── README.md
└── assets/
    └── logo.jpeg
```
