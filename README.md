# GVI International — Gestion des colis

## V1.3 — Gestion professionnelle + base de données en ligne

Cette version part de la V1.2 et conserve son interface, son QR Code simplifié et ses fonctions principales. Elle ajoute une architecture prête pour une vraie utilisation multi-appareils avec **Supabase (PostgreSQL + Auth + RLS)**.

### Nouvelles fonctions
- Modification des colis
- Suppression des colis réservée à l'administrateur
- Recherche avancée : texte, statut, destination, dates, poids min/max
- Fiche colis professionnelle
- Changement de statut avec contrôle des droits
- QR Code simplifié : Nom, Numéro, Provenance, Destination, Prix total, Poids
- Base en ligne Supabase quand `config.js` est renseigné
- Mode local de secours si Supabase n'est pas configuré
- Identifiant automatique `GVI-YYMMDD-00001` en ligne via fonction PostgreSQL
- Tarifs stockés en ligne
- Authentification Supabase en mode en ligne
- Contacts et horaires GVI intégrés
- Bouton TikTok configurable dans `config.js`
- Export CSV et sauvegarde JSON
- Responsive téléphone / ordinateur

## Mise en ligne de la base de données

1. Créez un projet Supabase.
2. Ouvrez **SQL Editor** et exécutez tout le fichier `schema.sql`.
3. Dans Supabase > Authentication, créez le premier compte administrateur.
4. Copiez son UUID puis exécutez dans SQL Editor :

```sql
update public.profiles
set role = 'admin', approved = true
where id = 'UUID-DU-COMPTE';
```

5. Ouvrez `config.js` et renseignez :

```js
window.GVI_CONFIG = {
  SUPABASE_URL: "https://VOTRE-PROJET.supabase.co",
  SUPABASE_ANON_KEY: "VOTRE-PUBLISHABLE-OU-ANON-KEY",
  TIKTOK_URL: "https://www.tiktok.com/",
  COMPANY: { ... }
};
```

6. Envoyez tous les fichiers du dossier sur GitHub Pages / Netlify.

### Sécurité
La clé utilisée côté navigateur doit être la clé publique/publishable/anon de Supabase, **jamais** une `service_role` key. Les permissions de lecture/écriture/suppression sont protégées par les politiques Row Level Security du fichier `schema.sql`.

### Comptes collaborateurs
En mode en ligne, les comptes sont créés dans **Supabase Authentication**. Le profil associé est créé automatiquement par le trigger SQL. Le rôle et l'approbation sont stockés dans `profiles`.

- `admin` : accès complet et suppression des colis.
- `collaborator` : accès aux colis approuvés et modification de ses propres colis.

### Contacts GVI
- +212 669 310 646
- +225 07 1181 4583
- +228 9865 9716
- +229 97 86 84 87
- Horaires : 09H–18H, lundi à vendredi ; week-end sur cas exceptionnel.

Le lien TikTok se modifie dans `config.js` dès que vous avez l'URL exacte de votre page.

## Test immédiat sans base
Si vous ne renseignez pas Supabase dans `config.js`, l'application fonctionne en mode local avec :

- Email : `admin@gvi-international.ma`
- Mot de passe : `admin123`

Les données locales restent dans le navigateur. Elles ne sont pas partagées entre appareils tant que Supabase n'est pas configuré.

## Diagnostic de connexion — V1.3 corrigée

L’interface affiche désormais l’état de Supabase et propose **Tester la connexion**.
Le test vérifie la configuration, la session et, lorsqu’un utilisateur est connecté, l’accès à la table `parcels`.

### Si « Email ou mot de passe incorrect » apparaît

Ce message vient de Supabase Auth lorsque l’identifiant fourni n’est pas accepté. Vérifiez :
1. `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans `config.js` ;
2. la présence du compte dans **Authentication → Users** ;
3. que l’adresse e-mail est confirmée si la confirmation e-mail est activée ;
4. que la ligne correspondante existe dans `profiles` et possède `role='admin'` et `approved=true`.

### Logo

Le logo est conservé dans `assets/gvi-logo.jpg`. Le code utilise ce chemin pour l’interface et convertit automatiquement le chemin en URL absolue lors de l’impression des étiquettes, afin que le logo apparaisse aussi dans la fenêtre d’impression.
