# NapVote — suivi citoyen des élections en Haïti

Site web, PWA installable et application Android / iOS (Capacitor) à partir d'un seul code (`www/`).

## Fonctions
- **Mon bulletin** : choisir sa commune (liste ou GPS) → présidence, Sénat du département, députés de la circonscription, maires, CASEC et ASEC de sa section communale, avec le rappel des résultats 2015-2016 chez soi.
- **Carte** par département/commune, **Candidats** (filtres, favoris ★, fiches), **Résultats passés** (présidentielle 2016, Sénat 2015-2017, députés 2015-2017 avec les reprises, faits marquants), **Calendrier**, **Électeurs**, **Actualités**.
- Hors ligne (service worker), thème clair/sombre, partage, impression du bulletin.

## Mise en ligne automatique (GitHub Pages) — une seule fois
1. Créez un dépôt **public** vide nommé `napvote` sur GitHub (un compte peut avoir un site « utilisateur » et un site par dépôt : le vôtre sera `https://VOTRE-COMPTE.github.io/napvote/`).
2. Dans ce dossier :
   ```bash
   git remote add origin https://github.com/VOTRE-COMPTE/napvote.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
4. Onglet **Actions → Mise à jour NapVote → Run workflow** (premier déploiement). Ensuite, plus rien à faire.
5. Applications natives : mettez l'adresse `https://VOTRE-COMPTE.github.io/napvote/data/live.json` dans `www/js/config.js` (`liveUrl`), puis `npm run sync`.

## Ce qui tourne toutes les 2 heures (`.github/workflows/update.yml`)
1. `scripts/fetch_cep.py` : candidats (6 postes, requêtes parallèles limitées, reprise sur erreur 429), statistiques d'inscription, veille des pages du CEP.
2. Contrôles : le script refuse la mise à jour (le travail échoue, GitHub vous écrit) si une collecte est incomplète ou si le nombre de candidats chute de plus de 10 %.
3. Construction : `data.js` (fond de carte, statique), `hist.js` (résultats 2015-2017, statique), `data/live.json` (candidats, liens 2015-2017, inscription, nouveautés), `sw.js`.
4. Commit des données **seulement si elles ont changé**, puis publication Pages seulement dans ce cas.
5. Si une nouvelle page apparaît sur cephaiti.ht (note, calendrier), une *issue* GitHub est ouverte : le calendrier et les actualités restent à mettre à jour à la main (`scripts/build_election.py`).
Chaque visite recharge `data/live.json` (réseau d'abord, copie hors ligne en secours). Les applications natives le font aussi depuis `liveUrl` : pas de republication sur les stores pour une mise à jour de données.

## Commandes locales
```bash
pip install shapely            # une fois
npm run data                   # collecte + construction
npm run data:offline           # reconstruction sans collecte
npm run serve                  # http://localhost:8766 (sans cache)
```
`election.js` n'existe plus : calendrier et actualités sont dans `scripts/build_election.py` ; les fiches présidentielles dans `scripts/build_bios.py`.

## Tester sur le web
```bash
npm run serve     # http://localhost:8766
```

## Applications natives
```bash
npm install
npm run assets    # icônes + écrans de démarrage depuis assets/
npm run android   # sync + ouvre Android Studio (JDK 17+ requis)
npm run ios       # sync + ouvre Xcode (Xcode complet requis, compte Apple Developer pour publier)
```
Identifiant d'app : `ht.napvote.app` (capacitor.config.json). Permission de localisation déjà déclarée (Info.plist, AndroidManifest).

## Sources et limites
Candidats : CEP (tableau.cephaiti.ht). Résultats 2015-2017 : CEP (préliminaires/définitifs partiels, via HaïtiLibre) et tableaux de voix de Wikipédia pour les reprises (`scripts/reprises.py`, `scripts/parse_wiki_1517.py`, sources brutes dans `data/reprises/`). Maires et CASEC non inclus. Rapprochement 2026↔2015 par nom dans la même zone (homonymes possibles). Fond de carte : geoBoundaries (CC BY 4.0).
