# NapVote — suivi citoyen des élections en Haïti

Site web, PWA installable et application Android / iOS (Capacitor) à partir d'un seul code (`www/`).

## Fonctions
- **Mon bulletin** : choisir sa commune (liste ou GPS) → présidence, Sénat du département, députés de la circonscription, maires, CASEC et ASEC de sa section communale, avec le rappel des résultats 2015-2016 chez soi.
- **Carte** par département/commune, **Candidats** (filtres, favoris ★, fiches), **Résultats passés** (présidentielle 2016, Sénat 2015-2017, députés 2015-2017 avec les reprises, faits marquants), **Calendrier**, **Électeurs**, **Actualités**.
- Hors ligne (service worker), thème clair/sombre, partage, impression du bulletin.

## Mettre à jour les candidats
```bash
npm run data      # API du CEP -> data/candidats_cep.json, régénère www/js/data.js, hist.js, election.js, bios.js, sw.js
```
L'API publique du CEP n'autorise pas les appels depuis un navigateur (pas de CORS) : la collecte se fait ici, par script. Planifiez-la (cron, GitHub Actions) puis redéployez `www/`.
`election.js` (calendrier, notes, stats) est construit à partir de `data/src/` ; les fiches présidentielles de `scripts/build_bios.py`.

## Tester sur le web
```bash
npm run serve     # http://localhost:8766
```
Hébergement : tout dossier statique HTTPS convient (Netlify, Cloudflare Pages, GitHub Pages) → `www/`.

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
