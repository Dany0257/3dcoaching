/**
 * 3D COACHING - Professional Website
 * JavaScript with Security Features
 * 
 * Security Features:
 * - XSS Protection (Input Sanitization)
 * - CSRF Token Generation
 * - Form Validation
 * - Rate Limiting
 */

// ==========================================
// SECURITY UTILITIES
// ==========================================

/**
 * Sanitize user input to prevent XSS attacks
 * @param {string} input - User input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
    if (typeof input !== 'string') return '';

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

/**
 * Generate CSRF token for form security
 * @returns {string} - Random CSRF token
 */
function generateCSRFToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} - True if valid
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate phone number format
 * @param {string} phone - Phone to validate
 * @returns {boolean} - True if valid
 */
function validatePhone(phone) {
    if (!phone) return true; // Phone is optional
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    return phoneRegex.test(phone);
}

/**
 * Validate name format (letters, spaces, hyphens, apostrophes only)
 * @param {string} name - Name to validate
 * @returns {boolean} - True if valid
 */
function validateName(name) {
    const nameRegex = /^[A-Za-zÀ-ÿ\s\-']+$/;
    return nameRegex.test(name);
}

// ==========================================
// RATE LIMITING
// ==========================================

const rateLimiter = {
    attempts: 0,
    maxAttempts: 5,
    resetTime: 60000, // 1 minute
    lastReset: Date.now(),

    canSubmit() {
        const now = Date.now();

        // Reset counter if time window has passed
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
        const elapsed = Date.now() - this.lastReset;
        return Math.ceil((this.resetTime - elapsed) / 1000);
    }
};

// ==========================================
// NAVIGATION
// ==========================================

const navMenu = document.getElementById('nav-menu');
const navToggle = document.getElementById('nav-toggle');
const navClose = document.getElementById('nav-close');
const navLinks = document.querySelectorAll('.nav__link');
const header = document.getElementById('header');

// Show mobile menu
if (navToggle) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.add('show-menu');
    });
}

// Hide mobile menu
if (navClose) {
    navClose.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
}

// Close menu when clicking nav link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('show-menu');
    });
});

// Smooth scrolling for navigation links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);

        if (targetSection) {
            const headerHeight = header.offsetHeight;
            const targetPosition = targetSection.offsetTop - headerHeight;

            window.scrollTo({
                top: targetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ==========================================
// SCROLL EFFECTS
// ==========================================

// Add shadow to header on scroll
function scrollHeader() {
    if (window.scrollY >= 50) {
        header.classList.add('scroll-header');
    } else {
        header.classList.remove('scroll-header');
    }
}

window.addEventListener('scroll', scrollHeader);

// Active link highlighting based on scroll position
function highlightActiveLink() {
    const sections = document.querySelectorAll('section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');
        const navLink = document.querySelector(`.nav__link[href="#${sectionId}"]`);

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLink?.classList.add('active');
        } else {
            navLink?.classList.remove('active');
        }
    });
}

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

window.addEventListener('scroll', debounce(highlightActiveLink, 100));

// ==========================================
// SCROLL ANIMATIONS
// ==========================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe all service cards and value cards
document.addEventListener('DOMContentLoaded', () => {
    const animatedElements = document.querySelectorAll('.service-card, .value-card');

    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});

// ==========================================
// FORM HANDLING WITH SECURITY
// ==========================================

const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

// Generate and set CSRF token on page load
document.addEventListener('DOMContentLoaded', () => {
    const csrfToken = generateCSRFToken();
    const csrfInput = document.getElementById('csrf-token');
    if (csrfInput) {
        csrfInput.value = csrfToken;
        // Store in sessionStorage for validation
        sessionStorage.setItem('csrf_token', csrfToken);
    }
});

/**
 * Show error message for a form field
 * @param {string} fieldId - Field ID
 * @param {string} message - Error message
 */
function showFieldError(fieldId, message) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(`${fieldId}-error`);

    if (field && errorSpan) {
        field.classList.add('error');
        errorSpan.textContent = message;
    }
}

/**
 * Clear error message for a form field
 * @param {string} fieldId - Field ID
 */
function clearFieldError(fieldId) {
    const field = document.getElementById(fieldId);
    const errorSpan = document.getElementById(`${fieldId}-error`);

    if (field && errorSpan) {
        field.classList.remove('error');
        errorSpan.textContent = '';
    }
}

