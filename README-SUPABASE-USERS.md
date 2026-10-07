# GVI V1.3 — Utilisateurs Supabase

## Ce qui est ajouté
- Administration > Utilisateurs > Ajouter un utilisateur
- Création sécurisée dans Supabase Auth via Edge Function `admin-users`
- Création/mise à jour du profil dans `public.profiles`
- Liste des utilisateurs dans GVI
- Suppression d'un utilisateur depuis GVI
- Le mot de passe n'est jamais enregistré dans le navigateur ni dans `profiles`

## Configuration du frontend
Ouvrir `config.js` et remplacer :
`COLLER_ICI_LA_CLE_PUBLISHABLE_OU_ANON_DE_SUPABASE`
par la clé publique/publishable (ou anon) du projet Supabase.

Projet : https://ifqtqjdheewbxueiygif.supabase.co

Ne jamais mettre la `service_role`/secret key dans `config.js`.

## Supabase
La fonction `admin-users` doit être déployée dans :
Edge Functions > admin-users

Dans Settings :
- Verify JWT with legacy secret : OFF

La fonction doit être appelée par un administrateur connecté. Elle vérifie `profiles.role = 'admin'` et `approved = true` avant toute création/suppression.

## Test
1. Se connecter dans GVI avec le compte administrateur.
2. Administration > Utilisateurs.
3. Cliquer sur Ajouter un utilisateur.
4. Choisir Collaborateur.
5. Créer le compte.
6. Vérifier Authentication > Users et Table Editor > profiles.
7. Se déconnecter de GVI.
8. Se connecter avec le nouvel email/mot de passe.
