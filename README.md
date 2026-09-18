# GVI International — Gestion des colis

## V1.2 — Design professionnel + QR simplifié

Cette version conserve les fonctions de la V1.1 et apporte une interface plus professionnelle, plus lisible sur téléphone et une identification QR volontairement simplifiée.

### QR Code
Le QR Code contient uniquement :
- Nom du client
- Numéro de téléphone
- Provenance
- Destination
- Prix total
- Poids

### Logo
Le logo GVI est intégré directement dans `app.js` en secours (data URI) et existe également comme fichier `assets/gvi-logo.jpg`. Cela évite les problèmes de chemin relatif lors d'un déploiement GitHub Pages.

### Fonctions conservées
- Connexion Administrateur / Collaborateur
- Tableau de bord
- Nouveau colis
- ID automatique `GVI-YYMMDD-00001`
- Calcul poids × prix/kg
- Recherche de colis
- Écran Fiche colis
- Modification du colis
- Changement de statut
- Statuts : Réceptionné, En stock, En magasin, Prêt à expédier, En transit, Arrivé à destination, Livré, Récupéré
- QR Code réel
- Étiquette imprimable
- Administration des tarifs et collaborateurs
- Suppression de colis réservée à l'administrateur
- Export CSV et sauvegarde JSON
- Interface responsive avec navigation mobile

## Test
Compte de démonstration :

- Email : `admin@gvi-international.ma`
- Mot de passe : `admin123`

Pour GitHub Pages : envoyer tout le contenu de ce dossier à la racine du dépôt, puis activer Pages sur la branche principale et le dossier `/root`.

> Cette V1.2 reste une application locale basée sur `localStorage`. Les données ne sont pas encore partagées entre plusieurs appareils. La prochaine étape de production sera la connexion à une vraie base de données et à une authentification serveur.
