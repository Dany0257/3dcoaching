/**
 * 3D COACHING — Script principal
 * ------------------------------
 * Navigation, effets de défilement, galerie photos et formulaire de contact.
 *
 * Sécurité du formulaire :
 *  - jeton anti-CSRF généré à chaque visite
 *  - validation de tous les champs avant envoi
 *  - limitation à 5 envois par minute
 */

// ==========================================================================
// VALIDATION
// ==========================================================================

/** Jeton anti-CSRF pour le formulaire. */
function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    if (!phone) return true; // le téléphone est facultatif
    return /^[\d\s\+\-\(\)]+$/.test(phone);
}

function validateName(name) {
    return /^[A-Za-zÀ-ÿ\s\-']+$/.test(name);
}

// ==========================================================================
// LIMITATION DES ENVOIS
// ==========================================================================

const rateLimiter = {
    attempts: 0,
    maxAttempts: 5,
    resetTime: 60000,
    lastReset: Date.now(),

    canSubmit() {
        const now = Date.now();
        if (now - this.lastReset > this.resetTime) {
            this.attempts = 0;
            this.lastReset = now;
        }
        return this.attempts < this.maxAttempts;
    },

    recordAttempt() {
        this.attempts++;
    },

    getRemainingTime() {
        return Math.ceil((this.resetTime - (Date.now() - this.lastReset)) / 1000);
    }
};

// ==========================================================================
// NAVIGATION
// ==========================================================================

const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');
const navLinks = document.querySelectorAll('.nav__link');
const header = document.getElementById('header');

function ouvrirMenu() {
    navMenu.classList.add('show-menu');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
}

function fermerMenu() {
    navMenu.classList.remove('show-menu');
    if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
}

if (navToggle && navMenu) navToggle.addEventListener('click', ouvrirMenu);
if (navClose && navMenu) navClose.addEventListener('click', fermerMenu);

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('show-menu')) fermerMenu();
});

// Défilement doux qui tient compte de l'en-tête fixe
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (navMenu) fermerMenu();
        if (!href || !href.startsWith('#')) return;

        const cible = document.querySelector(href);
        if (!cible) return;

        e.preventDefault();
        const hauteurEntete = header ? header.offsetHeight : 0;
        const y = cible.getBoundingClientRect().top + window.scrollY - hauteurEntete;
        window.scrollTo({ top: y, behavior: 'smooth' });
        history.replaceState(null, '', href);
    });
});

// ==========================================================================
// EFFETS DE DÉFILEMENT
// ==========================================================================

const sectionsAvecId = document.querySelectorAll('section[id]');
let defilementEnAttente = false;

function auDefilement() {
    if (header) header.classList.toggle('scroll-header', window.scrollY >= 50);

    const y = window.scrollY;
    sectionsAvecId.forEach(section => {
        const haut = section.offsetTop - 120;
        const lien = document.querySelector(`.nav__link[href="#${section.id}"]`);
        if (!lien) return;
        lien.classList.toggle('active', y > haut && y <= haut + section.offsetHeight);
    });
    defilementEnAttente = false;
}

window.addEventListener('scroll', () => {
    // Une seule mise à jour par image affichée : plus fluide qu'un minuteur.
    if (!defilementEnAttente) {
        defilementEnAttente = true;
        requestAnimationFrame(auDefilement);
    }
}, { passive: true });

// ==========================================================================
// APPARITION DES CARTES AU DÉFILEMENT
// ==========================================================================

document.addEventListener('DOMContentLoaded', () => {
    const animables = document.querySelectorAll('.service-card, .value-card, .gallery__item');
    const animationsReduites = window.matchMedia
        && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (animationsReduites || !('IntersectionObserver' in window)) return;

    const observateur = new IntersectionObserver((entrees) => {
        entrees.forEach(entree => {
            if (!entree.isIntersecting) return;
            entree.target.style.opacity = '1';
            entree.target.style.transform = 'none';
            observateur.unobserve(entree.target);
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });

    animables.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(24px)';
        el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observateur.observe(el);
    });
});

// ==========================================================================
// GALERIE « NOS RÉALISATIONS »
// ==========================================================================

(function galerie() {
    const grille = document.getElementById('gallery');
    const boite = document.getElementById('lightbox');
    if (!grille || !boite) return;

    const image = document.getElementById('lightbox-img');
    const legende = document.getElementById('lightbox-caption');
    const boutonFermer = document.getElementById('lightbox-close');
    const boutonPrec = document.getElementById('lightbox-prev');
    const boutonSuiv = document.getElementById('lightbox-next');

    const items = Array.from(grille.querySelectorAll('.gallery__item'));
    if (!items.length) return;

    let index = 0;
    let declencheur = null;

    const photos = items.map(item => {
        const img = item.querySelector('img');
        return { src: img.getAttribute('src'), alt: img.getAttribute('alt') || '' };
    });

    const uneSeule = photos.length < 2;
    if (uneSeule) {
        boutonPrec.hidden = true;
        boutonSuiv.hidden = true;
    }

    function afficher(i) {
        index = (i + photos.length) % photos.length;
        const photo = photos[index];
        image.src = photo.src;
        image.alt = photo.alt;
        legende.textContent = photo.alt;
    }

    function ouvrir(i, source) {
        declencheur = source || null;
        afficher(i);
        boite.hidden = false;
        document.body.style.overflow = 'hidden';
        boutonFermer.focus();
    }

    function fermer() {
        boite.hidden = true;
        document.body.style.overflow = '';
        image.src = '';
        if (declencheur) declencheur.focus();
    }

    items.forEach((item, i) => item.addEventListener('click', () => ouvrir(i, item)));

    boutonFermer.addEventListener('click', fermer);
    boutonPrec.addEventListener('click', () => afficher(index - 1));
    boutonSuiv.addEventListener('click', () => afficher(index + 1));

    boite.addEventListener('click', (e) => {
        if (e.target === boite) fermer();   // clic à côté de la photo
    });

    document.addEventListener('keydown', (e) => {
        if (boite.hidden) return;
        if (e.key === 'Escape') fermer();
        else if (e.key === 'ArrowLeft' && !uneSeule) afficher(index - 1);
        else if (e.key === 'ArrowRight' && !uneSeule) afficher(index + 1);
    });
})();

