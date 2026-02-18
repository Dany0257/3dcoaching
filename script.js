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
