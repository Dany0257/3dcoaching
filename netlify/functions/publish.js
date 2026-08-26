/**
 * 3D COACHING — Enregistrement des modifications
 * ----------------------------------------------
 * Écrit le contenu et les photos dans le dépôt GitHub, puis Netlify
 * reconstruit le site automatiquement.
 *
 * Deux actions :
 *   televerser  → dépose une photo dans le dépôt et renvoie son identifiant
 *   publier     → enregistre content.json + les photos en UN SEUL commit
 *
 * Un seul commit signifie une seule reconstruction du site, même si la
 * personne a ajouté dix photos d'un coup.
 *
 * Le jeton GitHub reste ici, côté serveur. Il n'est jamais envoyé au navigateur.
 */

const crypto = require('crypto');

const TAILLE_MAX_PHOTO = 4 * 1024 * 1024;   // 4 Mo par photo, après compression
const API = 'https://api.github.com';

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

/** Vérifie le jeton de session délivré par login.js. */
function sessionValide(entetes, secret) {
    const brut = entetes.authorization || entetes.Authorization || '';
    const jeton = brut.replace(/^Bearer\s+/i, '').trim();
    if (!jeton || !jeton.includes('.')) return false;

    const [charge, signature] = jeton.split('.');
    const attendue = crypto.createHmac('sha256', secret).update(charge).digest('base64url');

    const a = Buffer.from(signature);
    const b = Buffer.from(attendue);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

    try {
        const donnees = JSON.parse(Buffer.from(charge, 'base64url').toString('utf8'));
        return typeof donnees.exp === 'number' && donnees.exp > Date.now();
    } catch (e) {
        return false;
    }
}

/** Nom de fichier sûr : pas de dossier parent, pas de caractère exotique. */
function nomSur(nom) {
    const base = String(nom).split(/[\\/]/).pop() || '';
    const nettoye = base
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9._-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+/, '')
        .slice(0, 80);
    return /\.(webp|jpg|jpeg|png)$/i.test(nettoye) ? nettoye : '';
}

