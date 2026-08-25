/**
 * 3D COACHING — Construction du site
 * ----------------------------------
 * Assemble template.html + content.json + styles.css → index.html
 *
 * Le fichier index.html produit est un fichier STATIQUE complet : tout le texte
 * y est déjà écrit, rien n'est chargé en JavaScript. Google voit la page entière
 * et le visiteur n'a aucun clignotement au chargement.
 *
 * Utilisation :   node build.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const { ICONS } = require('./icons.js');

// ---------------------------------------------------------------- utilitaires

/** Échappe le texte pour l'insérer sans danger dans du HTML. */
function esc(value) {
    return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Remplace un marqueur sans interpréter les $ du texte de remplacement. */
function fill(template, key, value) {
    return template.split('{{' + key + '}}').join(value == null ? '' : String(value));
}

/** Minification CSS prudente : commentaires et espaces superflus. */
function minifyCss(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\n\s*/g, '\n')
        .replace(/\s*([{};,])\s*/g, '$1')
        .replace(/:\s+/g, ':')
        .replace(/;}/g, '}')
        .replace(/\s{2,}/g, ' ')
        .trim();
}

/** Un identifiant utilisable dans une URL, à partir d'un titre. */
function slug(text) {
    return String(text).toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'element';
}

/** Numéro de téléphone au format lien (chiffres uniquement). */
function telLink(number) {
    return String(number || '').replace(/[^\d+]/g, '');
}

const iconsUsed = new Set();

/** Référence une icône du sprite. */
function icon(name, className) {
    const key = ICONS[name] ? name : 'star-fill';
    iconsUsed.add(key);
    return `<svg class="${className || 'ico'}" aria-hidden="true"><use href="#i-${key}"></use></svg>`;
}

// ------------------------------------------------------------------- rendu

function renderValeurs(valeurs) {
    return valeurs.map(v => `                    <div class="value-card">
                        <div class="value-card__icon">${icon(v.icone)}</div>
                        <h4>${esc(v.titre)}</h4>
                        <p>${esc(v.texte)}</p>
                    </div>`).join('\n');
}

function renderServices(liste) {
    return liste.map(s => {
        const points = (s.points || []).filter(Boolean);
        const listeHtml = points.length
            ? `\n                        <ul class="service-card__list">\n${points.map(p => `                            <li>${esc(p)}</li>`).join('\n')}\n                        </ul>`
            : '';
        return `                    <article class="service-card">
                        <div class="service-card__icon">${icon(s.icone)}</div>
                        <h3 class="service-card__title">${esc(s.titre)}</h3>
                        <p class="service-card__description">${esc(s.description)}</p>${listeHtml}
                    </article>`;
    }).join('\n');
}

function renderFormations(liste) {
    return liste.map(f => {
        const accroche = f.accroche
            ? `\n                        <p class="service-card__catchphrase">${esc(f.accroche)}</p>`
            : '';
        return `                    <article class="service-card">
                        <div class="service-card__icon">${icon(f.icone)}</div>
                        <h3 class="service-card__title">${esc(f.titre)}</h3>${accroche}
                        <p class="service-card__description">${esc(f.description)}</p>
                    </article>`;
    }).join('\n');
}

function renderRealisations(bloc) {
    const photos = (bloc && bloc.photos ? bloc.photos : []).filter(p => p && p.fichier);
    if (!bloc || bloc.afficher === false || photos.length === 0) return { nav: '', section: '' };

    const items = photos.map((p, i) => {
        const legende = esc(p.legende || '');
        const w = Number(p.largeur) || 1200;
        const h = Number(p.hauteur) || 900;
        // Les trois premières photos se chargent normalement, les suivantes
        // seulement quand le visiteur approche de la galerie.
        const lazy = i < 3 ? '' : ' loading="lazy"';
        return `                    <button class="gallery__item" type="button" data-index="${i}"${legende ? ` aria-label="Agrandir la photo : ${legende}"` : ' aria-label="Agrandir la photo"'}>
                        <img src="${esc(p.fichier)}" alt="${legende}" width="${w}" height="${h}"${lazy} decoding="async">
${legende ? `                        <span class="gallery__caption">${legende}</span>\n` : ''}                    </button>`;
    }).join('\n');

    const nav = `                    <li class="nav__item"><a href="#realisations" class="nav__link">Réalisations</a></li>\n`;
    const section = `        <!-- Réalisations -->
        <section class="realisations section" id="realisations">
            <div class="container">
                <div class="section__header">
                    <h2 class="section__title">${esc(bloc.titre || 'Nos Réalisations')}</h2>
                    <p class="section__subtitle">${esc(bloc.sousTitre || '')}</p>
                </div>

                <div class="gallery" id="gallery">
${items}
                </div>
            </div>
        </section>

`;
    return { nav, section };
}

function renderOptions(services) {
    const options = services.map(s => `                                <option value="${esc(s.id || slug(s.titre))}">${esc(s.titre)}</option>`);
    options.push('                                <option value="formation">Formation professionnelle</option>');
    options.push('                                <option value="autre">Autre</option>');
    return options.join('\n');
}

function renderLiensServices(liens) {
    return (liens || []).map(l => `                        <li><a href="#services">${esc(l)}</a></li>`).join('\n');
}

function renderReseaux(reseaux) {
    const liste = (reseaux || []).filter(r => r && r.url && r.icone);
    if (!liste.length) return '';
    const items = liste.map(r =>
        `                        <a href="${esc(r.url)}" class="footer__social-link" rel="noopener" target="_blank" aria-label="${esc(r.nom || r.icone)}">${icon(r.icone)}</a>`
    ).join('\n');
    return `                    <div class="footer__social">\n${items}\n                    </div>\n`;
}

