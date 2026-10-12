/**
 * 3D COACHING — Mode maintenance
 * ------------------------------
 * Quand « maintenance.actif » vaut true dans content.json, chaque visiteur
 * voit une page « Site en maintenance » au lieu du site.
 *
 * La page renvoie le code 503 (indisponible temporairement) : Google comprend
 * que l'arrêt est provisoire et garde le site dans ses résultats.
 *
 * L'espace admin et ce dont il a besoin (fonctions, images, content.json,
 * styles.css, icons.js) restent accessibles, pour pouvoir désactiver la
 * maintenance depuis /admin.
 *
 * content.json est lu au moment de la mise en ligne : activer ou désactiver
 * la maintenance demande donc une publication (ce que fait l'espace admin).
 */

import contenu from '../../content.json' with { type: 'json' };

function esc(texte) {
    return String(texte == null ? '' : texte)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function page() {
    const m = contenu.maintenance || {};
    const c = contenu.contact || {};
    const titre = m.titre || 'Site en maintenance';
    const paragraphes = String(m.message || '')
        .split('\n').map(l => l.trim()).filter(Boolean)
        .map(l => `<p>${esc(l)}</p>`).join('');
    const tel = String(c.telephone || '').replace(/[^\d+]/g, '');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="robots" content="noindex">
<title>${esc(titre)} — 3D COACHING</title>
<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png">
<style>
    * { box-sizing: border-box; margin: 0; }
    body {
        min-height: 100vh; display: flex; align-items: center; justify-content: center;
        padding: 2rem 1.25rem; font-family: 'Poppins', system-ui, sans-serif; color: #fff;
        background: linear-gradient(135deg, #0D1B3E 0%, #1A2F5A 60%, #243B6E 100%);
        text-align: center;
    }
    main { max-width: 34rem; }
    img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin-bottom: 1.5rem; }
    h1 { font-size: clamp(1.6rem, 5vw, 2.4rem); margin-bottom: 1rem; color: #E8C97A; }
    p { line-height: 1.7; opacity: .9; margin-bottom: .5rem; }
    .contact { margin-top: 2rem; display: flex; flex-wrap: wrap; gap: .75rem; justify-content: center; }
    .contact a {
        color: #0D1B3E; background: linear-gradient(135deg, #C9A84C 0%, #E8C97A 100%);
        padding: .7rem 1.3rem; border-radius: 999px; text-decoration: none; font-weight: 600;
    }
</style>
</head>
<body>
<main>
    <img src="/logo3d.webp" alt="3D COACHING">
    <h1>${esc(titre)}</h1>
    ${paragraphes}
    <div class="contact">
        ${c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : ''}
        ${tel ? `<a href="tel:${esc(tel)}">${esc(c.telephone)}</a>` : ''}
    </div>
</main>
</body>
</html>`;
}

export default async (requete, context) => {
    if (!contenu.maintenance || contenu.maintenance.actif !== true) return context.next();

    return new Response(page(), {
        status: 503,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
            'Retry-After': '86400'
        }
    });
};

export const config = {
    path: '/*',
    excludedPath: [
        '/admin', '/admin/*',
        '/.netlify/*',
        '/images/*',
        '/content.json', '/styles.css', '/icons.js',
        '/logo3d.webp', '/logo3d.jpeg', '/logo-3dcoaching.png',
        '/favicon-96.png', '/favicon-192.png', '/apple-touch-icon.png',
        '/googled9515b4a519dca56.html'
    ]
};
