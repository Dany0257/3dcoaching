# 3D COACHING — Site web

Site de **3D COACHING**, entreprise de coaching, formation et accompagnement
entrepreneurial basée à Bujumbura.

> *« Chaque talent compte, surtout le tien. »*

🌐 [3dcoaching.business](https://3dcoaching.business) · 🔐 [/admin](https://3dcoaching.business/admin)

---

## Le principe

Le contenu du site est **séparé de sa présentation**.

```
content.json   ← tout le texte, les services, les photos
template.html  ← la structure de la page
     ↓  node build.js
index.html     ← page statique complète, générée
```

Une personne non technicienne modifie `content.json` depuis
`/admin`, sans jamais toucher au code. Netlify relance `build.js` à chaque
modification et remet le site en ligne en une minute environ.

**Ne modifiez jamais `index.html` à la main** : il est régénéré à chaque
construction et vos changements seraient perdus. Modifiez `template.html`
(structure), `styles.css` (apparence) ou `content.json` (contenu).

---

## Les fichiers

| Fichier | Rôle |
|---|---|
| `content.json` | Tout le contenu modifiable. Le seul fichier que l'espace admin écrit. |
| `template.html` | Gabarit de la page, avec des marqueurs `{{...}}`. |
| `build.js` | Assemble gabarit + contenu + CSS → `index.html` et `sitemap.xml`. |
| `index.html` | **Généré.** Ne pas modifier. |
| `styles.css` | Design du site public. Intégré à la page lors de la construction. |
| `script.js` | Navigation, formulaire de contact, galerie photos. |
| `hero.js` | Animation de la bannière d'accueil. |
| `icons.js` | Jeu d'icônes SVG (Bootstrap Icons, MIT), intégré au site. |
| `images/` | Les photos envoyées depuis l'espace admin. |
| `admin/` | L'espace de gestion du contenu. |
| `netlify/functions/` | `login.js` (connexion) et `publish.js` (écriture dans GitHub). |
| `outils/mot-de-passe.js` | Fabrique l'empreinte du mot de passe admin. |
| `GUIDE-ADMIN.html` | Mode d'emploi illustré, destiné à la personne qui gère le contenu. |

---

## Travailler en local

```bash
node build.js                 # reconstruit index.html
python3 -m http.server 8000   # puis ouvrir http://localhost:8000
```

Pour tester aussi l'espace admin (qui a besoin des fonctions serveur) :

```bash
npm install -g netlify-cli
netlify dev
```

---

## Mise en route de l'espace admin

Quatre variables à renseigner dans **Netlify → Project configuration → Environment variables** :

| Variable | Comment l'obtenir |
|---|---|
| `ADMIN_PASSWORD_HASH` | `node outils/mot-de-passe.js "VotreMotDePasse"` |
| `SESSION_SECRET` | fourni par la même commande |
| `GITHUB_TOKEN` | jeton *fine-grained* GitHub, accès **Contents : Read and write** sur le seul dépôt `3dcoaching` |
| `GITHUB_REPO` | `Dany0257/3dcoaching` |

Netlify signale que les trois premières valeurs ressemblent à des secrets : c'est exact,
cocher **Contains secret values**. Attention au réglage **Scopes** dans ce cas — Netlify
interdit le scope *Post processing* pour un secret, donc « All scopes » est refusé.
Cocher **Functions** et **Runtime** suffit : aucune de ces valeurs n'est lue pendant la
construction du site. Une valeur secrète devient ensuite illisible dans l'interface
(on peut seulement la remplacer) et le marquage est définitif.

Pour changer le mot de passe : relancer l'outil et remplacer
`ADMIN_PASSWORD_HASH`. Le mot de passe en clair n'est stocké nulle part.

---

## Sécurité

- Mot de passe stocké sous forme d'empreinte PBKDF2-SHA512 (210 000 tours), jamais en clair
- Jeton GitHub uniquement côté serveur, jamais transmis au navigateur
- Session signée (HMAC-SHA256), valable 2 h
- 5 tentatives de connexion par quart d'heure et par adresse IP
- `/admin` exclu des moteurs de recherche (`noindex` + `robots.txt`)
- Formulaire de contact : validation des champs, jeton anti-CSRF, 5 envois par minute maximum

---

## Performance

- Aucune police d'icônes téléchargée : les icônes sont des SVG intégrés à la page
- CSS intégré et minifié : aucun aller-retour réseau avant l'affichage
- Photos réduites et converties en WebP dans le navigateur avant l'envoi
- Animation de la bannière mise en pause dès qu'elle sort de l'écran
- Dimensions d'images déclarées : pas de saut de mise en page au chargement
- Réglage système « réduire les animations » respecté

---

## Licence

© 2026 3D COACHING. Tous droits réservés.
Icônes : [Bootstrap Icons](https://icons.getbootstrap.com), licence MIT.
