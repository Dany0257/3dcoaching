/**
 * 3D COACHING — Connexion à l'espace admin
 * ----------------------------------------
 * Vérifie le mot de passe et délivre un jeton de session signé, valable 2 h.
 *
 * Le mot de passe n'est stocké nulle part en clair : la variable
 * ADMIN_PASSWORD_HASH contient « sel:empreinte » (PBKDF2-SHA512, 210 000 tours).
 * Générer cette valeur avec :  node outils/mot-de-passe.js
 *
 * Aucune dépendance externe : uniquement le module crypto de Node.
 */

const crypto = require('crypto');

const DUREE_SESSION_MS = 2 * 60 * 60 * 1000;   // 2 heures
const MAX_ESSAIS = 5;
const FENETRE_MS = 15 * 60 * 1000;             // 15 minutes

// Compteur d'essais en mémoire. Il se vide quand le conteneur redémarre :
// c'est un ralentisseur, pas un coffre-fort — la vraie protection reste la
// longueur du mot de passe et le temps de calcul de PBKDF2.
const essais = new Map();

function empreinte(motDePasse, sel) {
    return crypto.pbkdf2Sync(motDePasse, sel, 210000, 32, 'sha512').toString('hex');
}

function comparaisonSure(a, b) {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
}

function creerJeton(secret) {
    const charge = Buffer.from(JSON.stringify({
        exp: Date.now() + DUREE_SESSION_MS,
        r: crypto.randomBytes(8).toString('hex')
    })).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(charge).digest('base64url');
    return `${charge}.${signature}`;
}

function reponse(code, corps) {
    return {
        statusCode: code,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-Robots-Tag': 'noindex'
        },
        body: JSON.stringify(corps)
    };
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return reponse(405, { erreur: 'Méthode non autorisée.' });
    }

    const { ADMIN_PASSWORD_HASH, SESSION_SECRET } = process.env;
    if (!ADMIN_PASSWORD_HASH || !SESSION_SECRET) {
        // Diagnostic : on indique quels noms la fonction voit réellement.
        // Uniquement des noms de variables, jamais leur contenu.
        const attendues = ['ADMIN_PASSWORD_HASH', 'SESSION_SECRET', 'GITHUB_TOKEN', 'GITHUB_REPO'];
        const vues = attendues.filter(nom => process.env[nom]);
        const manquantes = attendues.filter(nom => !process.env[nom]);

        return reponse(500, {
            erreur: "L'espace admin n'est pas encore configuré dans Netlify."
                + ` Variables manquantes : ${manquantes.join(', ')}.`
                + ` Variables détectées : ${vues.length ? vues.join(', ') : 'aucune'}.`
                + ` (${Object.keys(process.env).length} variables au total dans cet environnement.)`
        });
    }

    const ip = event.headers['x-nf-client-connection-ip']
        || event.headers['client-ip']
        || 'inconnue';

    const maintenant = Date.now();
    const compteur = essais.get(ip);
    if (compteur && maintenant - compteur.depuis < FENETRE_MS && compteur.nombre >= MAX_ESSAIS) {
        const minutes = Math.ceil((FENETRE_MS - (maintenant - compteur.depuis)) / 60000);
        return reponse(429, {
            erreur: `Trop de tentatives. Réessayez dans ${minutes} minute${minutes > 1 ? 's' : ''}.`
        });
    }

    let motDePasse = '';
    try {
        motDePasse = String(JSON.parse(event.body || '{}').motDePasse || '');
    } catch (e) {
        return reponse(400, { erreur: 'Requête illisible.' });
    }

    if (!motDePasse) {
        return reponse(400, { erreur: 'Veuillez saisir le mot de passe.' });
    }

    const [sel, attendu] = ADMIN_PASSWORD_HASH.split(':');
    if (!sel || !attendu) {
        return reponse(500, {
            erreur: 'ADMIN_PASSWORD_HASH est mal formée : elle doit ressembler à « sel:empreinte ».'
        });
    }

    const correct = comparaisonSure(empreinte(motDePasse, sel), attendu);

    if (!correct) {
        const suivi = (compteur && maintenant - compteur.depuis < FENETRE_MS)
            ? { nombre: compteur.nombre + 1, depuis: compteur.depuis }
            : { nombre: 1, depuis: maintenant };
        essais.set(ip, suivi);

        const restants = Math.max(0, MAX_ESSAIS - suivi.nombre);
        return reponse(401, {
            erreur: restants > 0
                ? `Mot de passe incorrect. ${restants} tentative${restants > 1 ? 's' : ''} restante${restants > 1 ? 's' : ''}.`
                : 'Mot de passe incorrect. Accès bloqué pendant 15 minutes.'
        });
    }

    essais.delete(ip);

    return reponse(200, {
        jeton: creerJeton(SESSION_SECRET),
        expire: maintenant + DUREE_SESSION_MS
    });
};
