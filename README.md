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

## Création des utilisateurs depuis GVI (V1.3)

La V1.3 utilise maintenant une Edge Function Supabase nommée `admin-users` pour permettre à un administrateur GVI de créer un utilisateur sans exposer la clé `service_role` dans le navigateur.

### Déploiement de la fonction

Depuis le dossier du projet, avec la CLI Supabase installée et connectée :

```bash
supabase login
supabase link --project-ref ifqtqjdheewbxueiygif
supabase functions deploy admin-users
```

La fonction utilise automatiquement les secrets Supabase de l'environnement de la fonction (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`). **Ne mettez jamais la service_role key dans `config.js`.**

Après déploiement :

1. Connectez-vous à GVI avec le compte administrateur.
2. Ouvrez **Administration → Utilisateurs**.
3. Cliquez sur **＋ Ajouter un utilisateur**.
4. Choisissez `Collaborateur`.
5. Renseignez nom, email et mot de passe.
6. Cliquez sur **Créer le compte**.
7. Le compte est créé dans **Supabase Authentication**, puis son profil est associé dans `public.profiles`.
8. Le collaborateur peut ensuite se connecter directement avec son email et son mot de passe.

Le même écran affiche les utilisateurs, leur rôle et leur statut. La suppression passe également par la fonction sécurisée.

### Première connexion administrateur

Si le premier compte n'est pas encore administrateur : créez-le dans Supabase Authentication, puis exécutez dans SQL Editor :

```sql
update public.profiles
set role = 'admin', approved = true
where id = 'UUID-DU-COMPTE';
```