function renderSprite() {
    const symbols = [...iconsUsed].sort().map(name =>
        `<symbol id="i-${name}" viewBox="0 0 16 16">${ICONS[name]}</symbol>`
    ).join('');
    return `<svg class="sprite" aria-hidden="true" focusable="false"><defs>${symbols}</defs></svg>`;
}

function renderJsonLd(c) {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'ProfessionalService',
        name: '3D COACHING',
        slogan: c.hero.slogan,
        description: c.site.description,
        url: 'https://3dcoaching.business/',
        image: 'https://3dcoaching.business/logo3d.jpeg',
        email: c.contact.email,
        telephone: c.contact.telephone,
        address: {
            '@type': 'PostalAddress',
            streetAddress: c.contact.adresse,
            addressLocality: 'Bujumbura',
            addressCountry: 'BI'
        },
        areaServed: 'BI',
        makesOffer: c.services.liste.map(s => ({
            '@type': 'Offer',
            itemOffered: { '@type': 'Service', name: s.titre, description: s.description }
        }))
    };
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

// -------------------------------------------------------------------- build

function build() {
    const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content.json'), 'utf8'));
    const template = fs.readFileSync(path.join(ROOT, 'template.html'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'styles.css'), 'utf8');

    const services = (content.services.liste || []).filter(s => s && s.titre);
    const formations = (content.formations.liste || []).filter(f => f && f.titre);
    const realisations = renderRealisations(content.realisations);

    // Les icônes sont collectées pendant le rendu, le sprite est construit après.
    const valeursHtml = renderValeurs(content.apropos.valeurs || []);
    const servicesHtml = renderServices(services);
    const formationsHtml = renderFormations(formations);
    const reseauxHtml = renderReseaux(content.pied.reseaux);
    ['envelope', 'telephone', 'whatsapp', 'geo-alt'].forEach(n => iconsUsed.add(n));

    let html = template;
    const values = {
        SITE_TITLE: esc(content.site.titre),
        SITE_DESCRIPTION: esc(content.site.description),
        SITE_KEYWORDS: esc(content.site.motsCles),

        HERO_TITRE: esc(content.hero.titre),
        HERO_SLOGAN: esc(content.hero.slogan),
        HERO_DESCRIPTION: esc(content.hero.description),
        HERO_BTN1: esc(content.hero.boutonPrincipal),
        HERO_BTN2: esc(content.hero.boutonSecondaire),

        APROPOS_TITRE: esc(content.apropos.titre),
        APROPOS_SOUSTITRE: esc(content.apropos.sousTitre),
        APROPOS_TITRE_MISSION: esc(content.apropos.titreMission),
        APROPOS_PARAGRAPHES: (content.apropos.paragraphes || [])
            .map(p => `                        <p>${esc(p)}</p>`).join('\n'),
        APROPOS_VALEURS: valeursHtml,

        SERVICES_TITRE: esc(content.services.titre),
        SERVICES_SOUSTITRE: esc(content.services.sousTitre),
        SERVICES_CARTES: servicesHtml,

        FORMATIONS_TITRE: esc(content.formations.titre),
        FORMATIONS_SOUSTITRE: esc(content.formations.sousTitre),
        FORMATIONS_CARTES: formationsHtml,

        NAV_REALISATIONS: realisations.nav,
        SECTION_REALISATIONS: realisations.section,

        CONTACT_TITRE: esc(content.contact.titre),
        CONTACT_SOUSTITRE: esc(content.contact.sousTitre),
        CONTACT_TITRE_INTRO: esc(content.contact.titreIntro),
        CONTACT_INTRO: esc(content.contact.intro),
        CONTACT_EMAIL: esc(content.contact.email),
        CONTACT_TEL: esc(content.contact.telephone),
        CONTACT_TEL_LIEN: esc(telLink(content.contact.telephone)),
        CONTACT_WA: esc(content.contact.whatsapp),
        CONTACT_WA_LIEN: esc(telLink(content.contact.whatsapp).replace(/^\+/, '')),
        CONTACT_ADRESSE: esc(content.contact.adresse),

        FORM_OPTIONS: renderOptions(services),

        PIED_DESCRIPTION: esc(content.pied.description),
        PIED_LIENS_SERVICES: renderLiensServices(content.pied.liensServices),
        PIED_RESEAUX: reseauxHtml,
        PIED_COPYRIGHT: esc(content.pied.copyright),

        JSONLD: renderJsonLd(content),
        STYLES: minifyCss(css),
        SPRITE: renderSprite()
    };

    for (const [key, value] of Object.entries(values)) html = fill(html, key, value);

    const reste = html.match(/\{\{[A-Z_]+\}\}/g);
    if (reste) throw new Error('Marqueurs non remplacés : ' + reste.join(', '));

    fs.writeFileSync(path.join(ROOT, 'index.html'), html);

    // Plan du site, pour les moteurs de recherche
    const jour = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(path.join(ROOT, 'sitemap.xml'),
        `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://3dcoaching.business/</loc>
    <lastmod>${jour}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`);

    const ko = (html.length / 1024).toFixed(1);
    console.log(`index.html construit — ${ko} Ko · ${services.length} services · ${formations.length} formations · ${(content.realisations.photos || []).length} photos · ${iconsUsed.size} icônes`);
}

build();
