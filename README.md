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


## Administration des collaborateurs (V1.4)
L'administrateur peut créer un collaborateur directement depuis **Administration > Collaborateurs**, sans ouvrir le tableau de bord Supabase.

Cette fonction utilise la fonction Edge `supabase/functions/create-collaborator/index.ts`. La clé `SUPABASE_SERVICE_ROLE_KEY` doit rester côté serveur et ne doit jamais être ajoutée à `config.js`. Déployez la fonction dans votre projet Supabase et configurez ce secret côté Edge Function.

La colonne `profiles.email` est ajoutée par le patch présent dans `schema.sql`.

### Logo
Le logo est désormais embarqué dans `logo-data.js` afin d'éviter les erreurs de chemin relatif sur GitHub Pages, Netlify et les fenêtres d'impression.

## V1.5 — Gestion des collaborateurs

L'administrateur peut gérer les comptes depuis **Administration → Collaborateurs** :
- créer un collaborateur ;
- activer / bloquer son accès ;
- réinitialiser son mot de passe ;
- supprimer son compte.

Les opérations sur Supabase Auth passent par l'Edge Function `manage-collaborators`. La clé `service_role` reste côté serveur et ne doit jamais être placée dans `config.js`.

### Déploiement des Edge Functions

Déployez `manage-collaborators` depuis **Supabase → Edge Functions** (éditeur intégré) ou avec la CLI Supabase. La fonction accepte les anciennes variables `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY` et les nouvelles variables `SUPABASE_SECRET_KEYS` / `SUPABASE_PUBLISHABLE_KEYS`.

Avec le Dashboard : créez une fonction nommée `manage-collaborators`, copiez le contenu de `supabase/functions/manage-collaborators/index.ts`, puis cliquez sur **Deploy function**. Les secrets Supabase restent côté serveur.

Le SQL à exécuter dans **Supabase → SQL Editor** est `schema.sql` avant les premiers tests de gestion des collaborateurs.

Pour vérifier : connectez-vous comme administrateur dans GVI, ouvrez **Administration → Collaborateurs**, créez un compte test, puis essayez de vous connecter avec ce compte.

La clé secrète (`SUPABASE_SECRET_KEYS` ou ancienne `service_role`) ne doit jamais être ajoutée à `config.js` ni au dépôt Git.

### Logo

Le logo est fourni par `logo-data.js` en Data URI pour éviter les problèmes de chemin relatif lors de l'affichage et de l'impression. Une image locale `assets/gvi-logo.jpg` reste disponible comme secours.