// ==========================================================================
// FORMULAIRE DE CONTACT
// ==========================================================================

const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

document.addEventListener('DOMContentLoaded', () => {
    const csrfInput = document.getElementById('csrf-token');
    if (csrfInput) {
        const jeton = generateCSRFToken();
        csrfInput.value = jeton;
        sessionStorage.setItem('csrf_token', jeton);
    }
});

function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(`${fieldId}-error`);
    if (field && errorSpan) {
        field.classList.add('error');
        errorSpan.textContent = message;
    }
}

function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(`${fieldId}-error`);
    if (field && errorSpan) {
        field.classList.remove('error');
        errorSpan.textContent = '';
    }
}

function clearAllErrors() {
    ['name', 'email', 'phone', 'service', 'message'].forEach(clearFieldError);
}

function validateFormData(formData) {
    const errors = {};
    let isValid = true;

    const name = formData.get('name')?.trim();
    if (!name || name.length < 2) {
        errors.name = 'Le nom doit contenir au moins 2 caractères';
        isValid = false;
    } else if (name.length > 100) {
        errors.name = 'Le nom ne peut pas dépasser 100 caractères';
        isValid = false;
    } else if (!validateName(name)) {
        errors.name = 'Le nom contient des caractères invalides';
        isValid = false;
    }

    const email = formData.get('email')?.trim();
    if (!email) {
        errors.email = 'L\'email est requis';
        isValid = false;
    } else if (!validateEmail(email)) {
        errors.email = 'Format d\'email invalide';
        isValid = false;
    } else if (email.length > 100) {
        errors.email = 'L\'email ne peut pas dépasser 100 caractères';
        isValid = false;
    }

    const phone = formData.get('phone')?.trim();
    if (phone && !validatePhone(phone)) {
        errors.phone = 'Format de téléphone invalide';
        isValid = false;
    } else if (phone && phone.length > 20) {
        errors.phone = 'Le téléphone ne peut pas dépasser 20 caractères';
        isValid = false;
    }

    if (!formData.get('service')) {
        errors.service = 'Veuillez sélectionner un service';
        isValid = false;
    }

    const message = formData.get('message')?.trim();
    if (!message || message.length < 10) {
        errors.message = 'Le message doit contenir au moins 10 caractères';
        isValid = false;
    } else if (message.length > 1000) {
        errors.message = 'Le message ne peut pas dépasser 1000 caractères';
        isValid = false;
    }

    return { isValid, errors };
}

function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form__message ${type}`;
    formMessage.style.display = 'block';
    setTimeout(() => { formMessage.style.display = 'none'; }, 6000);
}

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearAllErrors();
        formMessage.style.display = 'none';

        if (!rateLimiter.canSubmit()) {
            showFormMessage(
                `Trop de tentatives. Veuillez réessayer dans ${rateLimiter.getRemainingTime()} secondes.`,
                'error'
            );
            return;
        }

        const formData = new FormData(contactForm);
        const validation = validateFormData(formData);

        if (!validation.isValid) {
            Object.keys(validation.errors).forEach(fieldId => {
                showFieldError(fieldId, validation.errors[fieldId]);
            });
            showFormMessage('Veuillez corriger les erreurs dans le formulaire.', 'error');
            return;
        }

        rateLimiter.recordAttempt();

        const submitButton = contactForm.querySelector('.btn-submit');
        const btnText = submitButton.querySelector('.btn-text');
        const btnLoader = submitButton.querySelector('.btn-loader');

        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        submitButton.disabled = true;

        try {
            const encodedData = new URLSearchParams(new FormData(contactForm)).toString();

            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encodedData
            });

            if (!response.ok) throw new Error('Erreur réseau');

            showFormMessage('Merci pour votre message ! Nous vous contacterons bientôt.', 'success');
            contactForm.reset();

        } catch (error) {
            showFormMessage('Une erreur est survenue. Veuillez réessayer plus tard.', 'error');
        } finally {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    // Vérification au fil de la saisie
    ['name', 'email', 'phone', 'message'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.addEventListener('blur', () => {
            const validation = validateFormData(new FormData(contactForm));
            if (validation.errors[fieldId]) showFieldError(fieldId, validation.errors[fieldId]);
            else clearFieldError(fieldId);
        });

        field.addEventListener('input', () => clearFieldError(fieldId));
    });
}