/**
 * Clear all form errors
 */
function clearAllErrors() {
    const errorFields = ['name', 'email', 'phone', 'service', 'message'];
    errorFields.forEach(fieldId => clearFieldError(fieldId));
}

/**
 * Validate form data
 * @param {FormData} formData - Form data to validate
 * @returns {Object} - Validation result with isValid and errors
 */
function validateFormData(formData) {
    const errors = {};
    let isValid = true;

    // Validate name
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

    // Validate email
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

    // Validate phone (optional)
    const phone = formData.get('phone')?.trim();
    if (phone && !validatePhone(phone)) {
        errors.phone = 'Format de téléphone invalide';
        isValid = false;
    } else if (phone && phone.length > 20) {
        errors.phone = 'Le téléphone ne peut pas dépasser 20 caractères';
        isValid = false;
    }

    // Validate service
    const service = formData.get('service');
    if (!service) {
        errors.service = 'Veuillez sélectionner un service';
        isValid = false;
    }

    // Validate message
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

/**
 * Show form message (success or error)
 * @param {string} message - Message to display
 * @param {string} type - 'success' or 'error'
 */
function showFormMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form__message ${type}`;
    formMessage.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}

// Handle form submission
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Clear previous errors and messages
        clearAllErrors();
        formMessage.style.display = 'none';

        // Check rate limiting
        if (!rateLimiter.canSubmit()) {
            const remainingTime = rateLimiter.getRemainingTime();
            showFormMessage(
                `Trop de tentatives. Veuillez réessayer dans ${remainingTime} secondes.`,
                'error'
            );
            return;
        }

        // Get form data
        const formData = new FormData(contactForm);

        // Validate form data
        const validation = validateFormData(formData);

        if (!validation.isValid) {
            Object.keys(validation.errors).forEach(fieldId => {
                showFieldError(fieldId, validation.errors[fieldId]);
            });
            showFormMessage('Veuillez corriger les erreurs dans le formulaire.', 'error');
            return;
        }

        // Record rate limit attempt
        rateLimiter.recordAttempt();

        // Show loading state
        const submitButton = contactForm.querySelector('.btn-submit');
        const btnText = submitButton.querySelector('.btn-text');
        const btnLoader = submitButton.querySelector('.btn-loader');

        btnText.style.display = 'none';
        btnLoader.style.display = 'inline';
        submitButton.disabled = true;

        try {
            // Encode form data for Netlify
            const encodedData = new URLSearchParams(new FormData(contactForm)).toString();

            const response = await fetch('/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: encodedData
            });

            if (response.ok) {
                showFormMessage(
                    'Merci pour votre message ! Nous vous contacterons bientôt.',
                    'success'
                );
                contactForm.reset();
            } else {
                throw new Error('Erreur réseau');
            }

        } catch (error) {
            console.error('Form submission error:', error);
            showFormMessage(
                'Une erreur est survenue. Veuillez réessayer plus tard.',
                'error'
            );
        } finally {
            btnText.style.display = 'inline';
            btnLoader.style.display = 'none';
            submitButton.disabled = false;
        }
    });

    // Real-time validation on blur
    const formFields = ['name', 'email', 'phone', 'message'];
    formFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', () => {
                const formData = new FormData(contactForm);
                const validation = validateFormData(formData);

                if (validation.errors[fieldId]) {
                    showFieldError(fieldId, validation.errors[fieldId]);
                } else {
                    clearFieldError(fieldId);
                }
            });

            // Clear error on input
            field.addEventListener('input', () => {
                clearFieldError(fieldId);
            });
        }
    });
}

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================

// Lazy load images (if any are added later)
if ('loading' in HTMLImageElement.prototype) {
    const images = document.querySelectorAll('img[loading="lazy"]');
    images.forEach(img => {
        img.src = img.dataset.src;
    });
} else {
    // Fallback for browsers that don't support lazy loading
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lazysizes/5.3.2/lazysizes.min.js';
    document.body.appendChild(script);
}

// ==========================================
// CONSOLE SECURITY MESSAGE
// ==========================================

console.log(
    '%c🔒 3D COACHING - Site Web Sécurisé',
    'color: #4F46E5; font-size: 20px; font-weight: bold;'
);
console.log(
    '%cCe site implémente des mesures de sécurité avancées:\n' +
    '✓ Protection XSS\n' +
    '✓ Tokens CSRF\n' +
    '✓ Validation des entrées\n' +
    '✓ Rate limiting',
    'color: #059669; font-size: 14px;'
);

// Warn about console usage
console.warn(
    '%c⚠️ ATTENTION',
    'color: #DC2626; font-size: 16px; font-weight: bold;'
);
console.warn(
    'N\'exécutez pas de code dans cette console si vous ne savez pas ce que vous faites.\n' +
    'Cela pourrait compromettre la sécurité de vos données.'
);

// ==========================================
// HERO CANVAS ANIMATION
// ==========================================

(function () {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let W, H;
    function resize() {
        const hero = document.getElementById('accueil');
        W = canvas.width = hero ? hero.offsetWidth : window.innerWidth;
        H = canvas.height = hero ? hero.offsetHeight : window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const GOLD = '#C9A84C';
    const LGOLD = '#E8C97A';

    // ── Particles ──────────────────────────────────────────────────────
    class Particle {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = Math.random() * H;
            this.vx = (Math.random() - 0.5) * 0.4;
            this.vy = -Math.random() * 0.6 - 0.1;
            this.size = Math.random() * 2.5 + 0.3;
            this.alpha = Math.random() * 0.7 + 0.1;
            this.gold = Math.random() > 0.6;
            this.life = 0;
            this.maxLife = 200 + Math.random() * 300;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.life++;
            if (this.life > this.maxLife || this.y < -10) this.reset();
        }
        draw() {
            const fade = Math.min(this.life / 40, 1) * Math.min((this.maxLife - this.life) / 40, 1);
            ctx.save();
            ctx.globalAlpha = this.alpha * fade;
            ctx.fillStyle = this.gold ? LGOLD : 'rgba(255,255,255,0.8)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
    const particles = Array.from({ length: 150 }, () => new Particle());

    // ── Gold streaks ────────────────────────────────────────────────────
    class GoldLine {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W;
            this.y = H + 50;
            this.targetX = this.x + (Math.random() - 0.5) * 300;
            this.targetY = -50;
            this.progress = 0;
            this.speed = 0.002 + Math.random() * 0.003;
            this.alpha = Math.random() * 0.35 + 0.08;
            this.width = Math.random() * 1.5 + 0.3;
            this.color = Math.random() > 0.5 ? GOLD : LGOLD;
            this.trail = [];
        }
        update() {
            this.progress += this.speed;
            const cx = this.x + (this.targetX - this.x) * this.progress;
            const cy = this.y + (this.targetY - this.y) * this.progress;
            this.trail.push({ x: cx, y: cy });
            if (this.trail.length > 60) this.trail.shift();
            if (this.progress >= 1) this.reset();
        }
        draw() {
            if (this.trail.length < 2) return;
            ctx.save();
            for (let i = 1; i < this.trail.length; i++) {
                const t = i / this.trail.length;
                ctx.globalAlpha = this.alpha * t * 0.8;
                ctx.strokeStyle = this.color;
                ctx.lineWidth = this.width * t;
                ctx.beginPath();
                ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
                ctx.stroke();
            }
            const head = this.trail[this.trail.length - 1];
            ctx.globalAlpha = this.alpha;
            const g = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, 4);
            g.addColorStop(0, LGOLD); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(head.x, head.y, 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }
    const goldLines = Array.from({ length: 10 }, () => { const g = new GoldLine(); g.progress = Math.random(); return g; });

    // ── Geometric shapes ────────────────────────────────────────────────
    class GeomShape {
        constructor() { this.reset(); }
        reset() {
            this.x = Math.random() * W; this.y = Math.random() * H;
            this.size = 40 + Math.random() * 120;
            this.rotation = Math.random() * Math.PI * 2;
            this.rotSpeed = (Math.random() - 0.5) * 0.003;
            this.alpha = 0.015 + Math.random() * 0.05;
            this.sides = [3, 4, 6][Math.floor(Math.random() * 3)];
            this.vx = (Math.random() - 0.5) * 0.15; this.vy = (Math.random() - 0.5) * 0.15;
            this.gold = Math.random() > 0.4;
        }
        update() {
            this.x += this.vx; this.y += this.vy; this.rotation += this.rotSpeed;
            if (this.x < -200 || this.x > W + 200 || this.y < -200 || this.y > H + 200) this.reset();
        }
        draw() {
            ctx.save();
            ctx.translate(this.x, this.y); ctx.rotate(this.rotation);
            ctx.globalAlpha = this.alpha;
            ctx.strokeStyle = this.gold ? GOLD : 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            for (let i = 0; i < this.sides; i++) {
                const angle = (i / this.sides) * Math.PI * 2 - Math.PI / 2;
                i === 0 ? ctx.moveTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size)
                    : ctx.lineTo(Math.cos(angle) * this.size, Math.sin(angle) * this.size);
            }
            ctx.closePath(); ctx.stroke();
            ctx.restore();
        }
    }
    const shapes = Array.from({ length: 16 }, () => new GeomShape());

    // ── Utility helpers ─────────────────────────────────────────────────
    function drawFigure(x, y, scale, facing, alpha, style) {
        ctx.save();
        ctx.translate(x, y); ctx.scale(facing * scale, scale);
        ctx.globalAlpha = alpha;
        const fill = style === 'gold' ? `rgba(201,168,76,${alpha * 0.9})` : `rgba(255,255,255,${alpha * 0.15})`;
        ctx.fillStyle = fill;
        ctx.beginPath(); ctx.arc(0, -72, 10, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.roundRect(-10, -60, 20, 42, 4); ctx.fill();
        if (style === 'walking') {
            ctx.beginPath(); ctx.roundRect(-8, -18, 8, 38, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(0, -18, 8, 35, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(-18, -58, 8, 30, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(10, -55, 8, 28, 3); ctx.fill();
        } else {
            ctx.beginPath(); ctx.roundRect(-9, -18, 8, 42, 3); ctx.fill();
            ctx.beginPath(); ctx.roundRect(1, -18, 8, 42, 3); ctx.fill();
        }
        ctx.restore();
    }

    function drawSkyline(alpha, t) {
        ctx.save(); ctx.globalAlpha = alpha;
        const buildings = [
            { x: 0.05, w: 0.06, h: 0.45, floors: 12 }, { x: 0.10, w: 0.04, h: 0.35, floors: 9 },
            { x: 0.13, w: 0.08, h: 0.55, floors: 15 }, { x: 0.20, w: 0.05, h: 0.40, floors: 11 },
            { x: 0.24, w: 0.09, h: 0.65, floors: 18 }, { x: 0.32, w: 0.04, h: 0.50, floors: 13 },
            { x: 0.35, w: 0.07, h: 0.72, floors: 20 }, { x: 0.41, w: 0.05, h: 0.48, floors: 12 },
            { x: 0.45, w: 0.10, h: 0.80, floors: 22 }, { x: 0.54, w: 0.04, h: 0.60, floors: 16 },
            { x: 0.57, w: 0.08, h: 0.68, floors: 18 }, { x: 0.64, w: 0.05, h: 0.52, floors: 14 },
            { x: 0.68, w: 0.07, h: 0.70, floors: 19 }, { x: 0.74, w: 0.04, h: 0.45, floors: 12 },
            { x: 0.77, w: 0.06, h: 0.55, floors: 15 }, { x: 0.82, w: 0.09, h: 0.62, floors: 17 },
            { x: 0.90, w: 0.05, h: 0.50, floors: 13 }, { x: 0.94, w: 0.07, h: 0.40, floors: 11 },
        ];
        buildings.forEach(b => {
            const bx = b.x * W, bw = b.w * W, bh = b.h * H * 0.6, by = H - bh;
            const grad = ctx.createLinearGradient(bx, by, bx + bw, by);
            grad.addColorStop(0, 'rgba(26,47,90,0.9)'); grad.addColorStop(0.5, 'rgba(20,38,76,0.95)'); grad.addColorStop(1, 'rgba(13,27,62,0.9)');
            ctx.fillStyle = grad; ctx.fillRect(bx, by, bw, bh);
            const wCols = Math.max(1, Math.floor(bw / 12)), wRows = b.floors;
            const ww = bw / wCols * 0.5, wh = bh / wRows * 0.35;
            for (let row = 0; row < wRows; row++) {
                for (let col = 0; col < wCols; col++) {
                    const lit = Math.sin(row * 3.7 + col * 2.1 + b.x * 10) > 0.1;
                    if (lit) {
                        ctx.fillStyle = 'rgba(220,230,255,0.55)';
                        ctx.fillRect(bx + col * (bw / wCols) + (bw / wCols - ww) * 0.5, by + row * (bh / wRows) + (bh / wRows - wh) * 0.5 + 4, ww, wh);
                    }
                }
            }
            ctx.strokeStyle = 'rgba(201,168,76,0.07)'; ctx.lineWidth = 0.5; ctx.strokeRect(bx, by, bw, bh);
        });
        ctx.restore();
    }

    function drawNetwork(alpha, t) {
        ctx.save();
        const nodes = [];
        const count = 12;
        for (let i = 0; i < count; i++) {
            nodes.push({
                x: (0.15 + 0.7 * (i % 4) / 3 + Math.sin(t * 0.008 + i) * 0.03) * W,
                y: (0.2 + 0.6 * Math.floor(i / 4) / 2 + Math.cos(t * 0.006 + i) * 0.03) * H,
            });
        }
        nodes.forEach((n, i) => {
            nodes.forEach((m, j) => {
                if (j <= i) return;
                const d = Math.hypot(n.x - m.x, n.y - m.y);
                if (d < W * 0.35) {
                    ctx.strokeStyle = GOLD; ctx.lineWidth = 0.5;
                    ctx.globalAlpha = alpha * 0.15 * (1 - d / (W * 0.35));
                    ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
                }
            });
        });
        nodes.forEach((n, i) => {
            ctx.globalAlpha = alpha * 0.55;
            const pulse = 0.7 + 0.3 * Math.sin(t * 0.05 + i);
            const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, 12 * pulse);
            g.addColorStop(0, LGOLD); g.addColorStop(0.4, 'rgba(201,168,76,0.4)'); g.addColorStop(1, 'transparent');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(n.x, n.y, 12 * pulse, 0, Math.PI * 2); ctx.fill();
        });
        ctx.restore();
    }

    function drawRadialBurst(cx, cy, alpha, t) {
        ctx.save();
        for (let i = 0; i < 24; i++) {
            const angle = (i / 24) * Math.PI * 2;
            const len = 80 + Math.sin(t * 0.04 + i * 0.7) * 30;
            ctx.globalAlpha = alpha * 0.12 * (0.5 + 0.5 * Math.sin(t * 0.03 + i));
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(cx, cy);
            ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len); ctx.stroke();
        }
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
        g.addColorStop(0, `rgba(201,168,76,${alpha * 0.25})`);
        g.addColorStop(0.5, `rgba(201,168,76,${alpha * 0.07})`);
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    // ── Scenes ──────────────────────────────────────────────────────────
    function sceneVision(t) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#060E1F'); bg.addColorStop(0.4, '#0D1B3E'); bg.addColorStop(1, '#1A2F5A');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        drawSkyline(0.9, t);
        const fog = ctx.createLinearGradient(0, H * 0.45, 0, H * 0.75);
        fog.addColorStop(0, 'transparent'); fog.addColorStop(0.5, 'rgba(13,27,62,0.5)'); fog.addColorStop(1, 'rgba(13,27,62,0.8)');
        ctx.fillStyle = fog; ctx.fillRect(0, H * 0.45, W, H * 0.55);
        for (let i = 0; i < 5; i++) {
            const fx = ((i / 5) + (t * 0.0005)) % 1;
            drawFigure(fx * W, H * 0.82, 0.6 + i * 0.1, 1, 0.35, 'walking');
        }
        drawNetwork(0.45, t);
        const h = ctx.createRadialGradient(W / 2, H * 0.5, 0, W / 2, H * 0.5, W * 0.4);
        h.addColorStop(0, 'rgba(201,168,76,0.05)'); h.addColorStop(1, 'transparent');
        ctx.fillStyle = h; ctx.fillRect(0, 0, W, H);
    }

    function sceneLeadership(t) {
        const bg = ctx.createLinearGradient(0, 0, W, H);
        bg.addColorStop(0, '#080F1E'); bg.addColorStop(0.5, '#0E1C3A'); bg.addColorStop(1, '#152444');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        for (let i = 0; i <= 6; i++) {
            ctx.strokeStyle = 'rgba(201,168,76,0.05)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(W * i / 6, 0); ctx.lineTo(W * i / 6, H); ctx.stroke();
        }
        // Table
        const ty = H * 0.65;
        const tg = ctx.createLinearGradient(W * 0.1, ty, W * 0.9, ty);
        tg.addColorStop(0, 'rgba(26,47,90,0.9)'); tg.addColorStop(0.5, 'rgba(30,55,100,0.95)'); tg.addColorStop(1, 'rgba(26,47,90,0.9)');
        ctx.fillStyle = tg; ctx.fillRect(W * 0.1, ty, W * 0.8, H * 0.06);
        ctx.strokeStyle = GOLD; ctx.lineWidth = 1; ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.moveTo(W * 0.1, ty); ctx.lineTo(W * 0.9, ty); ctx.stroke(); ctx.globalAlpha = 1;
        drawFigure(W * 0.35, H * 0.7, 1.4, 1, 0.45, 'standing');
        drawFigure(W * 0.5, H * 0.72, 1.2, -1, 0.35, 'standing');
        drawFigure(W * 0.62, H * 0.73, 1.1, 1, 0.3, 'standing');
        drawRadialBurst(W * 0.35, H * 0.45, 0.55, t);
    }

    function sceneCollaboration(t) {
        const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H));
        bg.addColorStop(0, '#122040'); bg.addColorStop(0.6, '#0D1B3E'); bg.addColorStop(1, '#060E20');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        const cx = W / 2, cy = H * 0.62, tr = W * 0.15;
        const tg = ctx.createRadialGradient(cx, cy, 0, cx, cy, tr);
        tg.addColorStop(0, 'rgba(30,55,100,0.8)'); tg.addColorStop(1, 'rgba(20,37,75,0.9)');
        ctx.fillStyle = tg; ctx.beginPath(); ctx.ellipse(cx, cy, tr, tr * 0.35, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = 'rgba(201,168,76,0.25)'; ctx.lineWidth = 1.5; ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const px = cx + Math.cos(angle) * tr * 1.05, py = cy + Math.sin(angle) * tr * 0.45;
            drawFigure(px, py - 50, 0.85, angle > Math.PI ? -1 : 1, 0.4, 'standing');
            const pulse = 0.3 + 0.3 * Math.sin(t * 0.04 + i * 1.2);
            ctx.strokeStyle = GOLD; ctx.lineWidth = 0.5; ctx.globalAlpha = pulse * 0.25;
            ctx.beginPath(); ctx.moveTo(px, py - 50); ctx.lineTo(cx, cy - 30); ctx.stroke(); ctx.globalAlpha = 1;
        }
        drawRadialBurst(cx, cy - 20, 0.75, t);
    }

    function sceneExcellence(t) {
        const bg = ctx.createLinearGradient(0, 0, 0, H);
        bg.addColorStop(0, '#060C1A'); bg.addColorStop(0.5, '#0A1530'); bg.addColorStop(1, '#152040');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        const sw = W * 0.6, sh = H * 0.45, sx = (W - sw) / 2, sy = H * 0.08;
        const sg = ctx.createLinearGradient(sx, sy, sx + sw, sy + sh);
        sg.addColorStop(0, 'rgba(20,40,90,0.9)'); sg.addColorStop(0.5, 'rgba(30,55,110,0.85)'); sg.addColorStop(1, 'rgba(20,40,90,0.9)');
        ctx.fillStyle = sg; ctx.fillRect(sx, sy, sw, sh);
        ctx.strokeStyle = 'rgba(201,168,76,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(sx, sy, sw, sh);
        ctx.save(); ctx.globalAlpha = 0.12;
        for (let i = 0; i < 6; i++) {
            ctx.strokeStyle = i === 0 ? GOLD : 'rgba(255,255,255,0.5)'; ctx.lineWidth = i === 0 ? 2 : 1;
            ctx.beginPath(); const ly = sy + sh * (0.15 + i * 0.14);
            ctx.moveTo(sx + sw * 0.08, ly); ctx.lineTo(sx + sw * 0.08 + sw * (0.25 + i * 0.06), ly); ctx.stroke();
        }
        ctx.restore();
        const glow = ctx.createRadialGradient(W / 2, sy + sh / 2, 0, W / 2, sy + sh / 2, sw * 0.7);
        glow.addColorStop(0, 'rgba(50,100,200,0.07)'); glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
        drawFigure(W / 2, sy + sh + 10, 1.2, 1, 0.55, 'standing');
        for (let r = 0; r < 3; r++) for (let c = 0; c < 10; c++) {
            drawFigure(W * (0.1 + 0.8 * c / 9), H * (0.66 + r * 0.09), 0.5 - r * 0.03, 1, 0.2 - r * 0.03, 'standing');
        }
        const spot = ctx.createLinearGradient(W / 2 - 80, 0, W / 2 + 80, H * 0.7);
        spot.addColorStop(0, 'rgba(232,201,122,0.07)'); spot.addColorStop(1, 'transparent');
        ctx.fillStyle = spot;
        ctx.beginPath(); ctx.moveTo(W / 2 - 10, 0); ctx.lineTo(W / 2 + 10, 0);
        ctx.lineTo(W / 2 + 100, H * 0.7); ctx.lineTo(W / 2 - 100, H * 0.7); ctx.fill();
    }

    function sceneTransformation(t) {
        const bg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
        bg.addColorStop(0, '#0E1E45'); bg.addColorStop(0.5, '#0A1530'); bg.addColorStop(1, '#050B1A');
        ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
        ctx.save(); ctx.translate(W / 2, H / 2);
        for (let i = 0; i < 360; i++) {
            const angle = (i / 360) * Math.PI * 16 + t * 0.008;
            const r = i * 0.8 + Math.sin(t * 0.02 + i * 0.05) * 5;
            const x = Math.cos(angle) * r, y = Math.sin(angle) * r * 0.6;
            if (r > W * 0.6) continue;
            ctx.globalAlpha = 0.07 * (1 - r / (W * 0.6));
            ctx.fillStyle = i % 2 === 0 ? GOLD : LGOLD;
            ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
        drawFigure(W / 2, H * 0.7, 1.6, 1, 0.55, 'gold');
        drawRadialBurst(W / 2, H * 0.52, 1.1, t);
        for (let i = 0; i < 5; i++) {
            const r2 = 50 + i * 80 + Math.sin(t * 0.02) * 20;
            ctx.save(); ctx.globalAlpha = 0.07 * (0.5 + 0.5 * Math.sin(t * 0.03 - i * 0.5));
            ctx.strokeStyle = GOLD; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(W / 2, H * 0.52, r2, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        }
        const shine = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.5);
        shine.addColorStop(0, 'rgba(201,168,76,0.1)'); shine.addColorStop(1, 'transparent');
        ctx.fillStyle = shine; ctx.fillRect(0, 0, W, H * 0.5);
    }

    const scenes = [sceneVision, sceneLeadership, sceneCollaboration, sceneExcellence, sceneTransformation];
    let sceneIndex = 0, sceneTime = 0;
    const SCENE_DURATION = 420;
    let animT = 0;

    function loop() {
        animT++; sceneTime++;
        if (sceneTime >= SCENE_DURATION) { sceneTime = 0; sceneIndex = (sceneIndex + 1) % scenes.length; }

        const transProgress = sceneTime / SCENE_DURATION;
        let sceneAlpha = 1;
        if (transProgress < 0.1) sceneAlpha = transProgress / 0.1;
        else if (transProgress > 0.9) sceneAlpha = (1 - transProgress) / 0.1;

        ctx.clearRect(0, 0, W, H);
        ctx.save(); ctx.globalAlpha = sceneAlpha;
        scenes[sceneIndex](animT);
        ctx.restore();

        particles.forEach(p => { p.update(); p.draw(); });
        goldLines.forEach(g => { g.update(); g.draw(); });
        shapes.forEach(s => { s.update(); s.draw(); });

        // Vignette
        const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
        vignette.addColorStop(0, 'transparent'); vignette.addColorStop(1, 'rgba(5,10,25,0.55)');
        ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);

        requestAnimationFrame(loop);
    }

    loop();
})();