async function github(chemin, options, token) {
    const r = await fetch(API + chemin, {
        ...options,
        headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            'User-Agent': '3dcoaching-admin',
            'Content-Type': 'application/json',
            ...(options && options.headers)
        }
    });

    const texte = await r.text();
    let donnees = null;
    try { donnees = texte ? JSON.parse(texte) : null; } catch (e) { donnees = { message: texte }; }

    if (!r.ok) {
        const message = (donnees && donnees.message) || `Erreur GitHub ${r.status}`;
        const erreur = new Error(message);
        erreur.statut = r.status;
        throw erreur;
    }
    return donnees;
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return reponse(405, { erreur: 'Méthode non autorisée.' });
    }

    const {
        GITHUB_TOKEN,
        SESSION_SECRET,
        GITHUB_REPO = 'Dany0257/3dcoaching',
        GITHUB_BRANCH = 'main'
    } = process.env;

    if (!GITHUB_TOKEN || !SESSION_SECRET) {
        return reponse(500, {
            erreur: "L'espace admin n'est pas encore configuré. Les variables GITHUB_TOKEN et SESSION_SECRET doivent être ajoutées dans Netlify."
        });
    }

    if (!sessionValide(event.headers, SESSION_SECRET)) {
        return reponse(401, { erreur: 'Session expirée. Reconnectez-vous.' });
    }

    let corps;
    try {
        corps = JSON.parse(event.body || '{}');
    } catch (e) {
        return reponse(400, { erreur: 'Requête illisible.' });
    }

    try {
        // ---------------------------------------------- dépôt d'une photo
        if (corps.action === 'televerser') {
            const nom = nomSur(corps.nom);
            if (!nom) {
                return reponse(400, { erreur: 'Format de photo non accepté (webp, jpg ou png uniquement).' });
            }

            const contenu = String(corps.contenu || '');
            if (!contenu) return reponse(400, { erreur: 'Photo vide.' });
            if (Buffer.byteLength(contenu, 'base64') > TAILLE_MAX_PHOTO) {
                return reponse(413, { erreur: 'Photo trop lourde, même après compression.' });
            }

            const blob = await github(`/repos/${GITHUB_REPO}/git/blobs`, {
                method: 'POST',
                body: JSON.stringify({ content: contenu, encoding: 'base64' })
            }, GITHUB_TOKEN);

            return reponse(200, { chemin: `images/${nom}`, sha: blob.sha });
        }

        // ---------------------------------------------- publication finale
        if (corps.action === 'publier') {
            if (!corps.contenu || typeof corps.contenu !== 'object') {
                return reponse(400, { erreur: 'Contenu manquant.' });
            }

            const ajouts = Array.isArray(corps.ajouts) ? corps.ajouts : [];
            const suppressions = Array.isArray(corps.suppressions) ? corps.suppressions : [];

            // 1. Où en est le dépôt ?
            const ref = await github(
                `/repos/${GITHUB_REPO}/git/ref/heads/${GITHUB_BRANCH}`, { method: 'GET' }, GITHUB_TOKEN);
            const commitBase = await github(
                `/repos/${GITHUB_REPO}/git/commits/${ref.object.sha}`, { method: 'GET' }, GITHUB_TOKEN);

            // Liste des fichiers réellement présents dans le dépôt.
            // Indispensable : GitHub refuse le commit entier si on lui demande
            // de supprimer un chemin qui n'existe pas. Sans ce garde-fou, une
            // seule référence périmée bloque toute publication.
            const arbreBase = await github(
                `/repos/${GITHUB_REPO}/git/trees/${commitBase.tree.sha}?recursive=1`,
                { method: 'GET' }, GITHUB_TOKEN);
            const presents = new Set(
                (arbreBase.tree || []).filter(e => e.type === 'blob').map(e => e.path)
            );

            // 2. Ce que contiendra le nouveau commit
            const contenu = { ...corps.contenu, maj: new Date().toISOString() };
            const arbre = [{
                path: 'content.json',
                mode: '100644',
                type: 'blob',
                content: JSON.stringify(contenu, null, 2) + '\n'
            }];

            const ajoutees = new Set();
            for (const ajout of ajouts) {
                const nom = nomSur(ajout && ajout.chemin);
                if (!nom || !ajout.sha) continue;
                const cible = `images/${nom}`;
                arbre.push({ path: cible, mode: '100644', type: 'blob', sha: ajout.sha });
                ajoutees.add(cible);
            }

            let retireesReellement = 0;
            for (const chemin of suppressions) {
                const nom = nomSur(chemin);
                if (!nom) continue;
                const cible = `images/${nom}`;
                // Déjà absent du dépôt : rien à supprimer, et surtout ne pas
                // l'envoyer à GitHub qui rejetterait le commit entier.
                if (!presents.has(cible)) continue;
                arbre.push({ path: cible, mode: '100644', type: 'blob', sha: null });
                retireesReellement++;
            }

            // Photos référencées dont le fichier n'existe pas : elles s'affichent
            // en image cassée sur le site. On retire la référence au passage.
            const orphelines = [];
            if (contenu.realisations && Array.isArray(contenu.realisations.photos)) {
                contenu.realisations.photos = contenu.realisations.photos.filter(photo => {
                    const chemin = photo && photo.fichier;
                    if (!chemin) return false;
                    if (presents.has(chemin) || ajoutees.has(chemin)) return true;
                    orphelines.push(chemin);
                    return false;
                });
                arbre[0].content = JSON.stringify(contenu, null, 2) + '\n';
            }

            const nouvelArbre = await github(`/repos/${GITHUB_REPO}/git/trees`, {
                method: 'POST',
                body: JSON.stringify({ base_tree: commitBase.tree.sha, tree: arbre })
            }, GITHUB_TOKEN);

            // 3. Le commit, puis on avance la branche
            const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`;
            const resume = [
                ajouts.length ? pluriel(ajouts.length, 'photo') + (ajouts.length > 1 ? ' ajoutées' : ' ajoutée') : null,
                retireesReellement ? pluriel(retireesReellement, 'photo') + (retireesReellement > 1 ? ' retirées' : ' retirée') : null,
                orphelines.length ? pluriel(orphelines.length, 'référence') + (orphelines.length > 1 ? ' périmées nettoyées' : ' périmée nettoyée') : null
            ].filter(Boolean).join(', ');

            const commit = await github(`/repos/${GITHUB_REPO}/git/commits`, {
                method: 'POST',
                body: JSON.stringify({
                    message: 'Mise à jour depuis l\'espace admin' + (resume ? ` (${resume})` : ''),
                    tree: nouvelArbre.sha,
                    parents: [ref.object.sha]
                })
            }, GITHUB_TOKEN);

            await github(`/repos/${GITHUB_REPO}/git/refs/heads/${GITHUB_BRANCH}`, {
                method: 'PATCH',
                body: JSON.stringify({ sha: commit.sha })
            }, GITHUB_TOKEN);

            return reponse(200, {
                ok: true,
                commit: commit.sha.slice(0, 7),
                maj: contenu.maj,
                retirees: retireesReellement,
                orphelines
            });
        }

        return reponse(400, { erreur: 'Action inconnue.' });

    } catch (erreur) {
        const statut = erreur.statut === 401 || erreur.statut === 403
            ? 502
            : (erreur.statut === 409 ? 409 : 502);

        const message = erreur.statut === 401 || erreur.statut === 403
            ? "GitHub a refusé l'accès. Le jeton est peut-être expiré ou n'a pas le droit d'écrire dans le dépôt."
            : (erreur.statut === 409
                ? 'Le site a été modifié entre-temps. Rechargez la page et recommencez.'
                : `Enregistrement impossible : ${erreur.message}`);

        return reponse(statut, { erreur: message });
    }
};
