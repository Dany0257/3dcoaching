/**
 * 3D COACHING — Espace admin
 * --------------------------
 * Permet de modifier le contenu du site sans écrire une ligne de code.
 *
 * Comment ça marche, en résumé :
 *   1. la page lit content.json, le fichier qui contient tout le texte du site
 *   2. la personne modifie ce qu'elle veut, ici, dans le navigateur
 *   3. « Publier » envoie le résultat à GitHub via une fonction Netlify
 *   4. Netlify reconstruit le site : en ligne une minute plus tard
 *
 * Rien n'est enregistré tant que le bouton « Publier » n'a pas été utilisé.
 */

(function () {
    'use strict';

    const API_CONNEXION = '/.netlify/functions/login';
    const API_PUBLICATION = '/.netlify/functions/publish';

    const LARGEUR_MAX_PHOTO = 1600;      // pixels
    const POIDS_CIBLE_PHOTO = 320 * 1024; // octets

    // ---------------------------------------------------------------- état

    let contenu = null;                  // le contenu du site, en mémoire
    let contenuInitial = '';             // pour détecter les modifications
    let jeton = '';                      // jeton de session
    let modifie = false;

    const photosEnAttente = new Map();   // chemin → { base64, apercu, poids }
    const photosSupprimees = [];         // chemins déjà en ligne à retirer

    const $ = (id) => document.getElementById(id);

    // ------------------------------------------------------------ utilitaires

    function texteSur(valeur) {
        return String(valeur == null ? '' : valeur);
    }

    function identifiant(texte) {
        return texteSur(texte).toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 50) || 'element';
    }

    function poidsLisible(octets) {
        return octets > 1024 * 1024
            ? (octets / 1024 / 1024).toFixed(1) + ' Mo'
            : Math.round(octets / 1024) + ' Ko';
    }

    function iconeHtml(nom) {
        if (typeof ICONS === 'undefined') return '';
        const cle = ICONS[nom] ? nom : 'star-fill';
        return `<svg viewBox="0 0 16 16" aria-hidden="true">${ICONS[cle] || ''}</svg>`;
    }

    function notifier(message, erreur) {
        const boite = $('notification');
        boite.textContent = message;
        boite.className = 'notification' + (erreur ? ' erreur' : '');
        boite.hidden = false;
        clearTimeout(boite._minuteur);
        boite._minuteur = setTimeout(() => { boite.hidden = true; }, 4000);
    }

    function marquerModifie() {
        modifie = JSON.stringify(contenu) !== contenuInitial
            || photosEnAttente.size > 0
            || photosSupprimees.length > 0;

        const enAttente = photosEnAttente.size;
        const retirees = photosSupprimees.length;

        let texte = 'Tout est publié';
        if (modifie) {
            const details = [];
            if (enAttente) details.push(`${enAttente} photo${enAttente > 1 ? 's' : ''} à envoyer`);
            if (retirees) details.push(`${retirees} photo${retirees > 1 ? 's' : ''} à retirer`);
            texte = details.length
                ? 'Modifications non publiées · ' + details.join(' · ')
                : 'Modifications non publiées';
        }

        $('barre-etat').textContent = texte;
        $('barre-etat').classList.toggle('modifie', modifie);
        $('etat-modifs').textContent = modifie ? 'Modifications en attente' : 'Aucune modification';
        $('etat-modifs').classList.toggle('modifie', modifie);
    }

    window.addEventListener('beforeunload', (e) => {
        if (!modifie) return;
        e.preventDefault();
        e.returnValue = '';
    });

    // -------------------------------------------------------------- session

    function chargerSession() {
        try {
            const brut = sessionStorage.getItem('admin_session');
            if (!brut) return false;
            const s = JSON.parse(brut);
            if (!s.jeton || !s.expire || s.expire < Date.now()) {
                sessionStorage.removeItem('admin_session');
                return false;
            }
            jeton = s.jeton;
            return true;
        } catch (e) {
            return false;
        }
    }

    function deconnecter(message) {
        sessionStorage.removeItem('admin_session');
        jeton = '';
        $('app').hidden = true;
        $('connexion').hidden = false;
        if (message) {
            const boite = $('erreur-connexion');
            boite.textContent = message;
            boite.hidden = false;
        }
    }

    async function appelApi(donnees) {
        const reponse = await fetch(API_PUBLICATION, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + jeton
            },
            body: JSON.stringify(donnees)
        });

        let resultat = {};
        try { resultat = await reponse.json(); } catch (e) { /* réponse vide */ }

        if (reponse.status === 401) {
            throw new Error('Votre session a expiré. Reconnectez-vous.');
        }
        if (!reponse.ok) {
            throw new Error(resultat.erreur || 'Le serveur n\'a pas répondu correctement.');
        }
        return resultat;
    }

    // ------------------------------------------------------------ connexion

    $('form-connexion').addEventListener('submit', async (e) => {
        e.preventDefault();

        const bouton = $('btn-connexion');
        const erreur = $('erreur-connexion');
        const motDePasse = $('mot-de-passe').value;

        erreur.hidden = true;
        bouton.disabled = true;
        bouton.textContent = 'Connexion…';

        try {
            const reponse = await fetch(API_CONNEXION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ motDePasse })
            });
            const resultat = await reponse.json();

            if (!reponse.ok) throw new Error(resultat.erreur || 'Connexion impossible.');

            jeton = resultat.jeton;
            sessionStorage.setItem('admin_session', JSON.stringify({
                jeton: resultat.jeton,
                expire: resultat.expire
            }));

            $('mot-de-passe').value = '';
            await demarrer();

        } catch (err) {
            erreur.textContent = err.message;
            erreur.hidden = false;
        } finally {
            bouton.disabled = false;
            bouton.textContent = 'Se connecter';
        }
    });

    $('btn-deconnexion').addEventListener('click', () => {
        if (modifie && !confirm('Des modifications ne sont pas publiées. Voulez-vous vraiment quitter ?')) return;
        modifie = false;
        deconnecter();
    });

    // ------------------------------------------------------------ démarrage

    async function demarrer() {
        try {
            const reponse = await fetch('../content.json?v=' + Date.now(), { cache: 'no-store' });
            if (!reponse.ok) throw new Error('Fichier content.json introuvable.');
            contenu = await reponse.json();
        } catch (e) {
            notifier('Impossible de charger le contenu du site : ' + e.message, true);
            return;
        }

        // Sécurise la structure si un bloc manque
        contenu.services = contenu.services || { liste: [] };
        contenu.services.liste = contenu.services.liste || [];
        contenu.formations = contenu.formations || { liste: [] };
        contenu.formations.liste = contenu.formations.liste || [];
        contenu.realisations = contenu.realisations || { titre: 'Nos Réalisations', sousTitre: '', photos: [] };
        contenu.realisations.photos = contenu.realisations.photos || [];
        contenu.pied = contenu.pied || {};

        contenuInitial = JSON.stringify(contenu);
        photosEnAttente.clear();
        photosSupprimees.length = 0;

        $('connexion').hidden = true;
        $('app').hidden = false;

        afficherServices();
        afficherFormations();
        afficherPhotos();
        afficherTextes();
        marquerModifie();
    }

    // -------------------------------------------------------------- onglets

    $('onglets').addEventListener('click', (e) => {
        const onglet = e.target.closest('.onglet');
        if (!onglet) return;

        document.querySelectorAll('.onglet').forEach(o => o.classList.toggle('actif', o === onglet));
        document.querySelectorAll('.panneau').forEach(p => {
            p.classList.toggle('actif', p.id === 'panneau-' + onglet.dataset.onglet);
        });
    });

    // ------------------------------------------------- services & formations

    function carteHtml(element, type, index, total) {
        const resume = type === 'services'
            ? `${texteSur(element.description).slice(0, 90)}${(element.points || []).length ? ' · ' + element.points.length + ' points' : ''}`
            : texteSur(element.accroche || element.description).slice(0, 90);

        return `<div class="carte" data-index="${index}">
            <div class="carte__icone">${iconeHtml(element.icone)}</div>
            <div class="carte__texte">
                <div class="carte__titre">${echapper(element.titre)}</div>
                <div class="carte__resume">${echapper(resume)}</div>
            </div>
            <div class="carte__actions">
                <button type="button" class="bouton bouton--mini" data-action="monter" ${index === 0 ? 'disabled' : ''} aria-label="Monter">&uarr;</button>
                <button type="button" class="bouton bouton--mini" data-action="descendre" ${index === total - 1 ? 'disabled' : ''} aria-label="Descendre">&darr;</button>
                <button type="button" class="bouton bouton--mini" data-action="modifier">Modifier</button>
                <button type="button" class="bouton bouton--danger bouton--mini" data-action="supprimer">Supprimer</button>
            </div>
        </div>`;
    }

    function afficherListe(type) {
        const liste = contenu[type].liste;
        const boite = $('liste-' + type);

        boite.innerHTML = liste.length
            ? liste.map((el, i) => carteHtml(el, type, i, liste.length)).join('')
            : `<p class="vide">Aucun élément pour l'instant. Utilisez le bouton « Ajouter » ci-dessus.</p>`;

        boite.querySelectorAll('.carte').forEach(carte => {
            const index = Number(carte.dataset.index);
            carte.querySelectorAll('button[data-action]').forEach(bouton => {
                bouton.addEventListener('click', () => {
                    const action = bouton.dataset.action;

                    if (action === 'monter' && index > 0) {
                        [liste[index - 1], liste[index]] = [liste[index], liste[index - 1]];
                    } else if (action === 'descendre' && index < liste.length - 1) {
                        [liste[index + 1], liste[index]] = [liste[index], liste[index + 1]];
                    } else if (action === 'supprimer') {
                        if (!confirm(`Supprimer « ${liste[index].titre} » ?\n\nCet élément disparaîtra du site à la prochaine publication.`)) return;
                        liste.splice(index, 1);
                        notifier('Élément supprimé. Pensez à publier.');
                    } else if (action === 'modifier') {
                        ouvrirEditeur(type, index);
                        return;
                    }

                    afficherListe(type);
                    marquerModifie();
                });
            });
        });
    }

    const afficherServices = () => afficherListe('services');
    const afficherFormations = () => afficherListe('formations');

    document.querySelectorAll('[data-ajouter]').forEach(bouton => {
        bouton.addEventListener('click', () => ouvrirEditeur(bouton.dataset.ajouter, -1));
    });

    // ------------------------------------------------------- fenêtre édition

    let editionEnCours = null;

    function ouvrirEditeur(type, index) {
        const nouveau = index < 0;
        const source = nouveau
            ? (type === 'services'
                ? { icone: 'person-check', titre: '', description: '', points: [''] }
                : { icone: 'award', titre: '', accroche: '', description: '' })
            : JSON.parse(JSON.stringify(contenu[type].liste[index]));

        editionEnCours = { type, index, element: source };

        $('modale-titre').textContent = nouveau
            ? (type === 'services' ? 'Nouveau service' : 'Nouvelle formation')
            : 'Modifier « ' + source.titre + ' »';

        const corps = $('modale-corps');
        corps.innerHTML = `
            <label class="champ">
                <span class="champ__label">Titre *</span>
                <input type="text" class="champ__saisie" id="e-titre" maxlength="90">
                <span class="champ__aide">C'est le nom affiché en grand sur la carte.</span>
            </label>

            ${type === 'formations' ? `
            <label class="champ">
                <span class="champ__label">Phrase d'accroche</span>
                <input type="text" class="champ__saisie" id="e-accroche" maxlength="120">
                <span class="champ__aide">Une phrase courte et motivante. Exemple : « Devenez un leader inspirant. »</span>
            </label>` : ''}

            <label class="champ">
                <span class="champ__label">Description *</span>
                <textarea id="e-description" maxlength="400"></textarea>
                <span class="champ__aide">Deux ou trois lignes pour expliquer ce que vous proposez.</span>
            </label>

            ${type === 'services' ? `
            <div class="champ">
                <span class="champ__label">Ce que ça apporte</span>
                <div class="points" id="e-points"></div>
                <button type="button" class="bouton bouton--mini" id="e-ajouter-point" style="margin-top:8px">+ Ajouter une ligne</button>
                <span class="champ__aide">Chaque ligne apparaît avec une coche verte sur le site.</span>
            </div>` : ''}

            <div class="champ">
                <span class="champ__label">Icône</span>
                <div class="icones" id="e-icones"></div>
            </div>`;

        $('e-titre').value = texteSur(source.titre);
        $('e-description').value = texteSur(source.description);
        if (type === 'formations') $('e-accroche').value = texteSur(source.accroche);

        if (type === 'services') {
            const zone = $('e-points');

            const ajouterLigne = (valeur) => {
                const ligne = document.createElement('div');
                ligne.className = 'point';

                const saisie = document.createElement('input');
                saisie.type = 'text';
                saisie.value = texteSur(valeur);
                saisie.maxLength = 160;
                saisie.placeholder = 'Exemple : Gérer le stress et les émotions';

                const retirer = document.createElement('button');
                retirer.type = 'button';
                retirer.innerHTML = '&times;';
                retirer.setAttribute('aria-label', 'Retirer cette ligne');
                retirer.addEventListener('click', () => ligne.remove());

                ligne.append(saisie, retirer);
                zone.appendChild(ligne);
            };

            (source.points && source.points.length ? source.points : ['']).forEach(ajouterLigne);
            $('e-ajouter-point').addEventListener('click', () => ajouterLigne(''));
        }

        // Choix de l'icône
        const grille = $('e-icones');
        const disponibles = typeof ICONS !== 'undefined' ? Object.keys(ICONS) : [];
        const reseauxSociaux = ['facebook', 'linkedin', 'instagram', 'youtube', 'twitter-x', 'tiktok'];

        grille.innerHTML = disponibles
            .filter(nom => !reseauxSociaux.includes(nom))
            .map(nom => `<button type="button" class="icone-choix${nom === source.icone ? ' actif' : ''}" data-icone="${nom}" title="${(typeof ICON_LABELS !== 'undefined' && ICON_LABELS[nom]) || nom}">${iconeHtml(nom)}</button>`)
            .join('');

        grille.addEventListener('click', (e) => {
            const choix = e.target.closest('.icone-choix');
            if (!choix) return;
            grille.querySelectorAll('.icone-choix').forEach(b => b.classList.toggle('actif', b === choix));
            editionEnCours.element.icone = choix.dataset.icone;
        });

        $('modale').hidden = false;
        setTimeout(() => $('e-titre').focus(), 50);
    }

    function fermerEditeur() {
        $('modale').hidden = true;
        editionEnCours = null;
    }

    $('modale-fermer').addEventListener('click', fermerEditeur);
    $('modale-annuler').addEventListener('click', fermerEditeur);

    $('modale-valider').addEventListener('click', () => {
        if (!editionEnCours) return;
        const { type, index, element } = editionEnCours;

        const titre = $('e-titre').value.trim();
        const description = $('e-description').value.trim();

        if (!titre) { notifier('Le titre est obligatoire.', true); $('e-titre').focus(); return; }
        if (!description) { notifier('La description est obligatoire.', true); $('e-description').focus(); return; }

        element.titre = titre;
        element.description = description;
        if (type === 'formations') element.accroche = $('e-accroche').value.trim();

        if (type === 'services') {
            element.points = Array.from($('e-points').querySelectorAll('input'))
                .map(i => i.value.trim())
                .filter(Boolean);
        }

        if (!element.id) element.id = identifiant(titre);

        if (index < 0) contenu[type].liste.push(element);
        else contenu[type].liste[index] = element;

        fermerEditeur();
        afficherListe(type);
        marquerModifie();
        notifier(index < 0 ? 'Ajouté. Pensez à publier.' : 'Modifié. Pensez à publier.');
    });

    // ---------------------------------------------------------------- photos

    function afficherPhotos() {
        const photos = contenu.realisations.photos;
        const grille = $('liste-photos');

        $('photos-vide').hidden = photos.length > 0;
        grille.innerHTML = '';

        photos.forEach((photo, index) => {
            const enAttente = photosEnAttente.get(photo.fichier);
            const source = enAttente ? enAttente.apercu : '../' + photo.fichier;

            const carte = document.createElement('div');
            carte.className = 'photo';
            carte.innerHTML = `
                <div class="photo__image">
                    <img src="${source}" alt="">
                    ${enAttente ? '<span class="photo__badge">à publier</span>' : ''}
                </div>
                <div class="photo__corps">
                    <input type="text" class="photo__legende" maxlength="120" placeholder="Légende (facultative)">
                    <div class="photo__actions">
                        <span class="photo__poids">${enAttente ? poidsLisible(enAttente.poids) : ''}</span>
                        <span style="display:flex;gap:6px">
                            <button type="button" class="bouton bouton--mini" data-action="monter" ${index === 0 ? 'disabled' : ''} aria-label="Déplacer avant">&uarr;</button>
                            <button type="button" class="bouton bouton--mini" data-action="descendre" ${index === photos.length - 1 ? 'disabled' : ''} aria-label="Déplacer après">&darr;</button>
                            <button type="button" class="bouton bouton--danger bouton--mini" data-action="supprimer">Retirer</button>
                        </span>
                    </div>
                </div>`;

            // Signale clairement une photo dont le fichier n'est plus en ligne,
            // plutôt que de laisser une vignette grise inexplicable.
            const vignette = carte.querySelector('img');
            vignette.addEventListener('error', () => {
                carte.querySelector('.photo__image').insertAdjacentHTML(
                    'beforeend',
                    '<span class="photo__badge photo__badge--manquant">fichier introuvable</span>'
                );
                carte.querySelector('.photo__poids').textContent = '';
            });

            const legende = carte.querySelector('.photo__legende');
            legende.value = texteSur(photo.legende);
            legende.addEventListener('input', () => {
                photo.legende = legende.value;
                marquerModifie();
            });

            carte.querySelectorAll('button[data-action]').forEach(bouton => {
                bouton.addEventListener('click', () => {
                    const action = bouton.dataset.action;

                    if (action === 'monter' && index > 0) {
                        [photos[index - 1], photos[index]] = [photos[index], photos[index - 1]];
                    } else if (action === 'descendre' && index < photos.length - 1) {
                        [photos[index + 1], photos[index]] = [photos[index], photos[index + 1]];
                    } else if (action === 'supprimer') {
                        if (!confirm('Retirer cette photo du site ?')) return;
                        if (photosEnAttente.has(photo.fichier)) photosEnAttente.delete(photo.fichier);
                        else photosSupprimees.push(photo.fichier);
                        photos.splice(index, 1);
                    }

                    afficherPhotos();
                    marquerModifie();
                });
            });

            grille.appendChild(carte);
        });
    }

    let _webp = null;
    /** Le navigateur sait-il enregistrer en WebP ? (testé une seule fois) */
    function supporteWebp() {
        if (_webp === null) {
            const test = document.createElement('canvas');
            test.width = test.height = 1;
            _webp = test.toDataURL('image/webp').startsWith('data:image/webp');
        }
        return _webp;
    }

    /**
     * Réduit et compresse une photo directement dans le navigateur.
     * Une photo de téléphone de 5 Mo devient un fichier de 200 à 300 Ko,
     * sans différence visible à l'écran.
     */
    function compresserPhoto(fichier) {
        return new Promise((resoudre, rejeter) => {
            const url = URL.createObjectURL(fichier);
            const image = new Image();

            image.onload = () => {
                URL.revokeObjectURL(url);

                const ratio = Math.min(1, LARGEUR_MAX_PHOTO / Math.max(image.width, image.height));
                const largeur = Math.max(1, Math.round(image.width * ratio));
                const hauteur = Math.max(1, Math.round(image.height * ratio));

                const toile = document.createElement('canvas');
                toile.width = largeur;
                toile.height = hauteur;

                const ctx = toile.getContext('2d');
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, largeur, hauteur);
                ctx.drawImage(image, 0, 0, largeur, hauteur);

                // WebP si le navigateur sait l'écrire, JPEG sinon
                const format = supporteWebp() ? 'image/webp' : 'image/jpeg';

                let qualite = 0.82;
                let donnees = toile.toDataURL(format, qualite);
                while (donnees.length * 0.75 > POIDS_CIBLE_PHOTO && qualite > 0.45) {
                    qualite -= 0.1;
                    donnees = toile.toDataURL(format, qualite);
                }

                const base64 = donnees.split(',')[1];
                resoudre({
                    base64,
                    apercu: donnees,
                    poids: Math.round(base64.length * 0.75),
                    largeur,
                    hauteur,
                    extension: format === 'image/webp' ? 'webp' : 'jpg'
                });
            };

            image.onerror = () => {
                URL.revokeObjectURL(url);
                rejeter(new Error('Fichier image illisible.'));
            };

            image.src = url;
        });
    }

    async function ajouterPhotos(fichiers) {
        const images = Array.from(fichiers).filter(f => f.type.startsWith('image/'));
        if (!images.length) {
            notifier('Aucune image reconnue dans votre sélection.', true);
            return;
        }

        notifier(`Préparation de ${images.length} photo${images.length > 1 ? 's' : ''}…`);

        for (const fichier of images) {
            try {
                const resultat = await compresserPhoto(fichier);
                const base = identifiant(fichier.name.replace(/\.[^.]+$/, '')).slice(0, 40);
                const chemin = `images/${base}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.${resultat.extension}`;

                photosEnAttente.set(chemin, {
                    base64: resultat.base64,
                    apercu: resultat.apercu,
                    poids: resultat.poids
                });

                contenu.realisations.photos.push({
                    fichier: chemin,
                    legende: '',
                    largeur: resultat.largeur,
                    hauteur: resultat.hauteur
                });

            } catch (e) {
                notifier(`« ${fichier.name} » n'a pas pu être ajoutée : ${e.message}`, true);
            }
        }

        contenu.realisations.afficher = true;
        afficherPhotos();
        marquerModifie();
        notifier('Photos prêtes. Cliquez sur « Publier » pour les mettre en ligne.');
    }

    const depot = $('depot');
    $('fichier-photos').addEventListener('change', (e) => {
        ajouterPhotos(e.target.files);
        e.target.value = '';
    });

    ['dragenter', 'dragover'].forEach(evt => {
        depot.addEventListener(evt, (e) => {
            e.preventDefault();
            depot.classList.add('survol');
        });
    });

    ['dragleave', 'drop'].forEach(evt => {
        depot.addEventListener(evt, (e) => {
            e.preventDefault();
            depot.classList.remove('survol');
        });
    });

    depot.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length) ajouterPhotos(e.dataTransfer.files);
    });

    // ---------------------------------------------------------------- textes

    function afficherTextes() {
        const c = contenu;
        const boite = $('form-textes');

        const champ = (chemin, label, aide, options) => {
            const o = options || {};
            const valeur = chemin.split('.').reduce((acc, cle) => (acc || {})[cle], c);
            const commun = `data-chemin="${chemin}" ${o.max ? `maxlength="${o.max}"` : ''}`;
            const saisie = o.zone
                ? `<textarea ${commun} rows="${o.lignes || 4}"></textarea>`
                : `<input type="${o.type || 'text'}" class="champ__saisie" ${commun}>`;
            return `<label class="champ">
                <span class="champ__label">${label}</span>
                ${saisie}
                ${aide ? `<span class="champ__aide">${aide}</span>` : ''}
            </label>`;
        };

        boite.innerHTML = `
            <div class="groupe">
                <div class="groupe__titre">Page d'accueil</div>
                ${champ('hero.slogan', 'Slogan', 'La phrase affichée en grand sous le nom de l\'entreprise.', { max: 120 })}
                ${champ('hero.description', 'Texte d\'accueil', '', { zone: true, max: 300, lignes: 3 })}
                <div class="grille-2">
                    ${champ('hero.boutonPrincipal', 'Texte du bouton principal', '', { max: 40 })}
                    ${champ('hero.boutonSecondaire', 'Texte du deuxième bouton', '', { max: 40 })}
                </div>
            </div>

            <div class="groupe">
                <div class="groupe__titre">À propos</div>
                ${champ('apropos.sousTitre', 'Sous-titre', '', { max: 160 })}
                ${champ('apropos.paragraphes.0', 'Premier paragraphe', '', { zone: true, max: 700, lignes: 5 })}
                ${champ('apropos.paragraphes.1', 'Deuxième paragraphe', '', { zone: true, max: 700, lignes: 5 })}
            </div>

            <div class="groupe">
                <div class="groupe__titre">Nos réalisations</div>
                ${champ('realisations.titre', 'Titre de la section', '', { max: 80 })}
                ${champ('realisations.sousTitre', 'Sous-titre', '', { max: 160 })}
            </div>

            <div class="groupe">
                <div class="groupe__titre">Coordonnées</div>
                <div class="grille-2">
                    ${champ('contact.email', 'Adresse e-mail', '', { type: 'email', max: 100 })}
                    ${champ('contact.telephone', 'Téléphone', 'Avec l\'indicatif : +257 …', { max: 30 })}
                    ${champ('contact.whatsapp', 'WhatsApp', 'Avec l\'indicatif : +257 …', { max: 30 })}
                </div>
                ${champ('contact.adresse', 'Adresse', '', { zone: true, max: 300, lignes: 3 })}
                ${champ('contact.intro', 'Texte au-dessus des coordonnées', '', { zone: true, max: 300, lignes: 3 })}
            </div>

            <div class="groupe">
                <div class="groupe__titre">Pied de page</div>
                ${champ('pied.description', 'Texte de présentation', '', { zone: true, max: 300, lignes: 3 })}
                ${champ('pied.copyright', 'Mention de bas de page', '', { max: 120 })}
            </div>`;

        boite.querySelectorAll('[data-chemin]').forEach(element => {
            const chemin = element.dataset.chemin.split('.');
            const lire = () => chemin.reduce((acc, cle) => (acc || {})[cle], c);

            element.value = texteSur(lire());

            element.addEventListener('input', () => {
                let cible = c;
                for (let i = 0; i < chemin.length - 1; i++) {
                    if (cible[chemin[i]] == null) cible[chemin[i]] = {};
                    cible = cible[chemin[i]];
                }
                cible[chemin[chemin.length - 1]] = element.value;
                marquerModifie();
            });
        });
    }

    // ---------------------------------------------------------------- aperçu

    function echapper(texte) {
        const noeud = document.createElement('span');
        noeud.textContent = texteSur(texte);
        return noeud.innerHTML;
    }

    function construireApercu() {
        const c = contenu;

        const services = c.services.liste.map(s => `
            <article class="service-card">
                <div class="service-card__icon"><svg class="ico" viewBox="0 0 16 16">${(ICONS[s.icone] || ICONS['star-fill'])}</svg></div>
                <h3 class="service-card__title">${echapper(s.titre)}</h3>
                <p class="service-card__description">${echapper(s.description)}</p>
                ${(s.points || []).length ? `<ul class="service-card__list">${s.points.map(p => `<li>${echapper(p)}</li>`).join('')}</ul>` : ''}
            </article>`).join('');

        const formations = c.formations.liste.map(f => `
            <article class="service-card">
                <div class="service-card__icon"><svg class="ico" viewBox="0 0 16 16">${(ICONS[f.icone] || ICONS['star-fill'])}</svg></div>
                <h3 class="service-card__title">${echapper(f.titre)}</h3>
                ${f.accroche ? `<p class="service-card__catchphrase">${echapper(f.accroche)}</p>` : ''}
                <p class="service-card__description">${echapper(f.description)}</p>
            </article>`).join('');

        const photos = c.realisations.photos.map(p => {
            const attente = photosEnAttente.get(p.fichier);
            const source = attente ? attente.apercu : '../' + p.fichier;
            return `<div class="gallery__item">
                <img src="${source}" alt="${echapper(p.legende)}">
                ${p.legende ? `<span class="gallery__caption">${echapper(p.legende)}</span>` : ''}
            </div>`;
        }).join('');

        return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <link rel="stylesheet" href="../styles.css">
            <style>
                body { padding: 0; background: #F4F6FA; }
                .section { padding: 3rem 0; }
                .gallery__item { cursor: default; }
                svg.ico { width: 1em; height: 1em; fill: currentColor; }
            </style></head><body>

            <section class="services section">
                <div class="container">
                    <div class="section__header">
                        <h2 class="section__title">${echapper(c.services.titre)}</h2>
                        <p class="section__subtitle">${echapper(c.services.sousTitre)}</p>
                    </div>
                    <div class="services__grid">${services}</div>
                </div>
            </section>

            <section class="formations section">
                <div class="container">
                    <div class="section__header">
                        <h2 class="section__title">${echapper(c.formations.titre)}</h2>
                        <p class="section__subtitle">${echapper(c.formations.sousTitre)}</p>
                    </div>
                    <div class="services__grid">${formations}</div>
                </div>
            </section>

            ${photos ? `<section class="realisations section">
                <div class="container">
                    <div class="section__header">
                        <h2 class="section__title">${echapper(c.realisations.titre)}</h2>
                        <p class="section__subtitle">${echapper(c.realisations.sousTitre)}</p>
                    </div>
                    <div class="gallery">${photos}</div>
                </div>
            </section>` : ''}

            </body></html>`;
    }

    $('btn-apercu').addEventListener('click', () => {
        $('apercu-cadre').srcdoc = construireApercu();
        $('apercu').hidden = false;
    });

    $('apercu-fermer').addEventListener('click', () => {
        $('apercu').hidden = true;
        $('apercu-cadre').srcdoc = '';
    });

    // ----------------------------------------------------------- publication

    function etatPublication(titre, texte, pourcent, statut) {
        $('publication-titre').textContent = titre;
        $('publication-texte').textContent = texte;
        $('progression-barre').style.width = pourcent + '%';
        $('publication-rond').className = 'rond' + (statut ? ' ' + statut : '');
    }

    $('btn-publier').addEventListener('click', async () => {
        if (!modifie) {
            notifier('Il n\'y a rien de nouveau à publier.');
            return;
        }

        $('publication').hidden = false;
        $('publication-ok').hidden = true;
        etatPublication('Publication en cours…', 'Préparation des modifications.', 5, '');

        try {
            // 1. Les photos, une par une
            const ajouts = [];
            const aEnvoyer = Array.from(photosEnAttente.entries());

            for (let i = 0; i < aEnvoyer.length; i++) {
                const [chemin, photo] = aEnvoyer[i];
                etatPublication(
                    'Publication en cours…',
                    `Envoi de la photo ${i + 1} sur ${aEnvoyer.length}…`,
                    5 + Math.round((i / Math.max(aEnvoyer.length, 1)) * 70), ''
                );

                const resultat = await appelApi({
                    action: 'televerser',
                    nom: chemin.replace(/^images\//, ''),
                    contenu: photo.base64
                });
                ajouts.push({ chemin: resultat.chemin, sha: resultat.sha });
            }

            // 2. Le contenu
            etatPublication('Publication en cours…', 'Enregistrement du contenu…', 82, '');
            const resultat = await appelApi({
                action: 'publier',
                contenu,
                ajouts,
                suppressions: photosSupprimees
            });

            // Le serveur a pu retirer des photos dont le fichier avait disparu :
            // on aligne la liste affichée sur ce qui est réellement enregistré.
            const orphelines = resultat.orphelines || [];
            if (orphelines.length) {
                const perdues = new Set(orphelines);
                contenu.realisations.photos = contenu.realisations.photos
                    .filter(p => !perdues.has(p.fichier));
            }

            // 3. Terminé
            const complement = orphelines.length
                ? ` ${orphelines.length} photo${orphelines.length > 1 ? 's' : ''} dont le fichier avait disparu ${orphelines.length > 1 ? 'ont' : 'a'} été retirée${orphelines.length > 1 ? 's' : ''} de la liste.`
                : '';

            etatPublication(
                'C\'est publié !',
                'Vos modifications seront visibles sur 3dcoaching.business dans environ une minute, le temps que le site se reconstruise.' + complement,
                100, 'fini'
            );
            $('publication-ok').hidden = false;

            photosEnAttente.clear();
            photosSupprimees.length = 0;
            contenuInitial = JSON.stringify(contenu);
            afficherPhotos();
            marquerModifie();

        } catch (erreur) {
            etatPublication('La publication a échoué', erreur.message, 100, 'echec');
            $('publication-ok').hidden = false;

            if (/session/i.test(erreur.message)) {
                setTimeout(() => {
                    $('publication').hidden = true;
                    deconnecter('Votre session a expiré. Reconnectez-vous : vos modifications sont conservées.');
                }, 2500);
            }
        }
    });

    $('publication-ok').addEventListener('click', () => {
        $('publication').hidden = true;
    });

    // ------------------------------------------------------------- clavier

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        if (!$('modale').hidden) fermerEditeur();
        else if (!$('apercu').hidden) $('apercu-fermer').click();
    });

    // ------------------------------------------------------------ au chargement

    if (chargerSession()) {
        demarrer();
    } else {
        $('connexion').hidden = false;
    }

})();
