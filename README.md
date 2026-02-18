# 3D COACHING - Site Web Professionnel

![Status](https://img.shields.io/badge/Status-Production%20Ready-success)
![Security](https://img.shields.io/badge/Security-Enhanced-blue)
![Responsive](https://img.shields.io/badge/Responsive-Yes-green)

## 🌟 À Propos

Site web professionnel pour **3D COACHING**, une entreprise offrant des services de coaching, formation, recrutement et accompagnement entrepreneurial.

**Slogan:** *"Chaque talent compte, surtout le tien."*

## 🎯 Services Offerts

1. **Coaching Individuel** - Développement personnel et professionnel
2. **Coaching Collectif** - Amélioration de la collaboration d'équipe
3. **Coaching Professionnel** - Évolution de carrière
4. **Formation Professionnelle Continue** - Acquisition de nouvelles compétences
5. **Publication d'Appels d'Offres** - Accès aux opportunités économiques
6. **Appui à l'Entrepreneuriat des Jeunes** - Soutien aux porteurs de projets
7. **Organisation d'Événements & Ateliers Éducatifs** - Conférences et formations
8. **Sélection et Recrutement de Personnel Qualifié** - Processus de recrutement rigoureux
9. **Intérim et Placement Temporaire** - Personnel temporaire flexible
10. **Préparation à l'Entretien d'Embauche et à la Rédaction du CV** - Optimisation de candidature

## 🚀 Fonctionnalités

### Design & UX
- ✨ Design moderne avec dégradés élégants
- 📱 Responsive (mobile, tablette, desktop)
- 🎨 Animations fluides et micro-interactions
- 🌈 Palette de couleurs professionnelle
- ⚡ Performance optimisée

### Sécurité
- 🔒 **Protection XSS** - Sanitisation de toutes les entrées utilisateur
- 🛡️ **Tokens CSRF** - Protection contre les attaques CSRF
- ✅ **Validation des entrées** - Validation côté client avec regex
- ⏱️ **Rate Limiting** - Protection contre le spam (5 tentatives/minute)
- 🔐 **Headers de sécurité** - CSP, X-Frame-Options, X-Content-Type-Options

### Performance
- 🚄 Optimisé pour gérer plusieurs utilisateurs simultanés
- 📦 Code minifiable pour production
- 🖼️ Support lazy loading pour images
- 🎯 Debounced scroll handlers
- 💾 Utilisation efficace de sessionStorage

## 📁 Structure du Projet

```
projet_dodo/
├── index.html          # Structure HTML sémantique
├── styles.css          # Design system complet
├── script.js           # JavaScript avec sécurité
└── README.md           # Documentation
```

## 🛠️ Technologies Utilisées

- **HTML5** - Structure sémantique et SEO
- **CSS3** - Design moderne avec variables CSS
- **JavaScript (Vanilla)** - Pas de dépendances externes
- **Google Fonts** - Poppins & Inter

## 🌐 Déploiement

### Option 1: Serveur Web Local (Test)

```bash
# Avec Python 3
cd projet_dodo
python3 -m http.server 8000

# Avec PHP
php -S localhost:8000

# Avec Node.js (npx)
npx http-server -p 8000
```

Puis ouvrez: `http://localhost:8000`

### Option 2: Hébergement Web

1. **Hébergement Statique** (Recommandé pour démarrer)
   - Netlify (gratuit)
   - Vercel (gratuit)
   - GitHub Pages (gratuit)
   - Cloudflare Pages (gratuit)

2. **Hébergement Traditionnel**
   - Uploadez tous les fichiers via FTP/SFTP
   - Assurez-vous que `index.html` est à la racine

### Option 3: Avec Backend (Production)

Pour un site en production avec formulaire fonctionnel:

1. **Backend Node.js/Express:**
```bash
npm install express cors helmet express-rate-limit
```

2. **Backend PHP:**
```php
// api/contact.php
<?php
header('Content-Type: application/json');
// Traitement du formulaire avec validation
?>
```

3. **Backend Python/Flask:**
```bash
pip install flask flask-cors
```

## 🔧 Configuration

### Personnalisation des Informations de Contact

Modifiez dans `index.html` (lignes ~450-470):

```html
<div class="contact__item">
    <span class="contact__icon">📧</span>
    <div>
        <h4>Email</h4>
        <p>votre-email@3dcoaching.com</p>
    </div>
</div>
```

### Personnalisation des Couleurs

Modifiez dans `styles.css` (lignes 10-20):

```css
:root {
    --color-primary: #4F46E5;
    --color-secondary: #7C3AED;
    /* Modifiez selon vos préférences */
}
```

## 🔐 Sécurité - Détails Techniques

### Protection XSS
```javascript
function sanitizeInput(input) {
    // Échappe les caractères dangereux
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };
    return input.replace(/[&<>"'/]/g, (char) => map[char]);
}
```

### CSRF Protection
- Génération de token aléatoire à chaque chargement de page
- Validation du token lors de la soumission
- Stockage sécurisé dans sessionStorage

### Rate Limiting
- Maximum 5 tentatives par minute
- Réinitialisation automatique après 60 secondes
- Message d'erreur avec temps restant

## 📈 Évolution Future

### Phase 1 (Actuel) ✅
- Site statique avec design moderne
- Sécurité côté client
- Formulaire de contact avec validation

### Phase 2 (Recommandé)
- [ ] Backend API (Node.js/PHP/Python)
- [ ] Base de données pour stocker les messages
- [ ] Système d'envoi d'emails automatique
- [ ] Tableau de bord administrateur

### Phase 3 (Avancé)
- [ ] Système de réservation en ligne
- [ ] Espace client avec authentification
- [ ] Blog/Actualités avec CMS
- [ ] Paiement en ligne
- [ ] Système de gestion de rendez-vous
- [ ] Chat en direct

## 🧪 Tests

### Tests Manuels Recommandés

1. **Responsive Design:**
   - Mobile (320px, 375px, 414px)
   - Tablette (768px, 1024px)
   - Desktop (1280px, 1920px)

2. **Navigateurs:**
   - Chrome/Edge (Chromium)
   - Firefox
   - Safari
   - Opera

3. **Formulaire:**
   - Validation des champs requis
   - Formats email/téléphone invalides
   - Messages trop courts/longs
   - Rate limiting (5+ soumissions)

4. **Performance:**
   - Google Lighthouse (cible: 90+)
   - PageSpeed Insights
   - GTmetrix

## 📞 Support & Maintenance

### Mise à Jour du Contenu

Pour modifier les services, éditez `index.html` section `<section class="services">`.

### Ajout de Nouvelles Sections

1. Ajoutez le HTML dans `index.html`
2. Ajoutez les styles dans `styles.css`
3. Ajoutez l'interactivité dans `script.js` si nécessaire
4. Mettez à jour la navigation

### Résolution de Problèmes

**Le formulaire ne s'envoie pas:**
- Vérifiez la console JavaScript (F12)
- Assurez-vous que le CSRF token est généré
- Vérifiez que tous les champs requis sont remplis

**Les animations ne fonctionnent pas:**
- Vérifiez que JavaScript est activé
- Testez dans un navigateur moderne
- Vérifiez la console pour les erreurs

**Le site ne s'affiche pas correctement:**
- Videz le cache du navigateur (Ctrl+F5)
- Vérifiez que tous les fichiers sont bien uploadés
- Vérifiez les chemins des fichiers CSS/JS

## 📝 Licence

© 2026 3D COACHING. Tous droits réservés.

## 👨‍💻 Développement

Site développé avec les meilleures pratiques:
- ✅ Code sémantique et accessible
- ✅ SEO optimisé
- ✅ Performance optimisée
- ✅ Sécurité renforcée
- ✅ Architecture évolutive

---

**Développé avec ❤️ pour votre réussite**

Pour toute question technique, consultez la documentation ou contactez votre développeur.
