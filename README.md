# 3D COACHING — Site Web Professionnel

Site web de **3D COACHING**, entreprise spécialisée dans le coaching, la formation, le recrutement et l'accompagnement entrepreneurial.

> *"Chaque talent compte, surtout le tien."*

---

## Structure du projet

```
3dCoaching/
├── index.html      # Structure HTML sémantique
├── styles.css      # Design system et styles
├── script.js       # Logique et sécurité côté client
└── README.md       # Documentation
```

---

## Technologies

- HTML5
- CSS3 (variables CSS, responsive design)
- JavaScript vanilla (aucune dépendance externe)
- Google Fonts — Poppins & Inter

---

## Lancer le site en local

```bash
# Python
python3 -m http.server 8000

# Node.js
npx http-server -p 8000
```

Ouvrir ensuite : `http://localhost:8000`

---

## Déploiement

Le site est un projet statique. Il peut être hébergé sur :

- [Netlify](https://netlify.com)
- [Vercel](https://vercel.com)
- [GitHub Pages](https://pages.github.com)

Uploader les trois fichiers (`index.html`, `styles.css`, `script.js`) à la racine du projet.

---

## Sécurité

- Protection XSS par sanitisation des entrées
- Tokens CSRF générés à chaque session
- Validation des champs (format email, téléphone, longueur)
- Rate limiting : 5 soumissions maximum par minute

---

## Personnalisation

**Informations de contact** : modifier la section `contact` dans `index.html`.

**Couleurs** : modifier les variables CSS au début de `styles.css` (bloc `:root`).

**Contenu des services** : modifier la section `services` dans `index.html`.

---

## Licence

© 2026 3D COACHING. Tous droits réservés.
