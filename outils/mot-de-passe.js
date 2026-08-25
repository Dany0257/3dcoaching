/**
 * 3D COACHING — Fabrique l'empreinte du mot de passe admin
 * --------------------------------------------------------
 * Le mot de passe ne doit jamais être écrit dans le code ni dans le dépôt.
 * Ce petit outil le transforme en empreinte : à partir de l'empreinte, on ne
 * peut pas retrouver le mot de passe, mais le serveur peut vérifier qu'il est
 * le bon.
 *
 * À lancer sur votre ordinateur :
 *
 *     node outils/mot-de-passe.js "VotreMotDePasse"
 *
 * Puis coller les deux valeurs affichées dans Netlify :
 *     Project configuration → Environment variables
 */

const crypto = require('crypto');

const motDePasse = process.argv[2];

if (!motDePasse) {
    console.log('\nUtilisation :  node outils/mot-de-passe.js "VotreMotDePasse"\n');
    process.exit(1);
}

if (motDePasse.length < 10) {
    console.log('\n⚠  Mot de passe trop court : prenez-en un d\'au moins 12 caractères.');
    console.log('   Une phrase est plus sûre et plus facile à retenir qu\'un mot compliqué.');
    console.log('   Exemple : Kigobe-Coaching-2026!\n');
    process.exit(1);
}

const sel = crypto.randomBytes(16).toString('hex');
const empreinte = crypto.pbkdf2Sync(motDePasse, sel, 210000, 32, 'sha512').toString('hex');
const secretSession = crypto.randomBytes(32).toString('hex');

console.log('\n────────────────────────────────────────────────────────────────');
console.log(' À coller dans Netlify → Project configuration → Environment variables');
console.log('────────────────────────────────────────────────────────────────\n');
console.log('ADMIN_PASSWORD_HASH');
console.log(sel + ':' + empreinte + '\n');
console.log('SESSION_SECRET');
console.log(secretSession + '\n');
console.log('────────────────────────────────────────────────────────────────');
console.log(' Il reste deux variables à ajouter vous-même :');
console.log('   GITHUB_TOKEN   le jeton créé sur github.com (accès en écriture');
console.log('                  au seul dépôt 3dcoaching)');
console.log('   GITHUB_REPO    Dany0257/3dcoaching');
console.log('────────────────────────────────────────────────────────────────');
console.log('\n Le mot de passe en clair n\'est écrit nulle part : gardez-le');
console.log(' précieusement, il n\'est pas récupérable. Pour le changer,');
console.log(' relancez cet outil et remplacez ADMIN_PASSWORD_HASH.\n');
